// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ficha, montarMesa, comoTela, pegarFicha } from './helpers/mesaReal';
import { useCharacterStore } from '@/stores/useCharacterStore';
import { useCombatStore } from '@/stores/useCombatStore';
import { useDice3DStore } from '@/stores/useDice3DStore';
import { useInventoryStore } from '@/stores/useInventoryStore';
import { useLogStore } from '@/stores/useLogStore';
import { useMapStore } from '@/stores/useMapStore';
import { useOmniEntidadesStore } from '@/stores/useOmniEntidadesStore';
import { useRoleStore } from '@/stores/useRoleStore';
import { useTestRequestStore } from '@/stores/useTestRequestStore';
import {
  causarDanoInvocacao,
  comandarAtaque,
  comandarSegurarSapo,
  comandarSuporte,
  escaparAgarradoPorInvocacao,
  escaparInvocacaoAgarrada,
  invocarControladores,
  resolverDerrotaPendenteInvocacao,
} from '@/lib/controlador/mapa';
import { criarPacoteDezSombras } from '@/lib/controlador/dezSombras';
import { criarFormasDerivadasDezSombras } from '@/lib/controlador/dezSombrasDerivadas';
import { categoriaEconomiaDaAcao } from '@/lib/controlador/economiaAcoes';
import { calcularBonusAtaqueInvocacao } from '@/lib/controlador/rolagens';
import type { InvocacaoControlador } from '@/lib/controlador/tipos';

const ID_DONO = 'dono';
const ID_ALIADO = 'aliado';
const ID_INIMIGO = 'inimigo';
const PE_INICIAL = 80;

function prepararMesa() {
  vi.restoreAllMocks();
  useInventoryStore.getState().resetAll();
  useLogStore.getState().clearLogs();
  useTestRequestStore.getState().clearAll();
  useOmniEntidadesStore.setState({ entidades: {} });
  useCombatStore.setState({
    inCombat: false,
    combatId: 'dez-sombras-combate-real-derivadas',
    round: 1,
    currentTurnIndex: 0,
    initiativeOrder: [],
  } as never);

  const modelos = [
    ...criarPacoteDezSombras(ID_DONO, false),
    ...criarFormasDerivadasDezSombras(ID_DONO),
  ].map(modelo => ({ ...modelo, domado: true, alcanceInvocacaoM: 18 }));

  montarMesa([
    ficha(ID_DONO, {
      specialization: 'Controlador',
      profileId: 'perfil-dono',
      level: 1,
      peCurrent: PE_INICIAL,
      peMax: PE_INICIAL,
      treinoControle: 1,
      tecnicaAmaldicoada: 'Dez Sombras',
      invocacoesConhecidas: modelos,
      hpCurrent: 20,
      hpMax: 20,
    }),
    ficha(ID_ALIADO, { profileId: 'perfil-aliado', hpCurrent: 5, hpMax: 30, ca: 1 }),
    ficha(ID_INIMIGO, {
      category: 'INIMIGO',
      profileId: 'perfil-inimigo',
      hpCurrent: 1000,
      hpMax: 1000,
      ca: 1,
    }),
  ], { dono: [2, 2], aliado: [2, 3], inimigo: [4, 2] });

  useMapStore.getState().clearWalls();
  comoTela({ profileId: 'perfil-dono', role: 'PLAYER' });
  useCombatStore.setState({
    inCombat: true,
    round: 1,
    currentTurnIndex: 0,
    initiativeOrder: [{ charId: ID_DONO, charName: 'Dono', roll: 10, bonus: 0, total: 10 }],
  } as never);
}

function modelo(id: string): InvocacaoControlador {
  const encontrado = pegarFicha(ID_DONO).invocacoesConhecidas?.find(
    item => item.id === id || item.subcategoria === `dez-sombras:${id}`,
  );
  if (!encontrado) throw new Error(`Missing Ten Shadows model: ${id}`);
  return encontrado;
}

function instanciaAtiva(modeloId: string) {
  const instancia = pegarFicha(ID_DONO).instanciasInvocacao?.find(
    item => item.modeloId === modeloId && item.estado === 'ativa',
  );
  if (!instancia) throw new Error(`Missing active invocation instance: ${modeloId}`);
  return instancia;
}

