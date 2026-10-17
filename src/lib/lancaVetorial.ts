export type LancaAttackMode = 'normal' | 'advance' | 'sentence';

export interface LancaCombatRecord {
  wielderId: string;
  weaponInstanceId: string;
  targetId: string | null;
  marks: number;
  fractureAvailable: boolean;
}

export interface LancaAttackEffects {
  hitBonus: number;
  defenseIgnore: number;
  critRangeBonus: number;
  fractureDice: number;
}

export interface LancaAttackOutcome {
  targetId: string;
  mode: LancaAttackMode;
  hit: boolean;
  critical: boolean;
  fractureEligible: boolean;
}

export type LancaCostResult =
  | { ok: true; actionsCurrent: number; tempPE: number; peCurrent: number }
  | { ok: false; reason: string };

/** The action and PE are charged together at the explicit confirmation point. */
export function calcularCustoLanca(
  actionsCurrent: number | undefined,
  tempPE: number | undefined,
  peCurrent: number | undefined,
  cost: number,
): LancaCostResult {
  const actions = actionsCurrent ?? 1;
  const temporary = Math.max(0, tempPE ?? 0);
  const normal = Math.max(0, peCurrent ?? 0);
  if (actions < 1) return { ok: false, reason: 'Sem Ação Comum disponível.' };
  if (temporary + normal < cost) return { ok: false, reason: `PE insuficiente (${temporary + normal}/${cost}).` };
  const fromTemporary = Math.min(temporary, cost);
  return {
    ok: true,
    actionsCurrent: Math.max(0, actions - 1),
    tempPE: temporary - fromTemporary,
    peCurrent: Math.max(0, normal - (cost - fromTemporary)),
  };
}

export function lancaInstanceKey(wielderId: string, weaponInstanceId?: string | null, weaponName = 'Lança Vetorial Rubra'): string {
  return `${wielderId}:${weaponInstanceId || weaponName}`;
}

export function createLancaCombatRecord(wielderId: string, weaponInstanceId: string): LancaCombatRecord {
  return { wielderId, weaponInstanceId, targetId: null, marks: 0, fractureAvailable: true };
}

export function lancaAttackEffects(marks: number, fractureAvailable: boolean, mode: LancaAttackMode = 'normal'): LancaAttackEffects {
  const count = Math.max(0, Math.min(3, Math.floor(marks)));
  return {
    hitBonus: count >= 1 ? 2 : 0,
    defenseIgnore: count >= 2 ? 3 : 0,
    critRangeBonus: count >= 3 ? 1 : 0,
    fractureDice: count >= 2 && fractureAvailable && mode !== 'sentence' ? 2 : 0,
  };
}

/** Resolve marks after the final hit/miss is known. A miss never changes the mark record. */
export function resolveLancaAttack(record: LancaCombatRecord, outcome: LancaAttackOutcome): LancaCombatRecord {
  if (!outcome.hit) return record;
  if (outcome.mode === 'sentence') {
    return { ...record, targetId: null, marks: 0 };
  }

  const current = record.targetId === outcome.targetId ? record.marks : 0;
  const next = outcome.mode === 'advance'
    ? Math.min(3, current + 2)
    : Math.min(3, current + (outcome.critical ? 2 : 1));
  return {
    ...record,
    targetId: next > 0 ? outcome.targetId : null,
    marks: next,
    fractureAvailable: record.fractureAvailable && !outcome.fractureEligible,
  };
}

export function lancaDamageFormula(baseFormula: string, mode: LancaAttackMode, fractureDice: number): string {
  const base = baseFormula.trim() || '1d10';
  const extra = mode === 'sentence' ? 10 : Math.max(0, Math.floor(fractureDice));
  return extra > 0 ? `${base}+${extra}d8` : base;
}
