// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { ficha, montarMesa, pegarFicha } from './helpers/mesaReal';
import { useCharacterStore } from '@/stores/useCharacterStore';
import { useMapStore } from '@/stores/useMapStore';
import { resolverDerrotaPendenteInvocacao } from '@/lib/controlador/mapa';
import { criarPacoteDezSombras, transformarCaoEmTotalidade } from '@/lib/controlador/dezSombras';

describe('Dez Sombras: perfil publicado de Totalidade', () => {
  it('transforma o Cão sem curar seus PV atuais e aplica os valores publicados', () => {
    const cao = criarPacoteDezSombras('dono', false).find(item => item.id.endsWith('cao-branco'))!;
    cao.hpAtual = 21;

    const totalidade = transformarCaoEmTotalidade(cao);
    expect(totalidade).toMatchObject({
      nome: 'Cão Divino Totalidade',
      subcategoria: 'dez-sombras:totalidade',
      hpAtual: 21,
      hpMaximo: 35,
      defesa: 22,
      deslocamentoM: 12,
      custoInvocacaoPE: 2,
    });
    expect(totalidade?.acoes.find(acao => acao.id === 'mordida')).toMatchObject({
      dano: '3d8+6',
      tipoDano: 'DP',
      alcanceM: 1.5,
      bonusAtaque: 7,
      statusAutomacao: 'executavel',
    });
  });

  it('limita os PV atuais ao novo maximo sem elevar os PV acima do valor que o Cão tinha', () => {
    const cao = criarPacoteDezSombras('dono', false).find(item => item.id.endsWith('cao-preto'))!;
    cao.hpAtual = 40;
    expect(transformarCaoEmTotalidade(cao)?.hpAtual).toBe(35);
  });

  it('recusa transformar uma invocacao que nao seja um dos dois Caes do pacote', () => {
    const nue = criarPacoteDezSombras('dono', false).find(item => item.id.endsWith('nue'))!;
    expect(transformarCaoEmTotalidade(nue)).toBeNull();
  });
});

describe('Dez Sombras: integracao de Totalidade no mapa', () => {
  function prepararMesa(hpCatalogo = 4, hpInstancia = 17, hpMaximoInstancia = 25) {
    const modelos = criarPacoteDezSombras('dono', false).map(modelo =>
      modelo.subcategoria === 'dez-sombras:cao-preto'
        ? { ...modelo, hpAtual: hpCatalogo }
        : modelo,
    );
    const caoBranco = modelos.find(modelo => modelo.subcategoria === 'dez-sombras:cao-branco')!;
    const caoPreto = modelos.find(modelo => modelo.subcategoria === 'dez-sombras:cao-preto')!;
    montarMesa([ficha('dono', {
      profileId: 'perfil-dono',
      level: 1,
      peCurrent: 80,
      invocacoesConhecidas: modelos,
    })], { dono: [2, 2] });

    const tokenId = useMapStore.getState().addEntity({
      shape: 'ELLIPSE',
      x: 210,
      y: 140,
      w: 70,
      h: 70,
      rotation: 0,
      color: '#222222',
      locked: false,
      ownerCharId: 'dono',
      invocationId: caoPreto.id,
      invocationInstanceId: 'inst-cao-preto-vivo',
      hp: hpInstancia,
      hpMax: hpMaximoInstancia,
      invocationDefense: 19,
      invocationMovementM: 10.5,
    });

    useCharacterStore.getState().updateCharacter('dono', {
      instanciasInvocacao: [
        {
          schemaVersion: 1,
          version: 1,
          id: 'inst-cao-branco-derrotado',
          modeloId: caoBranco.id,
          donoCharacterId: 'dono',
          tokenId: 'token-cao-branco-derrotado',
          estado: 'derrotada',
          hpAtual: -25,
          hpMaximoAtual: 25,
        },
        {
          schemaVersion: 1,
          version: 4,
          id: 'inst-cao-preto-vivo',
          modeloId: caoPreto.id,
          donoCharacterId: 'dono',
          tokenId,
          estado: 'ativa',
          hpAtual: hpInstancia,
          hpMaximoAtual: hpMaximoInstancia,
        },
      ] as never,
    });
    return { caoBranco, caoPreto, tokenId };
  }

  function exorcizarCaoBranco(caoId: string) {
    return resolverDerrotaPendenteInvocacao('dono', caoId, { resultado: 'perda_permanente' }, {
      isMaster: true,
      profileId: 'perfil-mestre',
    });
  }

  it('uses the live instance HP, preserves defeat history, and synchronizes the Totalidade token', () => {
    const { caoBranco, caoPreto, tokenId } = prepararMesa();
    expect(exorcizarCaoBranco(caoBranco.id)).toEqual({ ok: true });

    const dono = pegarFicha('dono');
    const totalidade = dono.invocacoesConhecidas?.find(modelo => modelo.id === caoPreto.id);
    const derrotada = dono.instanciasInvocacao?.find(instancia => instancia.id === 'inst-cao-branco-derrotado');
    const viva = dono.instanciasInvocacao?.find(instancia => instancia.id === 'inst-cao-preto-vivo');

    expect(totalidade).toMatchObject({
      nome: 'C\u00e3o Divino Totalidade',
      subcategoria: 'dez-sombras:totalidade',
      hpAtual: 17,
      hpMaximo: 35,
      defesa: 22,
      deslocamentoM: 12,
    });
    expect(viva).toMatchObject({
      version: 5,
      estado: 'ativa',
      hpAtual: 17,
      hpMaximoAtual: 35,
    });
    expect(useMapStore.getState().entities[tokenId]).toMatchObject({
      hp: 17,
      hpMax: 35,
      invocationDefense: 22,
      invocationMovementM: 12,
    });
    expect(derrotada).toMatchObject({
      estado: 'derrotada',
      hpAtual: -25,
      resolucaoDerrota: { resultado: 'perda_permanente', pvNaDerrota: -25 },
    });
  });

  it('caps an overfull live instance at 35 PV without healing it or using the stale catalog value', () => {
    const { caoBranco, caoPreto, tokenId } = prepararMesa(12, 40, 50);
    expect(exorcizarCaoBranco(caoBranco.id)).toEqual({ ok: true });

    const dono = pegarFicha('dono');
    expect(dono.invocacoesConhecidas?.find(modelo => modelo.id === caoPreto.id)?.hpAtual).toBe(35);
    expect(dono.instanciasInvocacao?.find(instancia => instancia.id === 'inst-cao-preto-vivo')).toMatchObject({
      version: 5,
      hpAtual: 35,
      hpMaximoAtual: 35,
    });
    expect(useMapStore.getState().entities[tokenId]).toMatchObject({ hp: 35, hpMax: 35 });
  });

  it('does not transform the surviving dog when the defeated dog is recovered instead of permanently exorcised', () => {
    const { caoBranco, caoPreto } = prepararMesa();
    expect(resolverDerrotaPendenteInvocacao('dono', caoBranco.id, { resultado: 'recuperada' }, {
      isMaster: true,
      profileId: 'perfil-mestre',
    })).toEqual({ ok: true });

    const dono = pegarFicha('dono');
    expect(dono.invocacoesConhecidas?.find(modelo => modelo.id === caoBranco.id)?.perdaPermanente).not.toBe(true);
    expect(dono.invocacoesConhecidas?.find(modelo => modelo.id === caoPreto.id)?.subcategoria).toBe('dez-sombras:cao-preto');
  });
});