function saldoAcao(modeloId: string, acaoId: string): number {
  const model = modelo(modeloId);
  const action = model.acoes.find(item => item.id === acaoId);
  if (!action) throw new Error(`Missing invocation action: ${acaoId}`);
  const instancia = instanciaAtiva(modeloId);
  const categoria = categoriaEconomiaDaAcao(action, instancia.economiaAcoes);
  if (!categoria) throw new Error(`Action has no configured economy category: ${acaoId}`);
  const saldo = instancia.economiaAcoes?.[categoria];
  if (!saldo) throw new Error(`Invocation action pool is missing: ${categoria}`);
  return saldo.atual;
}

function rolarD20s(...valores: number[]) {
  const fila = [...valores];
  return vi.spyOn(useDice3DStore.getState(), 'requestRoll').mockImplementation(async tipos =>
    tipos.map(() => fila.shift() ?? 12),
  );
}

function rolarDadosMinimos() {
  return vi.spyOn(useDice3DStore.getState(), 'requestNotation').mockImplementation(async anotacao => {
    const grupos = [...anotacao.matchAll(/(\d+)d\d+/g)];
    return grupos.flatMap(grupo => Array(Number(grupo[1])).fill(1));
  });
}

async function invocarUma(id: string, x = 210, y = 140): Promise<string> {
  const resultado = invocarControladores(ID_DONO, [{ invocacaoId: modelo(id).id, x, y }]);
  if (!resultado.ok) throw new Error(resultado.motivo);
  const tokenId = resultado.tokenIds[0];
  if (!tokenId) throw new Error(`Invocation did not return a token: ${id}`);
  return tokenId;
}

