import { describe, expect, it } from "vitest";
import { calcularHorda, limiteHordasAtivas, validarLimiteHorda } from "@/lib/controlador/hordas";

describe("regras de Hordas", () => {
  it("arredonda para baixo o limite de Hordas ativas", () => {
    expect(limiteHordasAtivas(5)).toBe(2);
    expect(limiteHordasAtivas(4)).toBe(2);
    expect(limiteHordasAtivas(1)).toBe(0);
  });

  it("trata cada Horda como uma vaga única no limite de campo", () => {
    expect(validarLimiteHorda({
      limiteInvocacoesEmCampo: 4,
      hordasAtivas: 1,
      invocacoesIndividuaisAposCriacao: 2,
    })).toEqual({ ok: true });

    expect(validarLimiteHorda({
      limiteInvocacoesEmCampo: 4,
      hordasAtivas: 2,
      invocacoesIndividuaisAposCriacao: 1,
    })).toMatchObject({ ok: false, codigo: "limite_hordas" });
  });

  it("calcula PV compartilhados, custo adicional, tamanho, penalidade e tempo único", () => {
    const resultado = calcularHorda({
      id: "horda-1",
      nivelDono: 10,
      maximoInvocacoesEmCampo: 4,
      lider: { id: "lider", grau: "primeiro", pvAtual: 55, pvMaximo: 60, custoInvocacaoPE: 8 },
      membros: [
        { id: "membro-2", grau: "segundo", pvAtual: 30, pvMaximo: 40, custoInvocacaoPE: 6 },
        { id: "membro-4", grau: "quarto", pvAtual: 10, pvMaximo: 20, custoInvocacaoPE: 2 },
      ],
      tempoAdicional: { quantidade: 45, unidade: "segundos" },
    });

    expect(resultado).toMatchObject({
      ok: true,
      horda: {
        liderId: "lider",
        membrosIds: ["membro-2", "membro-4"],
        quantidadeMembros: 2,
        pvAtual: 75,
        pvMaximo: 90,
        custoInvocacaoPE: 12,
        tempoAdicional: { quantidade: 45, unidade: "segundos" },
        efeitos: {
          categoriasTamanhoAdicionais: 1,
          usosAntesPrejuizoMultiplo: 2,
          regraDeAlvo: {
            ocupaUmEspaco: true,
            contaComoUmAlvo: true,
            aoSerAtingidaPorArea: "fragilizada",
            alvoUnico: { rd: 10, rdNaoPodeSerNegada: true },
            atravessamento: { inimigosPodemOcupar: true, terrenoDificil: true, flanqueado: true },
          },
        },
      },
    });
  });

  it("preserva frações de PV ao adicionar metade dos membros", () => {
    const resultado = calcularHorda({
      id: "horda-fracionaria",
      nivelDono: 1,
      maximoInvocacoesEmCampo: 2,
      lider: { id: "lider", grau: "terceiro", pvAtual: 10, pvMaximo: 20, custoInvocacaoPE: 4 },
      membros: [{ id: "membro", grau: "quarto", pvAtual: 3, pvMaximo: 5, custoInvocacaoPE: 2 }],
      tempoAdicional: { quantidade: 1, unidade: "rodadas" },
    });

    expect(resultado).toMatchObject({ ok: true, horda: { pvAtual: 11.5, pvMaximo: 22.5 } });
  });

  it("recusa líder especial, membro de grau igual ou superior e membro duplicado", () => {
    const base = {
      id: "horda",
      nivelDono: 5,
      maximoInvocacoesEmCampo: 4,
      lider: { id: "lider", grau: "primeiro" as const, pvAtual: 20, pvMaximo: 20, custoInvocacaoPE: 8 },
      membros: [] as { id: string; grau: "quarto" | "terceiro" | "segundo" | "primeiro" | "especial"; pvAtual: number; pvMaximo: number; custoInvocacaoPE: number }[],
      tempoAdicional: { quantidade: 10, unidade: "segundos" },
    };

    expect(calcularHorda({ ...base, lider: { ...base.lider, grau: "especial" } })).toMatchObject({ ok: false, codigo: "grau_lider_invalido" });
    expect(calcularHorda({ ...base, membros: [{ id: "igual", grau: "primeiro", pvAtual: 10, pvMaximo: 10, custoInvocacaoPE: 8 }] })).toMatchObject({ ok: false, codigo: "grau_membro_invalido" });
    expect(calcularHorda({ ...base, membros: [{ id: "lider", grau: "quarto", pvAtual: 10, pvMaximo: 10, custoInvocacaoPE: 2 }] })).toMatchObject({ ok: false, codigo: "membro_duplicado" });
  });
});
