import "../invocacoes/invocations.css";
import { motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import type { Character } from '@/types';
import { CriadorShikigami } from './CriadorShikigami';
import { ControladorInvocacoesSection } from './ControladorInvocacoesSection';

export function ControladorShikigamisAba({ character }: { character: Character }) {
  const [aba, setAba] = useState<'criar' | 'biblioteca'>('biblioteca');
  const [creatorOpened, setCreatorOpened] = useState(false);
  const [closeAfterTransition, setCloseAfterTransition] = useState(false);
  const [draftKey, setDraftKey] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const reduceMotion = useReducedMotion() === true;
  const viewTransition = {
    height: { duration: reduceMotion ? 0.22 : 0.34, ease: [0.22, 1, 0.36, 1] as const },
    opacity: { duration: reduceMotion ? 0.18 : 0.24, ease: 'easeOut' as const },
    y: { duration: reduceMotion ? 0 : 0.28, ease: 'easeOut' as const },
  };
  const catalogo = character.invocacoesConhecidas ?? [];
  const fichaEdicao = editingId ? catalogo.find(inv => inv.id === editingId) : undefined;
  const editar = (id: string) => {
    setCloseAfterTransition(false);
    setCreatorOpened(true);
    setDraftKey(key => key + 1);
    setEditingId(id);
    setAba('criar');
  };
  const voltarBiblioteca = () => {
    setCloseAfterTransition(true);
    setAba('biblioteca');
  };
  const novaFicha = () => { setCloseAfterTransition(false); setEditingId(null); setDraftKey(key => key + 1); setCreatorOpened(true); setAba('criar'); };
  const finalizarFechamento = () => {
    if (!closeAfterTransition || aba === 'criar') return;
    setCreatorOpened(false);
    setCloseAfterTransition(false);
    setEditingId(null);
    setDraftKey(key => key + 1);
  };
  return <div onWheelCapture={event => { const target = event.target; if (target instanceof HTMLInputElement && target.type === 'number' && document.activeElement === target) target.blur(); }} className="invocations-workspace inv-workspace-inner space-y-3">
    <div role="navigation" aria-label="Shikigamis do Controlador" className="inv-topnav">
      <motion.button type="button" aria-pressed={aba === 'criar'} onClick={() => { setCloseAfterTransition(false); setCreatorOpened(true); setAba('criar'); }} whileTap={reduceMotion ? undefined : { scale: 0.985 }} className={`rounded px-3 py-2 text-sm ${aba === 'criar' ? 'bg-primary text-primary-foreground' : 'border border-border'}`}>Criar ou editar ficha</motion.button>
      <motion.button type="button" aria-pressed={aba === 'biblioteca'} onClick={() => setAba('biblioteca')} whileTap={reduceMotion ? undefined : { scale: 0.985 }} className={`rounded px-3 py-2 text-sm ${aba === 'biblioteca' ? 'bg-primary text-primary-foreground' : 'border border-border'}`}>Biblioteca e Invocações</motion.button>
    </div>
    <div className="inv-view-stack" data-active-view={aba}>
      <motion.div role="region" aria-label="Ficha de invocação" aria-hidden={aba !== 'criar'} inert={aba !== 'criar'} data-active={aba === 'criar'} className="inv-view-panel" initial={false}
        animate={{ height: aba === 'criar' && creatorOpened ? 'auto' : 0, opacity: aba === 'criar' && creatorOpened ? 1 : 0, y: reduceMotion || (aba === 'criar' && creatorOpened) ? 0 : -6 }}
        transition={viewTransition} onAnimationComplete={finalizarFechamento}>
        {creatorOpened && <CriadorShikigami key={draftKey} character={character} initial={fichaEdicao} onSaved={voltarBiblioteca} onCancel={voltarBiblioteca} />}
      </motion.div>
      <motion.div role="region" aria-label="Biblioteca de invocações" aria-hidden={aba !== 'biblioteca'} inert={aba !== 'biblioteca'} data-active={aba === 'biblioteca'} className="inv-view-panel" initial={false}
        animate={{ height: aba === 'biblioteca' ? 'auto' : 0, opacity: aba === 'biblioteca' ? 1 : 0, y: reduceMotion || aba === 'biblioteca' ? 0 : -6 }}
        transition={viewTransition}>
        <ControladorInvocacoesSection character={character} onEditFicha={editar} onCreateFicha={novaFicha} />
      </motion.div>
    </div>
  </div>;
}