describe('Dez Sombras: combate real das formas derivadas', () => {
  beforeEach(prepararMesa);
  afterEach(async () => {
    await new Promise(resolve => setTimeout(resolve, 10));
    vi.restoreAllMocks();
  });

  describe('Agito', () => {
    it('executa Golpes Eletrificados, aplica dano e consome uma ação sem custo adicional de PE', async () => {
      const agito = modelo('agito');
      const tokenId = await invocarUma('agito');
      const acao = agito.acoes.find(item => item.id === 'golpes-eletrificados')!;
      expect(acao.statusAutomacao).toBe('executavel');
      expect(calcularBonusAtaqueInvocacao(pegarFicha(ID_DONO), agito, acao)?.total).toBe(11);

      const saldoAntes = saldoAcao(agito.id, acao.id);
      const peAntes = pegarFicha(ID_DONO).peCurrent;
      const rolagens = rolarD20s(15);
      const dados = rolarDadosMinimos();

      await expect(comandarAtaque(ID_DONO, agito.id, acao.id, ID_INIMIGO, {
        instanciaId: useMapStore.getState().entities[tokenId].invocationInstanceId,
      })).resolves.toMatchObject({
        ok: true,
        acertou: true,
        totalAtaque: 26,
        dano: 11,
      });

      expect(pegarFicha(ID_INIMIGO).hpCurrent).toBe(989);
      expect(pegarFicha(ID_DONO).peCurrent).toBe(peAntes);
      expect(saldoAcao(agito.id, acao.id)).toBe(saldoAntes - 1);
      expect(rolagens).toHaveBeenCalled();
      expect(dados).toHaveBeenCalled();
    });

    it('não causa dano quando Golpes Eletrificados erra', async () => {
      const agito = modelo('agito');
      const tokenId = await invocarUma('agito');
      const acao = agito.acoes.find(item => item.id === 'golpes-eletrificados')!;
      useCharacterStore.getState().updateCharacter(ID_INIMIGO, { ca: 100 });
      const saldoAntes = saldoAcao(agito.id, acao.id);
      const rolagens = rolarD20s(10);
      const dados = vi.spyOn(useDice3DStore.getState(), 'requestNotation');

      const resultado = await comandarAtaque(ID_DONO, agito.id, acao.id, ID_INIMIGO, {
        instanciaId: useMapStore.getState().entities[tokenId].invocationInstanceId,
      });

      expect(resultado).toMatchObject({ ok: true, acertou: false });
      expect(pegarFicha(ID_INIMIGO).hpCurrent).toBe(1000);
      expect(saldoAcao(agito.id, acao.id)).toBe(saldoAntes - 1);
      expect(rolagens).toHaveBeenCalled();
      expect(dados).not.toHaveBeenCalled();
    });

    it('rejeita alvo além de 3 m sem rolar nem gastar ação', async () => {
      const agito = modelo('agito');
      const tokenId = await invocarUma('agito');
      const acao = agito.acoes.find(item => item.id === 'golpes-eletrificados')!;
      const tokenAlvo = Object.values(useMapStore.getState().entities).find(
        entity => entity.characterId === ID_INIMIGO && !entity.invocationId,
      );
      if (!tokenAlvo) throw new Error('Missing enemy map token.');
      useMapStore.getState().updateEntity(tokenAlvo.id, { x: 490 });

      const saldoAntes = saldoAcao(agito.id, acao.id);
      const rolagens = vi.spyOn(useDice3DStore.getState(), 'requestRoll');
      const resultado = await comandarAtaque(ID_DONO, agito.id, acao.id, ID_INIMIGO, {
        instanciaId: useMapStore.getState().entities[tokenId].invocationInstanceId,
      });

      expect(resultado).toMatchObject({ ok: false });
      expect(pegarFicha(ID_INIMIGO).hpCurrent).toBe(1000);
      expect(saldoAcao(agito.id, acao.id)).toBe(saldoAntes);
      expect(rolagens).not.toHaveBeenCalled();
    });

    it('mantém Cura Concentrada manual pelo custo não publicado, sem curar nem gastar', async () => {
      const agito = modelo('agito');
      await invocarUma('agito');
      const acao = agito.acoes.find(item => item.id === 'cura-concentrada')!;
      expect(acao.statusAutomacao).toBe('manual');
      expect(acao.descricaoRegra).toContain('custo');

      useCharacterStore.getState().updateCharacter(ID_ALIADO, { hpCurrent: 10 });
      const hpAntes = pegarFicha(ID_ALIADO).hpCurrent;
      const peAntes = pegarFicha(ID_DONO).peCurrent;
      const saldoAntes = saldoAcao(agito.id, acao.id);
      const rolagensD20 = vi.spyOn(useDice3DStore.getState(), 'requestRoll');
      const rolagensDano = vi.spyOn(useDice3DStore.getState(), 'requestNotation');

      await expect(comandarSuporte(ID_DONO, agito.id, acao.id, [ID_ALIADO]))
        .resolves.toMatchObject({ ok: false });

      expect(pegarFicha(ID_ALIADO).hpCurrent).toBe(hpAntes);
      expect(pegarFicha(ID_DONO).peCurrent).toBe(peAntes);
      expect(saldoAcao(agito.id, acao.id)).toBe(saldoAntes);
      expect(rolagensD20).not.toHaveBeenCalled();
      expect(rolagensDano).not.toHaveBeenCalled();
    });
  });

  describe('Abismo Desconhecido do Poço: Segurar', () => {
    it.each([
      [5, 1],
      [7, 2],
      [9, 3],
    ])('usa Luta +%i com %i sapo(s) confirmados pelo Mestre', async (bonusLuta, membrosSapoVivos) => {
      const abismo = modelo('abismo-desconhecido-do-poco');
      const tokenId = await invocarUma('abismo-desconhecido-do-poco');
      useRoleStore.getState().setRole('MASTER');

      const tokenAlvo = Object.values(useMapStore.getState().entities).find(
        entity => entity.characterId === ID_INIMIGO && !entity.invocationId,
      );
      if (!tokenAlvo) throw new Error('Missing enemy map token.');
      useMapStore.getState().updateEntity(tokenAlvo.id, { x: 630 }); // exactly 9 m by token centers

      const acao = abismo.acoes.find(item => item.id === 'segurar')!;
      expect(acao).toMatchObject({
        statusAutomacao: 'parcial',
        tipoExecucao: 'manual',
        categoriaAcao: 'acao_simples',
        alcanceM: 9,
      });
      const saldoAntes = saldoAcao(abismo.id, acao.id);
      const peAntes = pegarFicha(ID_DONO).peCurrent;
      rolarD20s(10, 10);

      const resultado = await comandarSegurarSapo(ID_DONO, abismo.id, ID_INIMIGO, {
        instanciaId: useMapStore.getState().entities[tokenId].invocationInstanceId,
        membrosSapoVivos,
      });

      expect(resultado).toMatchObject({
        ok: true,
        sucesso: true,
        aplicouCondicao: true,
        totalSapo: 10 + bonusLuta,
        totalAlvo: 10,
      });
      const condicao = pegarFicha(ID_INIMIGO).activeConditions?.find(item => item.conditionId === 'agarrado');
      expect(condicao).toMatchObject({
        sourceEntityId: 'dez-sombras:abismo-desconhecido-do-poco',
        sourceInstanceId: useMapStore.getState().entities[tokenId].invocationInstanceId,
      });
      expect(saldoAcao(abismo.id, acao.id)).toBe(saldoAntes - 1);
      expect(pegarFicha(ID_DONO).peCurrent).toBe(peAntes);
    });

    it('rejeita contagem ausente, fracionária ou fora de 1–3 antes de rolar ou gastar', async () => {
      const abismo = modelo('abismo-desconhecido-do-poco');
      const tokenId = await invocarUma('abismo-desconhecido-do-poco');
      useRoleStore.getState().setRole('MASTER');
      const acao = abismo.acoes.find(item => item.id === 'segurar')!;
      const saldoAntes = saldoAcao(abismo.id, acao.id);
      const peAntes = pegarFicha(ID_DONO).peCurrent;
      const rolagens = vi.spyOn(useDice3DStore.getState(), 'requestRoll');

      for (const membrosSapoVivos of [undefined, 0, 4, 1.5, Number.NaN]) {
        const resultado = await comandarSegurarSapo(ID_DONO, abismo.id, ID_INIMIGO, {
          instanciaId: useMapStore.getState().entities[tokenId].invocationInstanceId,
          membrosSapoVivos,
        });
        expect(resultado).toMatchObject({ ok: false });
      }

      expect(rolagens).not.toHaveBeenCalled();
      expect(saldoAcao(abismo.id, acao.id)).toBe(saldoAntes);
      expect(pegarFicha(ID_DONO).peCurrent).toBe(peAntes);
      expect(pegarFicha(ID_INIMIGO).activeConditions?.some(item => item.conditionId === 'agarrado')).toBe(false);
    });

    it('impede que um jogador informe a confirmação reservada ao Mestre', async () => {
      const abismo = modelo('abismo-desconhecido-do-poco');
      const tokenId = await invocarUma('abismo-desconhecido-do-poco');
      const acao = abismo.acoes.find(item => item.id === 'segurar')!;
      useRoleStore.getState().setRole('PLAYER');
      const saldoAntes = saldoAcao(abismo.id, acao.id);
      const peAntes = pegarFicha(ID_DONO).peCurrent;
      const rolagens = vi.spyOn(useDice3DStore.getState(), 'requestRoll');

      const resultado = await comandarSegurarSapo(ID_DONO, abismo.id, ID_INIMIGO, {
        instanciaId: useMapStore.getState().entities[tokenId].invocationInstanceId,
        membrosSapoVivos: 3,
      });

      expect(resultado).toMatchObject({ ok: false });
      if (!resultado.ok) expect(resultado.motivo).toContain('Mestre');
      expect(rolagens).not.toHaveBeenCalled();
      expect(saldoAcao(abismo.id, acao.id)).toBe(saldoAntes);
      expect(pegarFicha(ID_DONO).peCurrent).toBe(peAntes);
    });

    it('consome a tentativa simples sem aplicar Agarrado quando o alvo vence', async () => {
      const abismo = modelo('abismo-desconhecido-do-poco');
      const tokenId = await invocarUma('abismo-desconhecido-do-poco');
      useRoleStore.getState().setRole('MASTER');
      const acao = abismo.acoes.find(item => item.id === 'segurar')!;
      const saldoAntes = saldoAcao(abismo.id, acao.id);
      rolarD20s(1, 20);

      const resultado = await comandarSegurarSapo(ID_DONO, abismo.id, ID_INIMIGO, {
        instanciaId: useMapStore.getState().entities[tokenId].invocationInstanceId,
        membrosSapoVivos: 1,
      });

      expect(resultado).toMatchObject({
        ok: true,
        sucesso: false,
        aplicouCondicao: false,
        totalSapo: 6,
        totalAlvo: 20,
      });
      expect(pegarFicha(ID_INIMIGO).activeConditions?.some(item => item.conditionId === 'agarrado')).toBe(false);
      expect(saldoAcao(abismo.id, acao.id)).toBe(saldoAntes - 1);
    });

    it('rejeita alvo além de 9 m sem rolar nem gastar ação', async () => {
      const abismo = modelo('abismo-desconhecido-do-poco');
      const tokenId = await invocarUma('abismo-desconhecido-do-poco');
      useRoleStore.getState().setRole('MASTER');
      const tokenAlvo = Object.values(useMapStore.getState().entities).find(
        entity => entity.characterId === ID_INIMIGO && !entity.invocationId,
      );
      if (!tokenAlvo) throw new Error('Missing enemy map token.');
      useMapStore.getState().updateEntity(tokenAlvo.id, { x: 640 });

      const acao = abismo.acoes.find(item => item.id === 'segurar')!;
      const saldoAntes = saldoAcao(abismo.id, acao.id);
      const rolagens = vi.spyOn(useDice3DStore.getState(), 'requestRoll');
      const resultado = await comandarSegurarSapo(ID_DONO, abismo.id, ID_INIMIGO, {
        instanciaId: useMapStore.getState().entities[tokenId].invocationInstanceId,
        membrosSapoVivos: 1,
      });

      expect(resultado).toMatchObject({ ok: false });
      expect(saldoAcao(abismo.id, acao.id)).toBe(saldoAntes);
      expect(rolagens).not.toHaveBeenCalled();
    });

    it('mantém manual a fuga do Abismo e libera personagem agarrado quando a forma cai', async () => {
      const abismo = modelo('abismo-desconhecido-do-poco');
      const tokenId = await invocarUma('abismo-desconhecido-do-poco');
      useRoleStore.getState().setRole('MASTER');
      rolarD20s(20, 1);
      await expect(comandarSegurarSapo(ID_DONO, abismo.id, ID_INIMIGO, {
        instanciaId: useMapStore.getState().entities[tokenId].invocationInstanceId,
        membrosSapoVivos: 2,
      })).resolves.toMatchObject({ ok: true, aplicouCondicao: true });
      const condicao = pegarFicha(ID_INIMIGO).activeConditions?.find(item => item.conditionId === 'agarrado');
      if (!condicao) throw new Error('Abismo did not apply Agarrado.');

      const rolagens = useDice3DStore.getState().requestRoll as ReturnType<typeof vi.fn>;
      rolagens.mockClear();
      useCombatStore.setState({
        initiativeOrder: [{ charId: ID_INIMIGO, charName: 'Inimigo', roll: 1, bonus: 0, total: 1 }],
        currentTurnIndex: 0,
      } as never);
      const fuga = await escaparAgarradoPorInvocacao(ID_INIMIGO, condicao.id, 'Atletismo');

      expect(fuga).toMatchObject({ ok: false });
      if (!fuga.ok) expect(fuga.motivo).toContain('Abismo');
      expect(rolagens).not.toHaveBeenCalled();
      expect(pegarFicha(ID_INIMIGO).activeConditions?.some(item => item.id === condicao.id)).toBe(true);

      const token = useMapStore.getState().entities[tokenId];
      expect(causarDanoInvocacao(tokenId, token.hpMax ?? 50)).toMatchObject({ ok: true, hpRestante: 0 });
      expect(pegarFicha(ID_INIMIGO).activeConditions?.some(item => item.id === condicao.id)).toBe(false);
      expect(pegarFicha(ID_INIMIGO).grappleState?.grappledBy).not.toContain(
        'invocacao-sapo:' + token.invocationInstanceId,
      );
    });

    it('segura invocação, preserva fuga manual e remove vínculo quando o Abismo cai', async () => {
      const abismo = modelo('abismo-desconhecido-do-poco');
      const abismoTokenId = await invocarUma('abismo-desconhecido-do-poco', 210, 140);
      const nue = modelo('nue');
      const nueTokenId = await invocarUma('nue', 350, 140);
      useRoleStore.getState().setRole('MASTER');
      rolarD20s(20, 1);

      const resultado = await comandarSegurarSapo(ID_DONO, abismo.id, 'invoc:' + nueTokenId, {
        instanciaId: useMapStore.getState().entities[abismoTokenId].invocationInstanceId,
        membrosSapoVivos: 3,
      });
      expect(resultado).toMatchObject({ ok: true, sucesso: true, aplicouCondicao: true });

      const instanciaNue = pegarFicha(ID_DONO).instanciasInvocacao?.find(
        item => item.modeloId === nue.id && item.estado === 'ativa',
      );
      if (!instanciaNue) throw new Error('Missing captured Nue instance.');
      expect(instanciaNue.agarradoPorInvocacao).toHaveLength(1);

      const rolagens = useDice3DStore.getState().requestRoll as ReturnType<typeof vi.fn>;
      rolagens.mockClear();
      expect(await escaparInvocacaoAgarrada(ID_DONO, instanciaNue.id, 'Atletismo')).toMatchObject({ ok: false });
      expect(rolagens).not.toHaveBeenCalled();

      const abismoToken = useMapStore.getState().entities[abismoTokenId];
      expect(causarDanoInvocacao(abismoTokenId, abismoToken.hpMax ?? 50)).toMatchObject({ ok: true, hpRestante: 0 });
      expect(pegarFicha(ID_DONO).instanciasInvocacao?.find(item => item.id === instanciaNue.id)?.agarradoPorInvocacao).toEqual([]);
    });
  });

  describe('Totalidade: Mordida', () => {
    it('deve causar dano perfurante com bônus de ataque correto', async () => {
      // Primeiro precisamos criar uma Totalidade transformando um Cão
      const caoBranco = modelo('cao-branco');
      const caoPreto = modelo('cao-preto');

      // Invocar dois cães
      const resultadoInvocacao = await invocarControladores(ID_DONO, [
        { invocacaoId: caoBranco.id, x: 210, y: 140 },
        { invocacaoId: caoPreto.id, x: 210, y: 210 },
      ]);
      if (!resultadoInvocacao.ok) throw new Error(resultadoInvocacao.motivo);

      // Exorcizar permanentemente o Cão Preto para criar a Totalidade
      useCharacterStore.getState().updateCharacter(ID_DONO, {
        peCurrent: PE_INICIAL - 4, // Após invocar dois cães (2 PE cada)
      });

      // Simular dano suficiente para destruir o Cão Preto
      const caoPretoTokenId = resultadoInvocacao.tokenIds.find(tokenId =>
        useMapStore.getState().entities[tokenId]?.invocationId === caoPreto.id,
      );
      if (!caoPretoTokenId) throw new Error('Missing Black Dog combat token.');
      expect(causarDanoInvocacao(caoPretoTokenId, 25)).toMatchObject({
        ok: true, hpRestante: 0, destruida: false,
      });
      expect(causarDanoInvocacao(caoPretoTokenId, 25)).toMatchObject({
        ok: true, hpRestante: -25, destruida: true,
      });

      // Exorcismo permanente
      expect(resolverDerrotaPendenteInvocacao(ID_DONO, caoPreto.id, { resultado: 'perda_permanente' }, {
        isMaster: true, profileId: 'perfil-mestre',
      })).toEqual({ ok: true });

      // Verificar que a Totalidade foi criada
      const totalidade = pegarFicha(ID_DONO).invocacoesConhecidas?.find(
        item => item.subcategoria === 'dez-sombras:totalidade'
      );
      if (!totalidade) throw new Error('Totalidade was not created.');

      // Testar a mordida da Totalidade
      const mordida = totalidade.acoes.find(acao => acao.id === 'mordida')!;
      expect(mordida.statusAutomacao).toBe('executavel');

      rolarD20s(15); // Valor fixo para teste determinístico
      rolarDadosMinimos(); // Para dados de dano

      const bonus = calcularBonusAtaqueInvocacao(pegarFicha(ID_DONO), totalidade, mordida);
      // A ficha publicada de Totalidade informa bônus de ataque +8.
      expect(bonus?.total).toBe(8);

      // Encontrar o token do dono para obter o instanciaId
      const donoToken = useMapStore.getState().entities[Object.values(useMapStore.getState().entities).find(e => e.characterId === ID_DONO && !e.invocationId)?.id ?? ''];
      const resultado = await comandarAtaque(ID_DONO, totalidade.id, 'mordida', ID_INIMIGO, {
        instanciaId: donoToken?.invocationInstanceId ?? '',
      });
      if (!resultado.ok || !('totalAtaque' in resultado)) {
        throw new Error('Totalidade attack did not return a single-target result.');
      }

      const danoEsperado = 9; // Resultado mínimo determinístico de 3d8+6.

      expect(resultado).toMatchObject({ ok: true, acertou: true, dano: danoEsperado });
      expect(resultado.totalAtaque).toBe(15 + 8); // d20 fixo + bônus
      expect(pegarFicha(ID_INIMIGO).hpCurrent).toBe(1000 - danoEsperado);
    });

    it('não causa dano quando Totalidade mordida erra', async () => {
      // Criar Totalidade da mesma forma que no teste anterior
      const caoBranco = modelo('cao-branco');
      const caoPreto = modelo('cao-preto');

      const resultadoInvocacao = await invocarControladores(ID_DONO, [
        { invocacaoId: caoBranco.id, x: 210, y: 140 },
        { invocacaoId: caoPreto.id, x: 210, y: 210 },
      ]);
      if (!resultadoInvocacao.ok) throw new Error(resultadoInvocacao.motivo);

      useCharacterStore.getState().updateCharacter(ID_DONO, {
        peCurrent: PE_INICIAL - 4,
      });

      const caoPretoTokenId = resultadoInvocacao.tokenIds.find(tokenId =>
        useMapStore.getState().entities[tokenId]?.invocationId === caoPreto.id,
      );
      if (!caoPretoTokenId) throw new Error('Missing Black Dog combat token.');
      expect(causarDanoInvocacao(caoPretoTokenId, 25)).toMatchObject({
        ok: true, hpRestante: 0, destruida: false,
      });
      expect(causarDanoInvocacao(caoPretoTokenId, 25)).toMatchObject({
        ok: true, hpRestante: -25, destruida: true,
      });

      expect(resolverDerrotaPendenteInvocacao(ID_DONO, caoPreto.id, { resultado: 'perda_permanente' }, {
        isMaster: true, profileId: 'perfil-mestre',
      })).toEqual({ ok: true });

      const totalidade = pegarFicha(ID_DONO).invocacoesConhecidas?.find(
        item => item.subcategoria === 'dez-sombras:totalidade'
      );
      if (!totalidade) throw new Error('Totalidade was not created.');

      const mordida = totalidade.acoes.find(acao => acao.id === 'mordida')!;

      // Tornar o inimigo muito difícil de acertar
      useCharacterStore.getState().updateCharacter(ID_INIMIGO, { ca: 100 });

      const saldoAntes = saldoAcao(totalidade.id, mordida.id);
      const rolagens = rolarD20s(10); // Valor baixo para garantir erro
      const dados = vi.spyOn(useDice3DStore.getState(), 'requestNotation');

      // Encontrar o token do dono para obter o instanciaId
      const donoToken = useMapStore.getState().entities[Object.values(useMapStore.getState().entities).find(e => e.characterId === ID_DONO && !e.invocationId)?.id ?? ''];
      const resultado = await comandarAtaque(ID_DONO, totalidade.id, 'mordida', ID_INIMIGO, {
        instanciaId: donoToken?.invocationInstanceId ?? '',
      });

      expect(resultado).toMatchObject({ ok: true, acertou: false });
      expect(pegarFicha(ID_INIMIGO).hpCurrent).toBe(1000);
      expect(saldoAcao(totalidade.id, mordida.id)).toBe(saldoAntes - 1);
      expect(rolagens).toHaveBeenCalled();
      expect(dados).not.toHaveBeenCalled();
    });
  });
});
