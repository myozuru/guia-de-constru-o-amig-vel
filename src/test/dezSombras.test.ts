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
import { useTestRequestStore } from '@/stores/useTestRequestStore';
import { criarPacoteDezSombras, dadosAdicionaisInvestidaPerfurante, DEZ_SOMBRAS_MODELOS, medirInvestidaRetaEmMetros, transformarCaoEmTotalidade } from '@/lib/controlador/dezSombras';
import { calcularBonusAtaqueInvocacao, calcularBonusPericiaInvocacao, calcularBonusResistenciaInvocacao } from '@/lib/controlador/rolagens';
import { invocarControladores, confirmarMovimentoInvocacao, comandarAtaque, comandarSegurarSapo, escaparAgarradoPorInvocacao, escaparInvocacaoAgarrada, podeMoverInvocacao, comandarSuporte, causarDanoInvocacao, resolverDerrotaPendenteInvocacao, recolherInvocacao, rolarPericiaInvocacao } from '@/lib/controlador/mapa';
import { resolverDanoAposTRInvocacao } from '@/lib/controlador/resolucaoTR';

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
  useCombatStore.setState({ inCombat: false, combatId: 'combate-dez-sombras', round: 1, currentTurnIndex: 0, initiativeOrder: [] } as never);

  const modelos = criarPacoteDezSombras(ID_DONO, true).map(modelo => ({
    ...modelo,
    domado: true,
    alcanceInvocacaoM: 18,
  }));
  montarMesa([
    ficha(ID_DONO, {
      specialization: 'Controlador', profileId: 'perfil-dono', level: 1,
      peCurrent: PE_INICIAL, peMax: PE_INICIAL, treinoControle: 1,
      tecnicaAmaldicoada: 'Dez Sombras', invocacoesConhecidas: modelos,
      hpCurrent: 20, hpMax: 20,
    }),
    ficha(ID_ALIADO, { profileId: 'perfil-aliado', hpCurrent: 5, hpMax: 30, ca: 1 }),
    ficha(ID_INIMIGO, { category: 'INIMIGO', profileId: 'perfil-inimigo', hpCurrent: 1000, hpMax: 1000, ca: 1 }),
  ], { dono: [2, 2], aliado: [2, 3], inimigo: [4, 2] });
  for (const entity of Object.values(useMapStore.getState().entities)) {
    useMapStore.getState().updateEntity(entity.id, { shape: 'ELLIPSE', rotation: 0 });
  }
  useMapStore.getState().clearWalls();
  comoTela({ profileId: 'perfil-dono', role: 'PLAYER' });
  useCombatStore.setState({
    inCombat: true,
    round: 1,
    currentTurnIndex: 0,
    initiativeOrder: [{ charId: ID_DONO, charName: 'Dono', roll: 10, bonus: 0, total: 10 }],
  } as never);
}

function modelo(id: string) {
  const encontrado = pegarFicha(ID_DONO).invocacoesConhecidas?.find(item => item.subcategoria === `dez-sombras:${id}`);
  if (!encontrado) throw new Error(`Missing Ten Shadows model: ${id}`);
  return encontrado;
}

function rolarD20(valor = 12) {
  return vi.spyOn(useDice3DStore.getState(), 'requestRoll').mockImplementation(async tipos => tipos.map(() => valor));
}

function rolarDadosMinimos() {
  return vi.spyOn(useDice3DStore.getState(), 'requestNotation').mockImplementation(async anotacao => {
    const grupos = [...anotacao.matchAll(/(\d+)d\d+/g)];
    return grupos.flatMap(grupo => Array(Number(grupo[1])).fill(1));
  });
}

async function invocarUma(id: string, x = 210, y = 140) {
  const resultado = invocarControladores(ID_DONO, [{ invocacaoId: modelo(id).id, x, y }]);
  if (!resultado.ok) throw new Error(resultado.motivo);
  return resultado.tokenIds[0];
}

function danoMinimoDaFormula(formula: string) {
  const dados = [...formula.matchAll(/(\d+)d\d+/g)].reduce((total, grupo) => total + Number(grupo[1]), 0);
  const fixo = formula.match(/[+-]\d+$/)?.[0] ?? '0';
  return dados + Number(fixo);
}

beforeEach(prepararMesa);
afterEach(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });

describe('Dez Sombras: catalogo importado', () => {
  it('inclui os nove individuos identificados e mantem o Tigre separado como homebrew opcional', () => {
    expect(DEZ_SOMBRAS_MODELOS.filter(item => !item.opcionalHomebrew).map(item => item.id)).toEqual([
      'cao-branco', 'cao-preto', 'nue', 'sapo', 'grande-serpente',
      'elefante-maximo', 'cervo-circular', 'touro-perfurante', 'mahoraga',
    ]);
    expect(DEZ_SOMBRAS_MODELOS.filter(item => item.opcionalHomebrew).map(item => item.id)).toEqual(['tigre-funebre']);
    expect(criarPacoteDezSombras(ID_DONO, false).some(item => item.subcategoria === 'dez-sombras:tigre-funebre')).toBe(false);
    expect(criarPacoteDezSombras(ID_DONO, true)).toHaveLength(10);
  });

  it('invokes the two Dogs for 4 PE, charging 2 PE each', () => {
    const branco = modelo('cao-branco');
    const preto = modelo('cao-preto');
    const resultado = invocarControladores(ID_DONO, [
      { invocacaoId: branco.id, x: 210, y: 140 },
      { invocacaoId: preto.id, x: 210, y: 210 },
    ]);
    expect(resultado.ok, resultado.ok ? '' : resultado.motivo).toBe(true);
    expect(resultado).toMatchObject({ ok: true, tokenIds: expect.arrayContaining([expect.any(String), expect.any(String)]) });
    expect(pegarFicha(ID_DONO).peCurrent).toBe(PE_INICIAL - 4);
    expect(useMapStore.getState().entities[resultado.ok ? resultado.tokenIds[0] : '']).toMatchObject({ ownerCharId: ID_DONO });
  });

  it('aplica Robustez aos PV máximos de Elefante Máximo e Mahoraga', () => {
    expect(modelo('elefante-maximo')).toMatchObject({ hpAtual: 90, hpMaximo: 90 });
    expect(modelo('mahoraga')).toMatchObject({ hpAtual: 240, hpMaximo: 240 });
  });

  it('aplica Flexível como +2 em Acrobacia nos testes reais da Grande Serpente', async () => {
    const serpente = modelo('grande-serpente');
    await invocarUma('grande-serpente');
    rolarD20(12);

    await expect(rolarPericiaInvocacao(ID_DONO, serpente.id, 'ACROBACIA'))
      .resolves.toMatchObject({ ok: true, d20: 12, bonus: 0, total: 12, treinada: false });
  });

  it('conta apenas uma trajetória reta contínua para os dados de Investida', () => {
    const escala = { dpi: 70, metersPerCell: 1.5 };
    expect(medirInvestidaRetaEmMetros([{ x: 0, y: 0 }, { x: 0, y: 140 }], escala)).toBe(3);
    expect(medirInvestidaRetaEmMetros([{ x: 0, y: 0 }, { x: 50, y: 50 }, { x: 100, y: 0 }], escala)).toBe(0);
    expect(medirInvestidaRetaEmMetros([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 0 }], escala)).toBe(0);
    expect(dadosAdicionaisInvestidaPerfurante(2.99)).toBe(0);
    expect(dadosAdicionaisInvestidaPerfurante(3)).toBe(1);
    expect(dadosAdicionaisInvestidaPerfurante(6)).toBe(2);
  });

  it('mantem sem nome a decima entidade nao identificada e nao promove formas derivadas a individuos-base', () => {
    const catalogo = criarPacoteDezSombras(ID_DONO, true);
    expect(catalogo.some(item => item.subcategoria === 'dez-sombras:decimo-shikigami')).toBe(false);
    expect(catalogo.some(item => item.subcategoria === 'dez-sombras:agito')).toBe(false);
    expect(catalogo.some(item => item.subcategoria === 'dez-sombras:abismo-desconhecido-do-poco')).toBe(false);
  });
});

