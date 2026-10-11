import { describe, expect, it } from 'vitest';
import { InstanciaInvocacaoSchema } from '@/lib/invocacoes/schema';
import { resolverDerrotaManualInvocacao } from '@/lib/controlador/estadoInvocacao';

function derrotada() {
  return InstanciaInvocacaoSchema.parse({
    schemaVersion: 1,
    version: 2,
    id: 'instancia-1',
    modeloId: 'shiki-1',
    donoCharacterId: 'personagem-1',
    donoProfileId: 'perfil-dono',
    tokenId: 'token-1',
    estado: 'derrotada',
    hpAtual: -12,
    hpMaximoAtual: 12,
  });
}

describe('resolução manual de derrota de invocação', () => {
  it('permite apenas o Mestre', () => {
    expect(resolverDerrotaManualInvocacao(derrotada(), { resultado: 'perda_permanente' }, {
      isMaster: false, profileId: 'outro-perfil', ownerProfileId: 'perfil-dono',
    })).toMatchObject({ ok: false });

    expect(resolverDerrotaManualInvocacao(derrotada(), { resultado: 'perda_permanente' }, {
      isMaster: false, profileId: 'perfil-dono', ownerProfileId: 'perfil-dono',
    })).toMatchObject({ ok: false, motivo: 'Somente o Mestre pode resolver a derrota de uma invocação.' });

    expect(resolverDerrotaManualInvocacao(derrotada(), { resultado: 'perda_permanente' }, {
      isMaster: true, profileId: 'perfil-mestre', ownerProfileId: 'perfil-dono',
    })).toMatchObject({ ok: true });
  });

  it('registra recuperação pelo Mestre com 0 PV até descanso longo e mantém a derrota no histórico', () => {
    const resultado = resolverDerrotaManualInvocacao(derrotada(), {
      resultado: 'recuperada',
    }, { isMaster: true, profileId: 'perfil-mestre', ownerProfileId: 'perfil-dono' });

    expect(resultado).toMatchObject({
      ok: true,
      pvCatalogo: 0,
      perdaPermanente: false,
      instancia: {
        estado: 'dissipada',
        hpAtual: 0,
        resolucaoDerrota: { resultado: 'recuperada', pvNaDerrota: -12, resolvidaPorProfileId: 'perfil-mestre' },
      },
    });
  });

  it('não permite declarar perda permanente antes do limiar de −100% dos PV máximos', () => {
    const acimaDoLimiar = { ...derrotada(), hpAtual: -11 };
    expect(resolverDerrotaManualInvocacao(derrotada(), {
      resultado: 'recuperada',
    }, { isMaster: false, profileId: 'perfil-dono' })).toMatchObject({ ok: false });
    expect(resolverDerrotaManualInvocacao(acimaDoLimiar, {
      resultado: 'perda_permanente',
    }, { isMaster: true })).toMatchObject({ ok: false, motivo: 'A perda permanente só pode ser declarada ao atingir −100% dos PV máximos.' });
  });

  it('arquiva a perda permanente sem apagar a ficha nem reescrever a derrota', () => {
    const resultado = resolverDerrotaManualInvocacao(derrotada(), { resultado: 'perda_permanente' }, {
      isMaster: true, profileId: 'perfil-mestre', ownerProfileId: 'perfil-dono',
    });

    expect(resultado).toMatchObject({
      ok: true,
      pvCatalogo: 0,
      perdaPermanente: true,
      instancia: {
        estado: 'derrotada',
        hpAtual: -12,
        resolucaoDerrota: { resultado: 'perda_permanente', pvNaDerrota: -12, resolvidaPorProfileId: 'perfil-mestre' },
      },
    });
  });

  it('não permite resolver novamente uma instância já resolvida', () => {
    const recuperada = resolverDerrotaManualInvocacao(derrotada(), {
      resultado: 'recuperada',
    }, { isMaster: true });
    expect(recuperada.ok && resolverDerrotaManualInvocacao(recuperada.instancia, {
      resultado: 'perda_permanente',
    }, { isMaster: true })).toMatchObject({ ok: false });
  });
});
