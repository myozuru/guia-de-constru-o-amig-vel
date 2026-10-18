import type { TestRequest } from '@/stores/useTestRequestStore';
import { useCharacterStore } from '@/stores/useCharacterStore';
import { useLogStore } from '@/stores/useLogStore';
import { useMapStore } from '@/stores/useMapStore';
import { useFogStore } from '@/stores/fogStore';
import { WallsEngine } from '@/components/mapa/WallsEngine';
import { buildSegments as buildFogSegments } from '@/lib/fog/visibility';
import { prepareCollisionCache, resolveCollisionMove, tokenFootprintSegments, type MapCollisionSegment } from '@/lib/mapCollision';
import { rollDiceGroups } from '@/lib/dice';
import { parseFormulaDanoInvocacao } from './rolagens';
import { causarDanoInvocacao } from './mapa';
import { resolverTokenDaFicha } from '@/lib/mapa/tokenDaFicha';

/** Resolve o dano de uma ação de Shikigami depois que o alvo conclui o TR. */
export async function resolverDanoAposTRInvocacao(request: TestRequest): Promise<{
  passou: boolean;
  dano: number;
}> {
  const resolution = request.invocationResolution;
  const result = request.result;
  if (!resolution || !result || request.dc === undefined) {
    throw new Error('O pedido não contém resultado de TR com CD e efeito de invocação.');
  }
  const passou = result.forced
    ? result.forced.kind === 'success'
    : result.d20 !== 1 && result.total >= request.dc;
  let dano = 0;

  if (!passou || resolution.damageOnSuccess === 'metade') {
    const formula = parseFormulaDanoInvocacao(resolution.damageFormula);
    if (!formula) throw new Error(`Invalid damage formula: ${resolution.damageFormula}`);
    const rolled = await rollDiceGroups(formula.dados, { label: `${resolution.sourceName} - damage after save` });
    dano = Math.max(0, rolled.total + formula.fixo + (resolution.damageBonus ?? 0));
    if (passou) dano = Math.floor(dano / 2);

    if (dano > 0) {
      if (resolution.targetInvocation) {
        const aplicado = causarDanoInvocacao(
          resolution.targetInvocation.tokenId,
          dano,
          resolution.damageType,
          resolution.targetInvocation.invocationInstanceId,
          { tipoAlvo: resolution.targetInvocation.tipoAlvo ?? 'unico' },
        );
        if (!aplicado.ok) throw new Error(aplicado.motivo);
      } else {
        await useCharacterStore.getState().applyDamage(request.charId, dano, resolution.damageType, {
          attackerId: resolution.ownerCharacterId,
          source: 'omni',
        });
      }
    }

    // Torrente empurra após falha no TR de Fortitude, mesmo quando o dano é zero.
    if (!passou && resolution.actionId === 'torrente-agua') {
      await aplicarEmpurroTorrenteDeAgua(
        resolution.ownerCharacterId,
        resolution.invocationId,
        resolution.invocationInstanceId,
        resolution.targetInvocation
          ? { tipo: 'invocacao', tokenId: resolution.targetInvocation.tokenId }
          : { tipo: 'personagem', characterId: request.charId },
      );
    }
  }
  useLogStore.getState().addLog(
    'combat',
    `🛡️ ${request.charName} — ${request.testName}: d20 ${result.d20} + ${result.bonus} = ${result.total} vs CD ${request.dc} → ${passou ? 'sucesso' : 'falha'}. ${resolution.sourceName}: ${dano} ${resolution.damageType ?? 'DCO'} de dano aplicado.`,
  );
  return { passou, dano };
}

