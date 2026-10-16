import { describe, expect, it } from 'vitest';
import { criarFormasDerivadasDezSombras } from '@/lib/controlador/dezSombrasDerivadas';

describe('Dez Sombras: formas derivadas importadas separadamente', () => {
  const forms = criarFormasDerivadasDezSombras('feiticeira');

  it('cria apenas Abismo e Agito como formas derivadas bloqueadas, sem preencher a décima vaga-base', () => {
    expect(forms.map(form => form.subcategoria)).toEqual([
      'dez-sombras:abismo-desconhecido-do-poco',
      'dez-sombras:agito',
    ]);
    expect(forms.every(form => form.formaDerivada && form.domado === false)).toBe(true);
    expect(forms.every(form => form.donoCharacterId === 'feiticeira')).toBe(true);
    expect(forms[0].referenciaRegra).toContain('pp. 64, 66');
    expect(forms[1].referenciaRegra).toContain('pp. 64, 68');
  });

  it('preserva perfil e incertezas publicadas do Abismo, com porte provisório', () => {
    const abismo = forms[0];
    expect(abismo).toMatchObject({
      grau: 'quarto',
      custoInvocacaoPE: 6,
      hpAtual: 50,
      hpMaximo: 50,
      defesa: 21,
      deslocamentoM: 10.5,
      porte: 'Médio',
      valoresProvisoriosFormaDerivada: ['porte', 'atributos'],
      requisitosFormaDerivada: ['Nue domado', 'Sapo domado', 'Especialização Quimera'],
    });
    expect(abismo.lacunasFormaDerivada?.join(' ').toLowerCase()).toContain('porte e atributos');
    expect(abismo.acoes.map(action => action.nome)).toEqual(['Segurar', 'Fora de Risco', 'Alado', 'Grupo (3 sapos)']);
    expect(abismo.acoes.every(action => action.statusAutomacao === 'manual' && action.tipoExecucao === 'manual')).toBe(true);
  });

  it('preserva o perfil de Agito e mantém todas as ações incompletas manuais', () => {
    const agito = forms[1];
    expect(agito).toMatchObject({
      grau: 'segundo',
      custoInvocacaoPE: 7,
      hpAtual: 120,
      hpMaximo: 120,
      defesa: 27,
      deslocamentoM: 18,
      porte: 'Grande',
      requisitosFormaDerivada: [
        'Nue como forma-base',
        'Heranças de Grande Serpente, Tigre Fúnebre e Cervo Circular',
      ],
    });
    expect(agito.opcionalHomebrew).toBe(false);
    expect(agito.lacunasFormaDerivada?.join(' ')).toContain('Tigre Fúnebre');
    expect(agito.acoes.map(action => action.nome)).toEqual([
      'Golpes Eletrificados',
      'Cura Concentrada',
      'Regeneração Superior',
    ]);
    expect(agito.acoes[0]).toMatchObject({ teste: 'ataque', bonusAtaque: 11, dano: '5d10+6', tipoDano: 'DCC' });
    expect(agito.acoes[1].formulaCura).toBe('5d10+3');
    expect(agito.acoes.every(action => action.statusAutomacao === 'manual' && action.tipoExecucao === 'manual')).toBe(true);
  });
});
