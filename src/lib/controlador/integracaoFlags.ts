/** Desativar uma funcionalidade nunca reabre execução sem confirmação. */
export const integracaoInvocacoes = {
  confirmacaoAutonomia: import.meta.env.VITE_INVOCACOES_CONFIRMACAO !== 'false',
  escalaHorda: import.meta.env.VITE_INVOCACOES_ESCALA_HORDA !== 'false',
  registrarPerdaHorda: import.meta.env.VITE_INVOCACOES_PERDA_HORDA !== 'false',
  resolverPerdaHorda: import.meta.env.VITE_INVOCACOES_REMOCAO_HORDA !== 'false',
};

/** Contadores locais, sem conteúdo de fichas e sem envio a serviços externos. */
export const metricasIntegracaoInvocacoes = {
  propostas: 0, aceites: 0, recusas: 0, cancelamentos: 0,
  execucoesSemConfirmacaoBloqueadas: 0, propostasInvalidas: 0,
  execucoesComConfirmacao: 0,
  perdasHordaPendentes: 0,
  efeitosSuporteReescalados: 0,
  perdasHordaResolvidas: 0, membrosHordaRemovidos: 0,
  escalas: { ataque: 0, cura: 0, defesa: 0, acerto: 0, dano_adicional: 0, reducao_dano: 0 },
};
