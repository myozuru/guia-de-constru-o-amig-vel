import type { Character } from '@/types';
import { hasLancaReactionSuppression } from '@/lib/conditionEffects';

/** Saldo atual de reações, com compatibilidade para fichas antigas sem saldo salvo. */
export function getReactionsAvailable(character: Pick<Character, 'reactionsCurrent' | 'reactionsMax'> & { activeConditions?: Character['activeConditions']; feridaInternaBloqueada?: boolean }): number {
  if (character.feridaInternaBloqueada || hasLancaReactionSuppression(character)) return 0;
  return Math.max(0, character.reactionsCurrent ?? character.reactionsMax ?? 1);
}
