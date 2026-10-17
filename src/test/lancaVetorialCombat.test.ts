import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createLancaCombatRecord,
  calcularCustoLanca,
  lancaAttackEffects,
  lancaDamageFormula,
  resolveLancaAttack,
} from '@/lib/lancaVetorial';
import { hasLancaReactionSuppression } from '@/lib/conditionEffects';
import { getReactionsAvailable } from '@/lib/reactionBudget';
import { buildAttackContext, rollAttack } from '@/lib/combatEngine';
import type { Character } from '@/types';
import type { Weapon } from '@/lib/weapons';

afterEach(() => vi.restoreAllMocks());

const mkAttacker = (over: Partial<Character> = {}): Character => ({
  id: 'lanca-wielder', name: 'Portador', category: 'JOGADOR', createdBy: 'PLAYER', level: 5,
  attributes: [{ name: 'FOR', value: 10 }, { name: 'DES', value: 10 }],
  meleeTrained: false, rangedTrained: false, trainingBonus: 0,
  skills: [], chosenTalents: [], chosenAuraAptitudes: [],
  ...over,
} as Character);

describe('Lança Vetorial Rubra — regras de marcas e ataques', () => {
  it('cobra Ação Comum e PE no momento da confirmação, usando PE temporário primeiro', () => {
    expect(calcularCustoLanca(1, 2, 5, 4)).toEqual({ ok: true, actionsCurrent: 0, tempPE: 0, peCurrent: 3 });
    expect(calcularCustoLanca(2, 3, 10, 10)).toEqual({ ok: true, actionsCurrent: 1, tempPE: 0, peCurrent: 3 });
    expect(calcularCustoLanca(0, 10, 10, 4)).toMatchObject({ ok: false, reason: 'Sem Ação Comum disponível.' });
    expect(calcularCustoLanca(1, 1, 2, 4)).toMatchObject({ ok: false, reason: 'PE insuficiente (3/4).' });
  });

  it('concede bônus pelos limiares e só habilita Fratura a partir de 2 marcas', () => {
    expect(lancaAttackEffects(0, true)).toEqual({ hitBonus: 0, defenseIgnore: 0, critRangeBonus: 0, fractureDice: 0 });
    expect(lancaAttackEffects(1, true)).toEqual({ hitBonus: 2, defenseIgnore: 0, critRangeBonus: 0, fractureDice: 0 });
    expect(lancaAttackEffects(2, true)).toEqual({ hitBonus: 2, defenseIgnore: 3, critRangeBonus: 0, fractureDice: 2 });
    expect(lancaAttackEffects(2, false).fractureDice).toBe(0);
    expect(lancaAttackEffects(3, true).critRangeBonus).toBe(1);
    expect(lancaAttackEffects(3, true, 'sentence').fractureDice).toBe(0);
  });

  it('adds uma marca no acerto, duas no crítico e limita a três', () => {
    const base = createLancaCombatRecord('w', 'i');
    const first = resolveLancaAttack(base, { targetId: 'A', mode: 'normal', hit: true, critical: false, fractureEligible: false });
    expect(first).toMatchObject({ targetId: 'A', marks: 1 });
    const critical = resolveLancaAttack(first, { targetId: 'A', mode: 'normal', hit: true, critical: true, fractureEligible: false });
    expect(critical).toMatchObject({ targetId: 'A', marks: 3 });
    expect(resolveLancaAttack(critical, { targetId: 'A', mode: 'normal', hit: true, critical: true, fractureEligible: false }).marks).toBe(3);
  });

  it('troca o alvo só em acerto; erro preserva marcas e acerto não transfere as antigas', () => {
    const marked = { ...createLancaCombatRecord('w', 'i'), targetId: 'A', marks: 2 };
    expect(resolveLancaAttack(marked, { targetId: 'B', mode: 'normal', hit: false, critical: false, fractureEligible: false })).toEqual(marked);
    expect(resolveLancaAttack(marked, { targetId: 'B', mode: 'normal', hit: true, critical: false, fractureEligible: false })).toMatchObject({ targetId: 'B', marks: 1 });
    expect(resolveLancaAttack(marked, { targetId: 'B', mode: 'normal', hit: true, critical: true, fractureEligible: false })).toMatchObject({ targetId: 'B', marks: 2 });
  });

  it('Avanço soma duas marcas até o limite e Sentença consome só quando acerta', () => {
    const marked = { ...createLancaCombatRecord('w', 'i'), targetId: 'A', marks: 2 };
    const advance = resolveLancaAttack(marked, { targetId: 'A', mode: 'advance', hit: true, critical: true, fractureEligible: false });
    expect(advance.marks).toBe(3);
    expect(resolveLancaAttack(marked, { targetId: 'A', mode: 'sentence', hit: false, critical: true, fractureEligible: false })).toEqual(marked);
    expect(resolveLancaAttack(marked, { targetId: 'A', mode: 'sentence', hit: true, critical: true, fractureEligible: false })).toMatchObject({ targetId: null, marks: 0 });
  });

  it('Fratura consome a carga apenas em acerto elegível e Sentença dobra a fórmula base sem Fratura', () => {
    const marked = { ...createLancaCombatRecord('w', 'i'), targetId: 'A', marks: 2 };
    expect(resolveLancaAttack(marked, { targetId: 'A', mode: 'normal', hit: false, critical: false, fractureEligible: true }).fractureAvailable).toBe(true);
    expect(resolveLancaAttack(marked, { targetId: 'A', mode: 'advance', hit: true, critical: false, fractureEligible: true }).fractureAvailable).toBe(false);
    expect(lancaDamageFormula('1d10', 'normal', 2)).toBe('1d10+2d8');
    expect(lancaDamageFormula('1d10', 'sentence', 2)).toBe('1d10+10d8');
    expect(lancaDamageFormula('1d10', 'sentence', 0)).toBe('1d10+10d8');
  });

  it('suprime a disponibilidade de Reações sem reduzir o saldo salvo', () => {
    const target = {
      reactionsCurrent: 1,
      reactionsMax: 1,
      activeConditions: [{ id: 'sentence', conditionId: 'lanca-vetorial-sem-reacoes', name: 'Reações suprimidas', icon: '⛔', remainingTurns: -1, remainingRounds: -1 }],
    };
    expect(hasLancaReactionSuppression(target)).toBe(true);
    expect(getReactionsAvailable(target)).toBe(0);
    expect(target.reactionsCurrent).toBe(1);
    expect(hasLancaReactionSuppression({ activeConditions: [] })).toBe(false);
  });

  it('engine aplica +2 no ataque, ignora 3 de Defesa e rola a Fratura no acerto', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.75); // 16 natural
    const weapon = {
      id: 'lanca-vetorial-rubra', name: 'Lança Vetorial Rubra', category: 'complexa', range: 'melee', group: 'Haste',
      damage: '1d10', omniDamageFormula: '1d10+2d8', damageType: 'Pf', omniDamageType: 'Pf', critRange: 19,
      properties: [], spaces: 3,
    } as unknown as Weapon;
    const ctx = buildAttackContext({
      attacker: mkAttacker(), weapon, targetDefense: 21 - 3,
      situation: { hitBonusExtra: 2, preferredAbility: 'FOR' },
    });
    const result = await rollAttack(ctx);
    expect(result.hit).toBe(true);
    expect(result.damageDice).toBe('1d10+2d8');
    expect(result.damageRolls).toHaveLength(3);
    vi.restoreAllMocks();
  });

  it('engine dobra dados-base e os 10d8 da Sentença em crítico, sem dobrar modificador fixo', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999); // 20 natural e máximos nos dados
    const weapon = {
      id: 'lanca-vetorial-rubra', name: 'Lança Vetorial Rubra', category: 'complexa', range: 'melee', group: 'Haste',
      damage: '1d10', omniDamageFormula: '1d10+10d8', damageType: 'Pf', omniDamageType: 'Pf', critRange: 18,
      properties: [], spaces: 3,
    } as unknown as Weapon;
    const result = await rollAttack(buildAttackContext({
      attacker: mkAttacker({ attributes: [{ id: 'for', name: 'FOR', value: 16 }, { id: 'des', name: 'DES', value: 10 }] }),
      weapon, targetDefense: 99,
      situation: { forceCritical: true, preferredAbility: 'FOR' },
    }));
    expect(result.critical).toBe(true);
    expect(result.criticalThreshold).toBe(18);
    expect(result.damageDice).toBe('2d10+20d8');
    expect(result.damageRolls).toHaveLength(22);
    expect(result.damageFlatBonus).toBe(3);
    expect(result.damageTotal).toBe(183);
    expect(result.damageType).toBe('Pf');
    vi.restoreAllMocks();
  });
});
