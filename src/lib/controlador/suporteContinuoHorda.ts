import { useCharacterStore } from '@/stores/useCharacterStore';
import { useMapStore } from '@/stores/useMapStore';
import { useCombatStore } from '@/stores/useCombatStore';
import { InstanciaInvocacaoSchema, type OrigemSuporteHorda } from '@/lib/invocacoes/schema';
import { calcularEscalaHorda, calcularPrejuizoRepeticaoHorda, calcularTamanhoEfetivoHorda } from './hordas';
import { calcularEfeitoSuporte } from './suporte';
import { integracaoInvocacoes, metricasIntegracaoInvocacoes } from './integracaoFlags';

let sincronizando = false;

/** Recalcula da base imutável concedida; não modifica duração, consumo ou PV. */
function resolverOrigem(origem: OrigemSuporteHorda | undefined) {
  if (!origem) return;
  const dono = useCharacterStore.getState().characters.find(c => c.id === origem.donoId);
  const instancia = dono?.instanciasInvocacao?.find(i => i.id === origem.instanciaId);
  if (!instancia?.composicaoHorda) return;
  const membros = integracaoInvocacoes.escalaHorda ? instancia.composicaoHorda.membros : [];
  const calculado = calcularEfeitoSuporte({ grau: origem.grau }, {
    categoriaAcao: origem.categoriaAcao, efeitoSuporte: origem.config,
  }, calcularPrejuizoRepeticaoHorda(origem.usosAnteriores, membros), calcularEscalaHorda(membros));
  if (!calculado.ok || calculado.efeito.tipo === 'cura') return;
  return calculado.efeito;
}

/** Observa entradas/saídas na composição sem alterar a transição de perda de membros. */
export function sincronizarSuporteContinuoHorda(): void {
  if (sincronizando) return;
  sincronizando = true;
  try {
    const rodada = useCombatStore.getState().round ?? 1;
    for (const snapshot of useCharacterStore.getState().characters) {
      const personagem = useCharacterStore.getState().characters.find(c => c.id === snapshot.id)!;
      let alterouBuffs = false;
      const activeBuffs = (personagem.activeBuffs ?? []).map(buff => {
        if (buff.expiraNaRodada !== undefined && buff.expiraNaRodada <= rodada) return buff;
        const efeito = resolverOrigem(buff.suporteHorda);
        if (!efeito) return buff;
        const atual = efeito.tipo === 'dano_adicional'
          ? { ...buff, extraDamageFormula: efeito.formula }
          : { ...buff, value: efeito.valor };
        if (JSON.stringify(atual) === JSON.stringify(buff)) return buff;
        alterouBuffs = true;
        metricasIntegracaoInvocacoes.efeitosSuporteReescalados++;
        return atual;
      });
      let alterouInstancias = false;
      const instanciasInvocacao = (personagem.instanciasInvocacao ?? []).map(instancia => {
        let alterou = false;
        const efeitosSuporteAtivos = instancia.efeitosSuporteAtivos?.map(ativo => {
          if (ativo.expiraNaRodada <= rodada) return ativo;
          const efeito = resolverOrigem(ativo.suporteHorda);
          if (!efeito) return ativo;
          const atual = efeito.tipo === 'dano_adicional' ? { ...ativo, formula: efeito.formula } : { ...ativo, valor: efeito.valor };
          if (JSON.stringify(atual) === JSON.stringify(ativo)) return ativo;
          alterou = true;
          metricasIntegracaoInvocacoes.efeitosSuporteReescalados++;
          return atual;
        });
        if (!alterou) return instancia;
        alterouInstancias = true;
        return InstanciaInvocacaoSchema.parse({ ...instancia, version: instancia.version + 1, efeitosSuporteAtivos });
      });
      if (alterouBuffs || alterouInstancias) useCharacterStore.getState().updateCharacter(personagem.id, {
        ...(alterouBuffs ? { activeBuffs } : {}), ...(alterouInstancias ? { instanciasInvocacao } : {}),
      });
      for (const instancia of instanciasInvocacao) {
        if (!instancia.composicaoHorda && !instancia.efeitosSuporteAtivos?.some(e => e.suporteHorda)) continue;
        const modelo = personagem.invocacoesConhecidas?.find(m => m.id === instancia.modeloId);
        const token = useMapStore.getState().entities[instancia.tokenId];
        if (!modelo || !token) continue;
        const bonusDefesa = (instancia.efeitosSuporteAtivos ?? [])
          .filter(e => e.tipo === 'defesa' && e.expiraNaRodada > rodada).reduce((s, e) => s + e.valor, 0);
        const tamanho = calcularTamanhoEfetivoHorda(modelo.tamanho ?? modelo.porte,
          integracaoInvocacoes.escalaHorda ? instancia.composicaoHorda?.membros ?? [] : []);
        if (token.invocationDefense !== modelo.defesa + bonusDefesa || token.invocationEffectiveSize !== tamanho.tamanho ||
            token.invocationEffectiveSizeCategory !== tamanho.categoria) {
          useMapStore.getState().updateEntity(token.id, { invocationDefense: modelo.defesa + bonusDefesa,
            invocationEffectiveSize: tamanho.tamanho, invocationEffectiveSizeCategory: tamanho.categoria });
        }
      }
    }
  } finally { sincronizando = false; }
}

useCharacterStore.subscribe((atual, anterior) => {
  if (atual.characters !== anterior.characters) sincronizarSuporteContinuoHorda();
});
useMapStore.subscribe((atual, anterior) => {
  if (atual.entities === anterior.entities) return;
  if (Object.values(atual.entities).some(token => token.invocationInstanceId &&
      token.invocationInstanceId !== anterior.entities[token.id]?.invocationInstanceId)) sincronizarSuporteContinuoHorda();
});