const ACOES_ESPERADAS: Record<string, { custoPE: number; ids: string[] }> = {
  'cao-branco': { custoPE: 2, ids: ['mordida', 'alcateia'] },
  'cao-preto': { custoPE: 2, ids: ['mordida', 'alcateia'] },
  nue: { custoPE: 3, ids: ['rasante-eletrico', 'alado', 'montaria'] },
  sapo: { custoPE: 3, ids: ['arremessar', 'segurar', 'fora-de-risco'] },
  'grande-serpente': { custoPE: 4, ids: ['mordida', 'entrelacar', 'flexivel'] },
  'elefante-maximo': { custoPE: 7, ids: ['golpe-tromba', 'torrente-agua', 'defesa-alternativa', 'robustez'] },
  'cervo-circular': { custoPE: 7, ids: ['cura-concentrada', 'liberar-energia-reversa', 'fluxo-reverso'] },
  'touro-perfurante': { custoPE: 6, ids: ['investida-perfurante', 'movimento-alternativo'] },
  mahoraga: { custoPE: 18, ids: ['golpe-punho', 'espada-energia-reversa', 'espada-forca', 'regeneracao', 'adaptacao-defensiva', 'adaptacao-ofensiva', 'burlar-defesas', 'robustez'] },
  'tigre-funebre': { custoPE: 7, ids: ['presas-funebres', 'garras-rapidas', 'arauto-do-funeral'] },
};

type AtaqueEsperado = {
  modeloId: string;
  acaoId: string;
  formula: string;
  tipoDano: string;
  alcanceM: number | undefined;
  bonusAtaque: number | undefined;
  bonusEfetivo: number | undefined;
  status: 'executavel' | 'parcial' | 'manual';
  teste: 'ataque' | 'resistencia';
};

const ATAQUES_ESPERADOS: AtaqueEsperado[] = [
  { modeloId: 'cao-branco', acaoId: 'mordida', formula: '2d8+3', tipoDano: 'DP', alcanceM: 1.5, bonusAtaque: 4, bonusEfetivo: 5, status: 'executavel', teste: 'ataque' },
  { modeloId: 'cao-preto', acaoId: 'mordida', formula: '2d8+3', tipoDano: 'DP', alcanceM: 1.5, bonusAtaque: 4, bonusEfetivo: 5, status: 'executavel', teste: 'ataque' },
  { modeloId: 'nue', acaoId: 'rasante-eletrico', formula: '2d8+3', tipoDano: 'DCC', alcanceM: 3, bonusAtaque: 2, bonusEfetivo: 5, status: 'executavel', teste: 'ataque' },
  { modeloId: 'sapo', acaoId: 'arremessar', formula: '2d6+3', tipoDano: 'DI', alcanceM: undefined, bonusAtaque: 0, bonusEfetivo: undefined, status: 'manual', teste: 'ataque' },
  { modeloId: 'grande-serpente', acaoId: 'mordida', formula: '2d8+3', tipoDano: 'DP', alcanceM: 3, bonusAtaque: 3, bonusEfetivo: 5, status: 'executavel', teste: 'ataque' },
  { modeloId: 'elefante-maximo', acaoId: 'golpe-tromba', formula: '2d12+4', tipoDano: 'DI', alcanceM: 3, bonusAtaque: 2, bonusEfetivo: 6, status: 'executavel', teste: 'ataque' },
  { modeloId: 'elefante-maximo', acaoId: 'torrente-agua', formula: '2d10+4', tipoDano: 'DI', alcanceM: 12, bonusAtaque: undefined, bonusEfetivo: undefined, status: 'executavel', teste: 'resistencia' },
  { modeloId: 'touro-perfurante', acaoId: 'investida-perfurante', formula: '2d10+7', tipoDano: 'DP', alcanceM: 1.5, bonusAtaque: 2, bonusEfetivo: 9, status: 'executavel', teste: 'ataque' },
  { modeloId: 'mahoraga', acaoId: 'golpe-punho', formula: '4d12+7', tipoDano: 'DI', alcanceM: 3, bonusAtaque: 2, bonusEfetivo: 9, status: 'executavel', teste: 'ataque' },
  { modeloId: 'mahoraga', acaoId: 'espada-energia-reversa', formula: '4d12+7', tipoDano: 'DNR', alcanceM: 3, bonusAtaque: 2, bonusEfetivo: 9, status: 'executavel', teste: 'ataque' },
  { modeloId: 'mahoraga', acaoId: 'espada-forca', formula: '4d12+7', tipoDano: 'DE', alcanceM: 3, bonusAtaque: 2, bonusEfetivo: 9, status: 'executavel', teste: 'ataque' },
  { modeloId: 'tigre-funebre', acaoId: 'presas-funebres', formula: '3d10+5', tipoDano: 'DN', alcanceM: 3, bonusAtaque: 2, bonusEfetivo: 7, status: 'executavel', teste: 'ataque' },
  { modeloId: 'tigre-funebre', acaoId: 'garras-rapidas', formula: '3d10+5', tipoDano: 'DCO', alcanceM: 3, bonusAtaque: 2, bonusEfetivo: 7, status: 'executavel', teste: 'ataque' },
];