/** Aplica o empurrão da Torrente de Água após falha no TR de Fortitude. */
async function aplicarEmpurroTorrenteDeAgua(
  donoCharacterId: string,
  atacanteInvocationId: string,
  atacanteInvocationInstanceId: string,
  alvo: { tipo: 'invocacao'; tokenId: string } | { tipo: 'personagem'; characterId: string }
): Promise<void> {
  const mapa = useMapStore.getState();
  const fog = useFogStore.getState();

  // Get the attacker's token/token (shikigami) by ownerCharacterId + invocationId + invocationInstanceId
  const tokenAtacante = Object.values(mapa.entities).find(
    e => e.ownerCharId === donoCharacterId &&
         e.invocationId === atacanteInvocationId &&
         e.invocationInstanceId === atacanteInvocationInstanceId
  );
  if (!tokenAtacante) return;

  let tokenAlvo: ReturnType<typeof useMapStore.getState>['entities'][string] | undefined;
  if (alvo.tipo === 'invocacao') {
    tokenAlvo = mapa.entities[alvo.tokenId];
  } else {
    const personagemAlvo = useCharacterStore.getState().characters.find(character => character.id === alvo.characterId);
    if (personagemAlvo) {
      const entidadesDePersonagens = Object.fromEntries(
        Object.entries(mapa.entities).filter(([, entity]) => !entity.invocationId),
      );
      tokenAlvo = resolverTokenDaFicha(personagemAlvo, entidadesDePersonagens, mapa.layerVisible);
    }
  }

  if (!tokenAlvo) return;

  // Calculate direction from attacker to target (using token centers)
  const atacanteCenterX = tokenAtacante.x + tokenAtacante.w / 2;
  const atacanteCenterY = tokenAtacante.y + tokenAtacante.h / 2;
  const alvoCenterX = tokenAlvo.x + tokenAlvo.w / 2;
  const alvoCenterY = tokenAlvo.y + tokenAlvo.h / 2;

  const dx = alvoCenterX - atacanteCenterX;
  const dy = alvoCenterY - atacanteCenterY;
  const distancia = Math.hypot(dx, dy);

  // If centers coincide, leave the push unresolved instead of inventing east
  if (distancia < 0.1) {
    return;
  }

  // Normalize the direction vector
  const normalizedDx = dx / distancia;
  const normalizedDy = dy / distancia;

  // Calculate push position (4.5m away from attacker in the direction of the target)
  const pushDistanceMeters = 4.5;
  const pushCenterX = alvoCenterX + (normalizedDx * pushDistanceMeters * mapa.gridConfig.dpi / mapa.gridConfig.metersPerCell);
  const pushCenterY = alvoCenterY + (normalizedDy * pushDistanceMeters * mapa.gridConfig.dpi / mapa.gridConfig.metersPerCell);

  // Convert back to top-left position for the entity
  const pushEntityX = pushCenterX - tokenAlvo.w / 2;
  const pushEntityY = pushCenterY - tokenAlvo.h / 2;

  // Attempt to move the target to the push position
  await moverEntidadeParaPosicao(tokenAlvo.id, pushEntityX, pushEntityY, mapa, fog);
}

/** Tenta mover uma entidade para uma posição específica, verificando colisões. */
async function moverEntidadeParaPosicao(
  entityId: string,
  targetX: number,
  targetY: number,
  mapa: ReturnType<typeof useMapStore.getState>,
  fog: ReturnType<typeof useFogStore.getState>
): Promise<void> {
  const grid = mapa.gridConfig;
  if (!(grid.dpi > 0) || !(grid.metersPerCell > 0)) return;

  const token = mapa.entities[entityId];
  if (!token) return;

  // Calculate the actual movement delta
  const deltaX = targetX - token.x;
  const deltaY = targetY - token.y;

  // Check for wall collisions using the correct API types
  const paredesAtivas = WallsEngine.blockingSegments(mapa.walls, 'sight');
  const fogSegmentsRaw = buildFogSegments(fog.walls, fog.doors);
  // Convert fog segments to [a,b] tuples: buildFogSegments returns objects {a,b}
  const fogSegments: MapCollisionSegment[] = fogSegmentsRaw.map(seg => [seg.a, seg.b]);
  const todosSegmentos = [...paredesAtivas, ...fogSegments];

  const entidadesFixas = Object.values(mapa.entities).filter(entity =>
    entity.id !== entityId && entity.layer !== 'map' && !entity.hidden && !entity.carriedBy
  );

  // Add blockers via tokenFootprintSegments with correct signature
  // tokenFootprintSegments takes one MapCollisionToken plus dx,dy
  const bloqueadores = entidadesFixas.flatMap(entity =>
    tokenFootprintSegments(
      { origin: { x: entity.x, y: entity.y }, entity },
      0, 0
    )
  );

  const segmentos = [...todosSegmentos, ...bloqueadores];
  const cache = prepareCollisionCache(segmentos);

  // Create a moving token at the current position to check collision along the path
  const movingToken = {
    origin: { x: token.x, y: token.y },
    entity: token
  };

  // Check if the path from current position to target position is clear
  // resolveCollisionMove signature: (tokens, cache, from, desiredMove)
  // Pass {dx:0,dy:0} as from and {dx:deltaX,dy:deltaY} as desiredMove
  const passo = { dx: 0, dy: 0 }; // from (current position)
  const desejado = { dx: deltaX, dy: deltaY }; // desiredMove
  const deslocamento = resolveCollisionMove([movingToken], cache, passo, desejado);

  // Apply the collision-clipped displacement: a blocker can shorten the push without cancelling it.
  if (!Number.isFinite(deslocamento.dx) || !Number.isFinite(deslocamento.dy) ||
    Math.hypot(deslocamento.dx, deslocamento.dy) < 1e-6) return;

  mapa.updateEntity(entityId, {
    x: token.x + deslocamento.dx,
    y: token.y + deslocamento.dy
  });
}
