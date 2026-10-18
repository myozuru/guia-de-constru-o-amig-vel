import { toast } from 'sonner';
import { useProfileStore } from '@/stores/useProfileStore';
import { integracaoInvocacoes, metricasIntegracaoInvocacoes as metricas } from './integracaoFlags';

export interface PropostaAutonomia {
  requestId: string;
  profileId: string;
  donoId: string;
  instanciaId: string;
  modeloId: string;
  acaoId: string;
  alvos: string[];
  descricao: string;
}
export type AceiteAutonomia = object;
type Pendente = PropostaAutonomia & { concluir: (aceite?: AceiteAutonomia) => void };
export const propostasAutonomia = new Map<string, Pendente>();
const aceites = new WeakMap<AceiteAutonomia, PropostaAutonomia>();

useProfileStore.subscribe((atual, anterior) => {
  if (atual.activeProfileId === anterior.activeProfileId) return;
  for (const [id, proposta] of propostasAutonomia) {
    if (proposta.profileId === anterior.activeProfileId) cancelarPropostaAutonomia(id);
  }
});


/** Sem prazo automático e sem pausa do relógio: essas decisões permanecem abertas. */
export function solicitarConfirmacaoAutonomia(proposta: PropostaAutonomia): Promise<AceiteAutonomia | undefined> {
  if (!integracaoInvocacoes.confirmacaoAutonomia ||
      useProfileStore.getState().activeProfileId !== proposta.profileId ||
      propostasAutonomia.has(proposta.requestId)) return Promise.resolve(undefined);
  metricas.propostas++;
  return new Promise(resolve => {
    propostasAutonomia.set(proposta.requestId, { ...proposta, concluir: resolve });
    toast('Confirmar ação da invocação', {
      id: proposta.requestId, description: proposta.descricao, duration: Infinity,
      action: { label: 'Confirmar', onClick: () => responderPropostaAutonomia(proposta.requestId, true) },
      cancel: { label: 'Recusar', onClick: () => responderPropostaAutonomia(proposta.requestId, false) },
      onDismiss: () => cancelarPropostaAutonomia(proposta.requestId),
    });
  });
}

export function responderPropostaAutonomia(requestId: string, aceitar: boolean): boolean {
  const proposta = propostasAutonomia.get(requestId);
  if (!proposta || useProfileStore.getState().activeProfileId !== proposta.profileId) return false;
  propostasAutonomia.delete(requestId);
  toast.dismiss(requestId);
  if (aceitar === true) {
    const aceite = {};
    aceites.set(aceite, proposta);
    metricas.aceites++;
    proposta.concluir(aceite);
  } else {
    metricas.recusas++;
    proposta.concluir();
  }
  return true;
}

export function cancelarPropostaAutonomia(requestId: string): void {
  const proposta = propostasAutonomia.get(requestId);
  if (!proposta) return;
  propostasAutonomia.delete(requestId);
  toast.dismiss(requestId);
  metricas.cancelamentos++;
  proposta.concluir();
}

/** Aceite ligado à ação concreta, ao dono, à instância e aos alvos; uso único. */
export function consumirAceiteAutonomia(aceite: AceiteAutonomia | undefined, pedido: Omit<PropostaAutonomia, 'descricao'>): boolean {
  const autorizado = aceite && aceites.get(aceite);
  if (!integracaoInvocacoes.confirmacaoAutonomia || !autorizado || JSON.stringify([autorizado.requestId, autorizado.profileId, autorizado.donoId,
    autorizado.instanciaId, autorizado.modeloId, autorizado.acaoId, autorizado.alvos]) !==
    JSON.stringify([pedido.requestId, pedido.profileId, pedido.donoId, pedido.instanciaId,
      pedido.modeloId, pedido.acaoId, pedido.alvos]) || useProfileStore.getState().activeProfileId !== pedido.profileId) {
    metricas.execucoesSemConfirmacaoBloqueadas++;
    return false;
  }
  aceites.delete(aceite!);
  return true;
}