describe('Dez Sombras: cat\u00e1logo completo de a\u00e7\u00f5es e custos', () => {
  it('preserva a lista de todas as a\u00e7\u00f5es e os custos publicados por perfil', () => {
    expect(DEZ_SOMBRAS_MODELOS.map(perfil => perfil.id)).toEqual(Object.keys(ACOES_ESPERADAS));
    for (const [id, esperado] of Object.entries(ACOES_ESPERADAS)) {
      const perfilFonte = DEZ_SOMBRAS_MODELOS.find(item => item.id === id)!;
      const perfilImportado = modelo(id);
      expect(perfilFonte.custoPE).toBe(esperado.custoPE);
      expect(perfilFonte.acoes.map(acao => acao.id)).toEqual(esperado.ids);
      expect(perfilImportado.custoInvocacaoPE).toBe(esperado.custoPE);
      expect(perfilImportado.acoes.map(acao => acao.id)).toEqual(esperado.ids);
    }
  });

  it('compara cada ataque com uma matriz independente de f\u00f3rmula, alcance, dano e automa\u00e7\u00e3o', () => {
    const ataquesCatalogo = DEZ_SOMBRAS_MODELOS.flatMap(perfil => perfil.acoes
      .filter(acao => acao.tipo === 'ataque')
      .map(acao => `${perfil.id}/${acao.id}`)).sort();
    expect(ataquesCatalogo).toEqual(ATAQUES_ESPERADOS.map(ataque => `${ataque.modeloId}/${ataque.acaoId}`).sort());

    for (const esperado of ATAQUES_ESPERADOS) {
      const perfil = DEZ_SOMBRAS_MODELOS.find(item => item.id === esperado.modeloId)!;
      const acao = perfil.acoes.find(item => item.id === esperado.acaoId)!;
      expect({
        formula: acao.dano,
        tipoDano: acao.tipoDano,
        alcanceM: acao.alcanceM,
        bonusAtaque: acao.bonusAtaque,
        status: acao.statusAutomacao,
        teste: acao.teste,
      }).toEqual({
        formula: esperado.formula,
        tipoDano: esperado.tipoDano,
        alcanceM: esperado.alcanceM,
        bonusAtaque: esperado.bonusAtaque,
        status: esperado.status,
        teste: esperado.teste,
      });
    }
  });
});
describe('Dez Sombras: ataques automatizados em combate', () => {
  for (const ataque of ATAQUES_ESPERADOS.filter(item => item.teste === 'ataque' && item.status !== 'manual')) {
    it(`${ataque.modeloId} / ${ataque.acaoId} rola ataque e aplica dano no alvo real`, async () => {
      const invocacao = modelo(ataque.modeloId);
      const acao = invocacao.acoes.find(item => item.id === ataque.acaoId)!;
      await invocarUma(ataque.modeloId);
      rolarD20();
      const dados = rolarDadosMinimos();
      const dano = vi.spyOn(useCharacterStore.getState(), 'applyDamage');

      const bonus = calcularBonusAtaqueInvocacao(pegarFicha(ID_DONO), invocacao, acao);
      expect(bonus?.total).toBe(ataque.bonusEfetivo);
      const resultado = await comandarAtaque(ID_DONO, invocacao.id, acao.id, ID_INIMIGO);
      const esperado = danoMinimoDaFormula(ataque.formula);

      expect(resultado).toMatchObject({ ok: true, acertou: true, dano: esperado });
      if (!resultado.ok || !('totalAtaque' in resultado)) throw new Error('Attack result did not contain the rolled total.');
      expect(resultado.totalAtaque).toBe(12 + ataque.bonusEfetivo!);
      expect(dados).toHaveBeenCalled();
      expect(dano.mock.calls[0]?.slice(0, 3)).toEqual([ID_INIMIGO, esperado, ataque.tipoDano]);
      expect(pegarFicha(ID_INIMIGO).hpCurrent).toBe(1000 - esperado);
    });
  }

  it('adiciona o d10 da distância reta antes da Investida do Touro e consome a marca', async () => {
    const tokenId = await invocarUma('touro-perfurante', 210, 350);
    const token = useMapStore.getState().entities[tokenId];
    const alvo = Object.values(useMapStore.getState().entities).find(entity => entity.characterId === ID_INIMIGO)!;
    const tokensAliados = Object.values(useMapStore.getState().entities)
      .filter(entity => !entity.invocationId && entity.characterId !== ID_INIMIGO)
      .map(entity => entity.id);
    useMapStore.getState().removeEntities(tokensAliados);

    const de = { x: token.x, y: token.y };
    const para = { x: 210, y: 140 };
    useMapStore.getState().updateEntity(tokenId, para);
    useMapStore.getState().setPendingMove({
      entityId: tokenId, charId: ID_DONO, invocationInstanceId: token.invocationInstanceId!,
      movementRequestId: 'investida-touro-move', startX: de.x, startY: de.y,
      trail: [de, para], distM: 4.5,
    });
    expect(confirmarMovimentoInvocacao({
      tokenId, instanciaId: token.invocationInstanceId!, de, para,
      trajetoria: [de, para], distanciaM: 4.5, requestId: 'investida-touro-move',
    })).toMatchObject({ ok: true, distanciaM: 4.5 });
    expect(pegarFicha(ID_DONO).instanciasInvocacao?.find(item => item.id === token.invocationInstanceId)?.investidaPerfuranteTurno)
      .toMatchObject({ rodada: 1, turnoIndex: 0, combateId: 'combate-dez-sombras', distanciaM: 4.5 });

    rolarD20();
    const dados = rolarDadosMinimos();
    await expect(comandarAtaque(ID_DONO, modelo('touro-perfurante').id, 'investida-perfurante', ID_INIMIGO))
      .resolves.toMatchObject({ ok: true, acertou: true, dano: 10 });
    expect(dados.mock.calls.flatMap(([notation]) => [...notation.matchAll(/(\d+)d\d+/g)].map(match => Number(match[1]))).reduce((sum, count) => sum + count, 0)).toBe(3);
    expect(pegarFicha(ID_INIMIGO).hpCurrent).toBe(990);
    expect(pegarFicha(ID_DONO).instanciasInvocacao?.find(item => item.id === token.invocationInstanceId)?.investidaPerfuranteTurno).toBeUndefined();
  });

  it('aplica o bônus de Alcateia ao Cão atacante quando outro shikigami está junto do alvo', async () => {
    const lote = invocarControladores(ID_DONO, [
      { invocacaoId: modelo('cao-branco').id, x: 210, y: 140 },
      { invocacaoId: modelo('cao-preto').id, x: 350, y: 140 },
    ]);
    if (!lote.ok) throw new Error(lote.motivo);
    rolarD20(12);
    rolarDadosMinimos();

    await expect(comandarAtaque(ID_DONO, modelo('cao-branco').id, 'mordida', ID_INIMIGO, {
      instanciaId: useMapStore.getState().entities[lote.tokenIds[0]].invocationInstanceId,
    })).resolves.toMatchObject({ ok: true, acertou: true, totalAtaque: 19, dano: 5 });
  });

  it('applies Totality\'s +4 Pack bonus to its own bite when another shikigami is beside the target', async () => {
    const totalidade = transformarCaoEmTotalidade(modelo('cao-preto'));
    if (!totalidade) throw new Error('Could not create Totality profile.');
    useCharacterStore.getState().updateCharacter(ID_DONO, {
      invocacoesConhecidas: pegarFicha(ID_DONO).invocacoesConhecidas?.map(item =>
        item.id === totalidade.id ? totalidade : item,
      ),
    });
    const lote = invocarControladores(ID_DONO, [
      { invocacaoId: totalidade.id, x: 210, y: 140 },
      { invocacaoId: modelo('nue').id, x: 350, y: 140 },
    ]);
    if (!lote.ok) throw new Error(lote.motivo);
    const modeloAtual = pegarFicha(ID_DONO).invocacoesConhecidas!.find(item => item.id === totalidade.id)!;
    const mordida = modeloAtual.acoes.find(acao => acao.id === 'mordida')!;
    const bonusBase = calcularBonusAtaqueInvocacao(pegarFicha(ID_DONO), modeloAtual, mordida)!.total;
    rolarD20(12);
    rolarDadosMinimos();

    await expect(comandarAtaque(ID_DONO, totalidade.id, 'mordida', ID_INIMIGO, {
      instanciaId: useMapStore.getState().entities[lote.tokenIds[0]].invocationInstanceId,
    })).resolves.toMatchObject({ ok: true, acertou: true, totalAtaque: bonusBase + 12 + 4, dano: 9 });
  });

  it('Segurar do Sapo aplica Agarrado no combate e permite fuga no turno do alvo', async () => {
    const sapoOriginal = modelo('sapo');
    const sapo = { ...sapoOriginal, periciasTreinadas: ['Atletismo'] };
    useCharacterStore.getState().updateCharacter(ID_DONO, {
      invocacoesConhecidas: pegarFicha(ID_DONO).invocacoesConhecidas?.map(item => item.id === sapo.id ? sapo : item),
    });
    const tokenId = await invocarUma('sapo');
    const instanciaId = useMapStore.getState().entities[tokenId].invocationInstanceId!;
    const rolagens = [20, 1, 20, 1];
    vi.spyOn(useDice3DStore.getState(), 'requestRoll').mockImplementation(async tipos => {
      const valor = rolagens.shift() ?? 1;
      return tipos.map(() => valor);
    });

    await expect(comandarSegurarSapo(ID_DONO, sapo.id, ID_INIMIGO, { instanciaId }))
      .resolves.toMatchObject({ ok: true, sucesso: true, aplicouCondicao: true });
    const condicao = pegarFicha(ID_INIMIGO).activeConditions?.find(item => item.conditionId === 'agarrado');
    expect(condicao).toMatchObject({ sourceEntityId: 'dez-sombras:sapo', sourceInstanceId: instanciaId });
    expect(pegarFicha(ID_INIMIGO).grappleState?.grappledBy).toContain('invocacao-sapo:' + instanciaId);

    useCombatStore.setState({
      initiativeOrder: [{ charId: ID_INIMIGO, charName: 'Inimigo', roll: 1, bonus: 0, total: 1 }],
      currentTurnIndex: 0,
    } as never);
    const bonusAtletismoSapo = calcularBonusPericiaInvocacao(pegarFicha(ID_DONO), sapo, 'ATLETISMO')!.total;
    const bonusLutaSapo = calcularBonusPericiaInvocacao(pegarFicha(ID_DONO), sapo, 'LUTA')!.total;
    expect(bonusAtletismoSapo).toBeGreaterThan(bonusLutaSapo);
    await expect(escaparAgarradoPorInvocacao(ID_INIMIGO, condicao!.id, 'Atletismo'))
      .resolves.toMatchObject({ ok: true, escapou: true, totalSapo: 1 + bonusAtletismoSapo });
    expect(pegarFicha(ID_INIMIGO).activeConditions?.some(item => item.conditionId === 'agarrado')).toBe(false);
    expect(pegarFicha(ID_INIMIGO).grappleState?.grappledBy).not.toContain('invocacao-sapo:' + instanciaId);
  });

  it('releases a character immediately when its Sapo is recalled and rejects stale escape attempts', async () => {
    const sapo = modelo('sapo');
    await invocarUma('sapo');
    const instanciaId = pegarFicha(ID_DONO).instanciasInvocacao?.find(item => item.modeloId === sapo.id)?.id;
    if (!instanciaId) throw new Error('Missing active Sapo instance.');
    const rolagens = [20, 1];
    vi.spyOn(useDice3DStore.getState(), 'requestRoll').mockImplementation(async tipos => {
      const valor = rolagens.shift() ?? 1;
      return tipos.map(() => valor);
    });
    await expect(comandarSegurarSapo(ID_DONO, sapo.id, ID_INIMIGO, { instanciaId }))
      .resolves.toMatchObject({ ok: true, aplicouCondicao: true });
    const condicao = pegarFicha(ID_INIMIGO).activeConditions?.find(item => item.conditionId === 'agarrado');
    expect(condicao).toBeDefined();

    useCombatStore.setState({
      round: 2,
      initiativeOrder: [{ charId: ID_DONO, charName: 'Dono', roll: 10, bonus: 0, total: 10 }],
      currentTurnIndex: 0,
    } as never);
    expect(recolherInvocacao(ID_DONO, sapo.id)).toBe(true);
    expect(pegarFicha(ID_INIMIGO).activeConditions?.some(item => item.conditionId === 'agarrado')).toBe(false);
    expect(pegarFicha(ID_INIMIGO).grappleState?.grappledBy).not.toContain('invocacao-sapo:' + instanciaId);
    await expect(escaparAgarradoPorInvocacao(ID_INIMIGO, condicao!.id, 'Atletismo'))
      .resolves.toMatchObject({ ok: false });
  });

  it('Segurar também marca outro Shikigami e bloqueia seu movimento até a fuga', async () => {
    const lote = invocarControladores(ID_DONO, [
      { invocacaoId: modelo('sapo').id, x: 210, y: 140 },
      { invocacaoId: modelo('nue').id, x: 350, y: 140 },
    ]);
    if (!lote.ok) throw new Error(lote.motivo);
    const sapoToken = useMapStore.getState().entities[lote.tokenIds[0]];
    const nueToken = useMapStore.getState().entities[lote.tokenIds[1]];
    const rolagens = [20, 1, 20, 1];
    const rolagem = vi.spyOn(useDice3DStore.getState(), 'requestRoll').mockImplementation(async tipos => {
      const valor = rolagens.shift() ?? 1;
      return tipos.map(() => valor);
    });

    await expect(comandarSegurarSapo(ID_DONO, modelo('sapo').id, 'invoc:' + nueToken.id, {
      instanciaId: sapoToken.invocationInstanceId,
    })).resolves.toMatchObject({ ok: true, sucesso: true, aplicouCondicao: true });
    const alvoAtual = pegarFicha(ID_DONO).instanciasInvocacao?.find(item => item.id === nueToken.invocationInstanceId)!;
    expect(alvoAtual.agarradoPorInvocacao).toHaveLength(1);
    expect(podeMoverInvocacao(ID_DONO, nueToken.id)).toBe(false);

    const nue = modelo('nue');
    const rasante = nue.acoes.find(acao => acao.id === 'rasante-eletrico')!;
    const bonusNue = calcularBonusAtaqueInvocacao(pegarFicha(ID_DONO), nue, rasante)!.total;
    rolagem.mockImplementationOnce(async tipos => tipos.map(() => 20))
      .mockImplementationOnce(async tipos => tipos.map(() => 5));
    rolarDadosMinimos();
    await expect(comandarAtaque(ID_DONO, nue.id, 'rasante-eletrico', ID_INIMIGO, {
      instanciaId: nueToken.invocationInstanceId,
    })).resolves.toMatchObject({ ok: true, acertou: true, totalAtaque: bonusNue + 5 });

    await expect(escaparInvocacaoAgarrada(ID_DONO, alvoAtual.id, 'Atletismo'))
      .resolves.toMatchObject({ ok: true, escapou: true });
    expect(pegarFicha(ID_DONO).instanciasInvocacao?.find(item => item.id === alvoAtual.id)?.agarradoPorInvocacao).toEqual([]);
  });

  it('releases a captured Shikigami when the Sapo is reduced to 0 HP', async () => {
    const lote = invocarControladores(ID_DONO, [
      { invocacaoId: modelo('sapo').id, x: 210, y: 140 },
      { invocacaoId: modelo('nue').id, x: 350, y: 140 },
    ]);
    if (!lote.ok) throw new Error(lote.motivo);
    const sapoToken = useMapStore.getState().entities[lote.tokenIds[0]];
    const nueToken = useMapStore.getState().entities[lote.tokenIds[1]];
    const rolagens = [20, 1];
    vi.spyOn(useDice3DStore.getState(), 'requestRoll').mockImplementation(async tipos => {
      const valor = rolagens.shift() ?? 1;
      return tipos.map(() => valor);
    });
    await expect(comandarSegurarSapo(ID_DONO, modelo('sapo').id, 'invoc:' + nueToken.id, {
      instanciaId: sapoToken.invocationInstanceId,
    })).resolves.toMatchObject({ ok: true, aplicouCondicao: true });
    const nueInstanciaId = nueToken.invocationInstanceId!;
    expect(pegarFicha(ID_DONO).instanciasInvocacao?.find(item => item.id === nueInstanciaId)?.agarradoPorInvocacao).toHaveLength(1);

    expect(causarDanoInvocacao(sapoToken.id, sapoToken.hpMax ?? 25)).toMatchObject({ ok: true, hpRestante: 0 });
    expect(pegarFicha(ID_DONO).instanciasInvocacao?.find(item => item.id === nueInstanciaId)?.agarradoPorInvocacao).toEqual([]);
    expect(podeMoverInvocacao(ID_DONO, nueToken.id)).toBe(true);
  });

  it('não reaproveita o movimento de Investida após iniciar outro combate', async () => {
    const tokenId = await invocarUma('touro-perfurante', 210, 350);
    const token = useMapStore.getState().entities[tokenId];
    const tokensAliados = Object.values(useMapStore.getState().entities)
      .filter(entity => !entity.invocationId && entity.characterId !== ID_INIMIGO)
      .map(entity => entity.id);
    useMapStore.getState().removeEntities(tokensAliados);
    const de = { x: token.x, y: token.y };
    const para = { x: token.x, y: token.y - 210 };
    useMapStore.getState().updateEntity(tokenId, para);
    useMapStore.getState().setPendingMove({
      entityId: tokenId, charId: ID_DONO, invocationInstanceId: token.invocationInstanceId!,
      movementRequestId: 'investida-combate-anterior', startX: de.x, startY: de.y,
      trail: [de, para], distM: 4.5,
    });
    expect(confirmarMovimentoInvocacao({
      tokenId, instanciaId: token.invocationInstanceId!, de, para,
      trajetoria: [de, para], distanciaM: 4.5, requestId: 'investida-combate-anterior',
    })).toMatchObject({ ok: true });

    useCombatStore.setState({ combatId: 'combate-seguinte', round: 1, currentTurnIndex: 0 } as never);
    rolarD20();
    const dados = rolarDadosMinimos();
    await expect(comandarAtaque(ID_DONO, modelo('touro-perfurante').id, 'investida-perfurante', ID_INIMIGO))
      .resolves.toMatchObject({ ok: true, acertou: true, dano: 9 });
    expect(dados.mock.calls.flatMap(([notation]) => [...notation.matchAll(/(\d+)d\d+/g)].map(match => Number(match[1]))).reduce((sum, count) => sum + count, 0)).toBe(2);
  });

  it('só transforma o Cão sobrevivente em Totalidade após exorcismo permanente e mantém seus PV', async () => {
    const resultado = invocarControladores(ID_DONO, [
      { invocacaoId: modelo('cao-branco').id, x: 210, y: 140 },
      { invocacaoId: modelo('cao-preto').id, x: 210, y: 210 },
    ]);
    if (!resultado.ok) throw new Error(resultado.motivo);
    const caes = resultado.tokenIds.map(tokenId => useMapStore.getState().entities[tokenId]);
    const sobrevivente = caes.find(token => token.invocationId === modelo('cao-branco').id)!;
    const exorcizado = caes.find(token => token.invocationId === modelo('cao-preto').id)!;

    expect(causarDanoInvocacao(sobrevivente.id, 5)).toMatchObject({ ok: true, hpRestante: 20, destruida: false });
    expect(causarDanoInvocacao(exorcizado.id, 25)).toMatchObject({ ok: true, hpRestante: 0, destruida: false });
    expect(pegarFicha(ID_DONO).invocacoesConhecidas?.find(item => item.id === sobrevivente.invocationId)?.subcategoria)
      .toBe('dez-sombras:cao-branco');

    expect(causarDanoInvocacao(exorcizado.id, 25)).toMatchObject({ ok: true, hpRestante: -25, destruida: true });
    expect(resolverDerrotaPendenteInvocacao(ID_DONO, exorcizado.invocationId!, { resultado: 'perda_permanente' }, {
      isMaster: true, profileId: 'perfil-mestre',
    })).toEqual({ ok: true });

    const totalidade = pegarFicha(ID_DONO).invocacoesConhecidas?.find(item => item.id === sobrevivente.invocationId)!;
    expect(totalidade).toMatchObject({ subcategoria: 'dez-sombras:totalidade', hpAtual: 20, hpMaximo: 35, defesa: 22, deslocamentoM: 12 });
    expect(useMapStore.getState().entities[sobrevivente.id]).toMatchObject({ hp: 20, hpMax: 35, invocationDefense: 22, invocationMovementM: 12 });
    const d20 = rolarD20();
    const dados = rolarDadosMinimos();
    const ataque = await comandarAtaque(ID_DONO, totalidade.id, 'mordida', ID_INIMIGO);
    expect(ataque).toMatchObject({ ok: true, acertou: true, dano: 9 });
    expect(d20).toHaveBeenCalled();
    expect(dados.mock.calls.map(([notation]) => notation)).toContain('3d8');
    expect(pegarFicha(ID_INIMIGO).hpCurrent).toBe(991);
  });

  it('mantem Arremessar manual e bloqueia execucao, rolagem e gasto de acao', async () => {
    const sapo = modelo('sapo');
    const antesInvocacao = pegarFicha(ID_DONO).peCurrent;
    await invocarUma('sapo');
    const peAntes = pegarFicha(ID_DONO).peCurrent;
    const instancia = pegarFicha(ID_DONO).instanciasInvocacao?.find(item => item.modeloId === sapo.id)!;
    const acaoAntes = instancia.economiaAcoes?.acaoComum?.atual;
    const d20 = rolarD20();
    const dados = rolarDadosMinimos();

    await expect(comandarAtaque(ID_DONO, sapo.id, 'arremessar', ID_INIMIGO)).resolves.toMatchObject({ ok: false });
    expect(d20).not.toHaveBeenCalled();
    expect(dados).not.toHaveBeenCalled();
    expect(pegarFicha(ID_DONO).peCurrent).toBe(peAntes);
    expect(pegarFicha(ID_DONO).peCurrent).toBe(antesInvocacao - 3);
    expect(pegarFicha(ID_DONO).instanciasInvocacao?.find(item => item.modeloId === sapo.id)?.economiaAcoes?.acaoComum?.atual).toBe(acaoAntes);
    expect(sapo.acoes.find(item => item.id === 'arremessar')?.statusAutomacao).toBe('manual');
  });

  it('keeps Mahoraga adaptations visible as manual abilities', () => {
    const mahoraga = modelo('mahoraga');
    for (const id of ['adaptacao-defensiva', 'adaptacao-ofensiva', 'burlar-defesas']) {
      expect(mahoraga.acoes.find(item => item.id === id)).toMatchObject({ statusAutomacao: 'manual' });
    }
  });
});

