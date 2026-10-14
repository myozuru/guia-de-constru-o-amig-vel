import "../invocacoes/invocations.css";
import { useState } from 'react';
import type { Character } from '@/types';
import { CriadorShikigami } from './CriadorShikigami';
import { ControladorInvocacoesSection } from './ControladorInvocacoesSection';

export function ControladorShikigamisAba({ character }: { character: Character }) {
  const [aba, setAba] = useState<'criar' | 'biblioteca'>('biblioteca');
  const [creatorOpened, setCreatorOpened] = useState(false);
  const [draftKey, setDraftKey] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const catalogo = character.invocacoesConhecidas ?? [];
  const fichaEdicao = editingId ? catalogo.find(inv => inv.id === editingId) : undefined;
  const editar = (id: string) => {
    setCreatorOpened(true);
    setDraftKey(key => key + 1);
    setEditingId(id);
    setAba('criar');
  };
  const voltarBiblioteca = () => {
    setCreatorOpened(false);
    setDraftKey(key => key + 1);
    setEditingId(null);
    setAba('biblioteca');
  };
  const novaFicha = () => { setEditingId(null); setDraftKey(key => key + 1); setCreatorOpened(true); setAba('criar'); };
  return <div onWheelCapture={event => { const target = event.target; if (target instanceof HTMLInputElement && target.type === 'number' && document.activeElement === target) target.blur(); }} className="invocations-workspace inv-workspace-inner space-y-3">
    <div role="navigation" aria-label="Shikigamis do Controlador" className="inv-topnav">
      <button type="button" aria-pressed={aba === 'criar'} onClick={() => { setCreatorOpened(true); setAba('criar'); }} className={`rounded px-3 py-2 text-sm ${aba === 'criar' ? 'bg-primary text-primary-foreground' : 'border border-border'}`}>Criar ou editar ficha</button>
      <button type="button" aria-pressed={aba === 'biblioteca'} onClick={() => setAba('biblioteca')} className={`rounded px-3 py-2 text-sm ${aba === 'biblioteca' ? 'bg-primary text-primary-foreground' : 'border border-border'}`}>Biblioteca e Invocações</button>
    </div>
    <div role="region" aria-label="Ficha de invocação" hidden={aba !== 'criar'}>
      {creatorOpened && <CriadorShikigami key={draftKey} character={character} initial={fichaEdicao} onSaved={voltarBiblioteca} onCancel={voltarBiblioteca} />}
    </div>
    <div role="region" aria-label="Biblioteca de invocações" hidden={aba !== 'biblioteca'}>
      <ControladorInvocacoesSection character={character} onEditFicha={editar} onCreateFicha={novaFicha} />
    </div>
  </div>;
}
