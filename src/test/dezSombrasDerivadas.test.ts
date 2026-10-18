import { describe, expect, it } from 'vitest';
import { criarFormasDerivadasDezSombras } from '@/lib/controlador/dezSombrasDerivadas';

describe('Dez Sombras: formas derivadas importadas separadamente', () => {
  const forms = criarFormasDerivadasDezSombras('feiticeira');

  it('cria apenas Abismo e Agito como formas derivadas, sem preencher a décima vaga-base', () => {
    expect(forms.map(form => form.subcategoria)).toEqual([
      'dez-sombras:abismo-desconhecido-do-poco',
      'dez-sombras:agito',
    ]);
    expect(forms.every(form => form.formaDerivada && form.domado === false)).toBe(true);
    expect(forms.every(form => form.donoCharacterId === 'feiticeira')).toBe(true);
    expect(forms[0].referenciaRegra).toContain('pp. 64, 66');
    expect(forms[1].referenciaRegra).toContain('pp. 64, 68');
  });

  it('preserva o perfil publicado do Abismo e marca como parcial apenas Segurar com contagem do Mestre', () => {
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
    expect(abismo.acoes[0]).toMatchObject({
      statusAutomacao: 'parcial',
      tipoExecucao: 'manual',
      categoriaAcao: 'acao_simples',
      alcanceM: 9,
    });
    expect(abismo.acoes.slice(1).every(action =>
      action.statusAutomacao === 'manual' && action.tipoExecucao === 'manual',
    )).toBe(true);
    expect(abismo.acoes[0].descricaoRegra).toContain('+7 com dois');
    expect(abismo.acoes[0].descricaoRegra).toContain('Não inferir a contagem pelos PV.');
  });

  it('preserva Agito executável apenas onde a ficha publica os parâmetros necessários', () => {
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
    expect(agito.acoes[0]).toMatchObject({
      teste: 'ataque',
      bonusAtaque: 11,
      dano: '5d10+6',
      tipoDano: 'DCC',
      statusAutomacao: 'executavel',
    });
    expect(agito.acoes[1]).toMatchObject({
      tipo: 'suporte',
      categoriaAcao: 'acao_complexa',
      alcanceM: 4.5,
      formulaCura: '5d10+3',
      efeitoSuporte: { alvos: 'unico' },
      statusAutomacao: 'manual',
      tipoExecucao: 'manual',
    });
    expect(agito.acoes[1].descricaoRegra).toContain('custo');
    expect(agito.acoes[2]).toMatchObject({
      categoriaAcao: 'reacao',
      statusAutomacao: 'manual',
      tipoExecucao: 'manual',
    });
    expect(agito.acoes[2].descricaoRegra).toContain('Ao receber dano');
    expect(agito.acoes[2].descricaoRegra).toContain('5d10+3');
    expect(agito.acoes[2].descricaoRegra).toContain('múltiplas instâncias de dano');
  });
});