describe('Dez Sombras: curas do Cervo e Mahoraga', () => {
  it('Cura Concentrada cura um aliado no alcance e cobra 2 PE', async () => {
    const cervo = modelo('cervo-circular');
    await invocarUma('cervo-circular');
    const peAntes = pegarFicha(ID_DONO).peCurrent;
    rolarDadosMinimos();

    await expect(comandarSuporte(ID_DONO, cervo.id, 'cura-concentrada', [ID_ALIADO]))
      .resolves.toMatchObject({ ok: true, valor: 8, alvos: 1, curaReal: true, formula: '3d10+5' });
    expect(pegarFicha(ID_ALIADO).hpCurrent).toBe(13);
    expect(pegarFicha(ID_DONO).peCurrent).toBe(peAntes - 2);
  });

  it('Liberar Energia Reversa cura usuario e aliados, rejeita inimigos e cobra 2 PE uma vez', async () => {
    const cervo = modelo('cervo-circular');
    await invocarUma('cervo-circular');
    useCharacterStore.getState().updateCharacter(ID_DONO, { hpCurrent: 5 });
    useCharacterStore.getState().updateCharacter(ID_INIMIGO, { hpCurrent: 5 });
    const peAntes = pegarFicha(ID_DONO).peCurrent;
    const rolagem = rolarDadosMinimos();

    await expect(comandarSuporte(ID_DONO, cervo.id, 'liberar-energia-reversa', [ID_DONO, ID_ALIADO, ID_INIMIGO]))
      .resolves.toMatchObject({ ok: false });
    expect(pegarFicha(ID_DONO).peCurrent).toBe(peAntes);
    expect(pegarFicha(ID_INIMIGO).hpCurrent).toBe(5);
    expect(rolagem).not.toHaveBeenCalled();

    await expect(comandarSuporte(ID_DONO, cervo.id, 'liberar-energia-reversa', [ID_DONO, ID_ALIADO]))
      .resolves.toMatchObject({ ok: true, valor: 7, alvos: 2, curaReal: true, formula: '2d12+5' });
    expect(pegarFicha(ID_DONO).hpCurrent).toBe(12);
    expect(pegarFicha(ID_ALIADO).hpCurrent).toBe(12);
    expect(pegarFicha(ID_INIMIGO).hpCurrent).toBe(5);
    expect(pegarFicha(ID_DONO).peCurrent).toBe(peAntes - 2);
  });

  it('Regeneration heals Mahoraga without additional PE cost', async () => {
    const mahoraga = modelo('mahoraga');
    const tokenId = await invocarUma('mahoraga');
    const instancia = pegarFicha(ID_DONO).instanciasInvocacao?.find(item => item.modeloId === mahoraga.id)!;
    expect(causarDanoInvocacao(tokenId, 100, 'DI', instancia.id)).toMatchObject({ ok: true });
    const peAntes = pegarFicha(ID_DONO).peCurrent;
    rolarDadosMinimos();

    await expect(comandarSuporte(ID_DONO, mahoraga.id, 'regeneracao', [`invoc:${tokenId}`]))
      .resolves.toMatchObject({ ok: true, valor: 11, alvos: 1, curaReal: true, formula: '5d10+6' });
    expect(useMapStore.getState().entities[tokenId].hp).toBe(151);
    expect(pegarFicha(ID_DONO).peCurrent).toBe(peAntes);
  });
});

