import { describe, it, expect } from 'vitest';
import pacote from '../../public/omni-presets/baculo-aetheris.json';

const ent = pacote.entidades[0];
const acao = (id: string) => ent.acoesAtivas.find((a) => a.id === id)!;

describe('preset Báculo Aetheris', () => {
  it('arma de duas mãos com 2d8 Impacto e crítico 19 ×2', () => {
    expect(ent.combatData.effects[0].formula).toBe('2d8');
    expect(ent.combatData.critRange).toBe(19);
    expect(ent.combatData.critMultiplier).toBe(2);
    expect(ent.tags).toContain('mao:2');
  });
  it('Plumas: 8 PE, até 3 alvos a 18 m', () => {
    const a = acao('aa-aetheris-plumas');
    expect([a.custoPE, a.max_alvos, a.alcanceM]).toEqual(['8', '3', 18]);
  });
  it('Reversão: reação de 7 PE a 9 m, 5d8 Sônico', () => {
    const a = acao('aa-aetheris-reversao');
    expect([a.acao, a.custoPE, a.alcanceM, a.dano]).toEqual(['reacao', '7', 9, '5d8']);
  });
  it('Trono: 9 PE, raio 3 m, metade no sucesso', () => {
    const a = acao('aa-aetheris-trono');
    expect([a.custoPE, a.area?.tamanho_m, a.metadeNoSucesso]).toEqual(['9', 3, true]);
  });
  it('Réquiem: 18 PE, raio 9 m a 24 m, 18d12', () => {
    const a = acao('aa-aetheris-requiem');
    expect([a.custoPE, a.alcanceM, a.area?.tamanho_m, a.dano]).toEqual(['18', 24, 9, '18d12']);
  });
  it('Ruptura: reação de 2 PE, 8d12 Sônico', () => {
    const a = acao('aa-aetheris-ruptura');
    expect([a.acao, a.custoPE, a.dano]).toEqual(['reacao', '2', '8d12']);
  });
});