describe('Elephant Maximum: Water Stream in combat', () => {
  async function pedirTorrente(alvoId = ID_INIMIGO) {
    const elefante = modelo('elefante-maximo');
    const tokenId = await invocarUma('elefante-maximo');
    const ataque = await comandarAtaque(ID_DONO, elefante.id, 'torrente-agua', alvoId);
    if (!ataque.ok || !('requestId' in ataque)) throw new Error('Torrente did not create a Fortitude request.');
    const request = useTestRequestStore.getState().requests.find(item => item.id === ataque.requestId);
    if (!request) throw new Error('Missing Fortitude request.');
    return { elefante, tokenId, request };
  }

  it('applies the Agarrado -3 penalty to an invocation target\'s Reflexos save', async () => {
    const elefanteBase = modelo('elefante-maximo');
    const torrente = elefanteBase.acoes.find(acao => acao.id === 'torrente-agua')!;
    const testeReflexos = {
      ...torrente,
      id: 'teste-reflexos-agarrado',
      nome: 'Teste Reflexos Agarrado',
      resistenciaAlvo: 'Reflexos',
      statusAutomacao: 'executavel' as const,
    };
    const elefante = { ...elefanteBase, acoes: [...elefanteBase.acoes, testeReflexos] };
    useCharacterStore.getState().updateCharacter(ID_DONO, {
      invocacoesConhecidas: pegarFicha(ID_DONO).invocacoesConhecidas?.map(item => item.id === elefante.id ? elefante : item),
    });
    await invocarUma('elefante-maximo');

    const caoFonte = modelo('cao-branco');
    const modeloAlvo = { ...caoFonte, id: 'cao-alvo-reflexos', donoCharacterId: ID_INIMIGO, alcanceInvocacaoM: 18 };
    useCharacterStore.getState().updateCharacter(ID_INIMIGO, {
      specialization: 'Controlador', profileId: 'perfil-inimigo', level: 1, attributes: [], tecnicaAmaldicoada: 'Dez Sombras',
      peCurrent: 80, peMax: 80, treinoControle: 1, invocacoesConhecidas: [modeloAlvo],
    });
    const loteAlvo = invocarControladores(ID_INIMIGO, [{ invocacaoId: modeloAlvo.id, x: 420, y: 140 }]);
    if (!loteAlvo.ok) throw new Error(loteAlvo.motivo);
    const tokenAlvo = useMapStore.getState().entities[loteAlvo.tokenIds[0]];
    const instanciaAlvo = pegarFicha(ID_INIMIGO).instanciasInvocacao?.find(item => item.id === tokenAlvo.invocationInstanceId)!;
    useCharacterStore.getState().updateCharacter(ID_INIMIGO, {
      instanciasInvocacao: pegarFicha(ID_INIMIGO).instanciasInvocacao?.map(item => item.id === instanciaAlvo.id
        ? { ...item, agarradoPorInvocacao: [{ donoId: ID_DONO, instanciaId: 'sapo-de-teste', modeloId: modelo('sapo').id, nome: 'Sapo' }] }
        : item),
    });

    const resultado = await comandarAtaque(ID_DONO, elefante.id, testeReflexos.id, 'invoc:' + tokenAlvo.id);
    if (!resultado.ok || !('requestId' in resultado)) throw new Error('The Reflexos test was not queued: ' + JSON.stringify(resultado));
    const pedido = useTestRequestStore.getState().requests.find(item => item.id === resultado.requestId)!;
    const bonusBase = calcularBonusResistenciaInvocacao(pegarFicha(ID_INIMIGO), modeloAlvo, 'Reflexos')!.total;
    expect(pedido.bonusOverride).toBe(bonusBase - 3);
    expect(pedido.bonusBreakdownOverride).toContain('Agarrado -3 Reflexos');
  });

  it('aplica dano integral e empurra 4,5 m quando o TR falha', async () => {
    const { request } = await pedirTorrente();
    useTestRequestStore.getState().setResult(request.id, { d20: 5, bonus: 0, total: 5, rolledAt: Date.now() });
    vi.spyOn(useDice3DStore.getState(), 'requestNotation').mockResolvedValue([3, 4]);

    await expect(resolverDanoAposTRInvocacao(useTestRequestStore.getState().requests.find(item => item.id === request.id)!))
      .resolves.toMatchObject({ passou: false, dano: 11 });
    expect(pegarFicha(ID_INIMIGO).hpCurrent).toBe(989);
    expect(useMapStore.getState().entities['e-inimigo'].x).toBeCloseTo(490, 1);
  });

  it('aplica metade do dano e nao empurra quando o TR tem sucesso', async () => {
    const { request } = await pedirTorrente();
    useTestRequestStore.getState().setResult(request.id, { d20: 18, bonus: 0, total: 18, rolledAt: Date.now() });
    vi.spyOn(useDice3DStore.getState(), 'requestNotation').mockResolvedValue([3, 4]);

    await expect(resolverDanoAposTRInvocacao(useTestRequestStore.getState().requests.find(item => item.id === request.id)!))
      .resolves.toMatchObject({ passou: true, dano: 5 });
    expect(pegarFicha(ID_INIMIGO).hpCurrent).toBe(995);
    expect(useMapStore.getState().entities['e-inimigo'].x).toBe(280);
  });

  it('empurra em falha mesmo quando dano final e zero', async () => {
    const { request } = await pedirTorrente();
    useTestRequestStore.setState(state => ({
      ...state,
      requests: state.requests.map(item => item.id === request.id
        ? { ...item, invocationResolution: { ...item.invocationResolution!, damageBonus: -100 } }
        : item),
    }));
    useTestRequestStore.getState().setResult(request.id, { d20: 5, bonus: 0, total: 5, rolledAt: Date.now() });
    vi.spyOn(useDice3DStore.getState(), 'requestNotation').mockResolvedValue([1, 1]);

    await expect(resolverDanoAposTRInvocacao(useTestRequestStore.getState().requests.find(item => item.id === request.id)!))
      .resolves.toMatchObject({ passou: false, dano: 0 });
    expect(pegarFicha(ID_INIMIGO).hpCurrent).toBe(1000);
    expect(useMapStore.getState().entities['e-inimigo'].x).toBeCloseTo(490, 1);
  });

  it('uses the visible canonical token for a character target', async () => {
    const hiddenId = useMapStore.getState().addEntity({
      id: 'a-hidden-enemy', shape: 'ELLIPSE', x: 420, y: 140, w: 70, h: 70, rotation: 0,
      color: '#a00', locked: false, characterId: ID_INIMIGO, hidden: true,
    });
    const gmLayerId = useMapStore.getState().addEntity({
      id: 'b-gm-layer-enemy', shape: 'ELLIPSE', x: 650, y: 140, w: 70, h: 70, rotation: 0,
      color: '#a00', locked: false, characterId: ID_INIMIGO, layer: 'gm',
    });
    const { request } = await pedirTorrente();
    useTestRequestStore.getState().setResult(request.id, { d20: 5, bonus: 0, total: 5, rolledAt: Date.now() });
    vi.spyOn(useDice3DStore.getState(), 'requestNotation').mockResolvedValue([3, 4]);

    await resolverDanoAposTRInvocacao(useTestRequestStore.getState().requests.find(item => item.id === request.id)!);

    expect(useMapStore.getState().entities['e-inimigo'].x).toBeCloseTo(490, 1);
    expect(useMapStore.getState().entities[hiddenId].x).toBe(420);
    expect(useMapStore.getState().entities[gmLayerId].x).toBe(650);
  });

  it('empurra tamb\u00e9m um token de invoca\u00e7\u00e3o quando o TR falha', async () => {
    const caoFonte = modelo('cao-branco');
    const modeloInimigo = { ...caoFonte, id: 'cao-inimigo', donoCharacterId: ID_INIMIGO, alcanceInvocacaoM: 18 };
    useCharacterStore.getState().updateCharacter(ID_INIMIGO, {
      specialization: 'Controlador', profileId: 'perfil-inimigo', level: 1, attributes: [], tecnicaAmaldicoada: 'Dez Sombras',
      peCurrent: 80, peMax: 80, treinoControle: 1, invocacoesConhecidas: [modeloInimigo],
    });
    const lote = invocarControladores(ID_INIMIGO, [{ invocacaoId: modeloInimigo.id, x: 420, y: 140 }]);
    if (!lote.ok) throw new Error(`Could not create the target invocation: ${lote.motivo}`);
    const tokenId = lote.tokenIds[0];
    const { request } = await pedirTorrente(`invoc:${tokenId}`);
    expect(request.invocationResolution?.targetInvocation?.tokenId).toBe(tokenId);
    useTestRequestStore.getState().setResult(request.id, { d20: 5, bonus: 0, total: 5, rolledAt: Date.now() });
    vi.spyOn(useDice3DStore.getState(), 'requestNotation').mockResolvedValue([3, 4]);

    await resolverDanoAposTRInvocacao(useTestRequestStore.getState().requests.find(item => item.id === request.id)!);
    const alvo = useMapStore.getState().entities[tokenId];
    expect(alvo.hp).toBe(14);
    expect(alvo.x).toBeGreaterThan(420);
  });
  it('respects a wall and stops the push at the collision point', async () => {
    const { request } = await pedirTorrente();
    useMapStore.getState().addWall({ id: 'wall-push-blocker', kind: 'wall', p1: { x: 400, y: 130 }, p2: { x: 410, y: 150 } });
    useTestRequestStore.getState().setResult(request.id, { d20: 5, bonus: 0, total: 5, rolledAt: Date.now() });
    vi.spyOn(useDice3DStore.getState(), 'requestNotation').mockResolvedValue([3, 4]);

    await resolverDanoAposTRInvocacao(useTestRequestStore.getState().requests.find(item => item.id === request.id)!);
    expect(pegarFicha(ID_INIMIGO).hpCurrent).toBe(989);
    const xFinal = useMapStore.getState().entities['e-inimigo'].x;
    expect(xFinal).toBeGreaterThan(280);
    expect(xFinal).toBeLessThan(490);
  });
});
