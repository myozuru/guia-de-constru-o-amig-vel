import { describe, expect, it } from "vitest";
import { mergeOwnedCharacterSlice } from "@/lib/combat/ownedCharacterSlice";

const current = [
  { id: "ficha-a", name: "A", hpCurrent: 10 },
  { id: "ficha-b", name: "B", hpCurrent: 12 },
];

describe("mergeOwnedCharacterSlice", () => {
  it("atualiza somente fichas ligadas à conta autenticada", () => {
    const result = mergeOwnedCharacterSlice({
      expectedRevision: 4,
      currentRevision: 4,
      current,
      proposed: [
        { id: "ficha-a", name: "A nova", hpCurrent: 8 },
        { id: "ficha-b", name: "B adulterada", hpCurrent: 0 },
      ],
      requesterIsMaster: false,
      ownedCharacterIds: new Set(["ficha-a"]),
    });

    expect(result).toEqual({
      ok: true,
      revision: 5,
      data: [
        { id: "ficha-a", name: "A nova", hpCurrent: 8 },
        current[1],
      ],
    });
  });

  it("permite ao Mestre adicionar, alterar e remover fichas", () => {
    const result = mergeOwnedCharacterSlice({
      expectedRevision: 4,
      currentRevision: 4,
      current,
      proposed: [{ id: "ficha-c", name: "C", hpCurrent: 15 }],
      requesterIsMaster: true,
      ownedCharacterIds: new Set(),
    });

    expect(result).toEqual({
      ok: true,
      revision: 5,
      data: [{ id: "ficha-c", name: "C", hpCurrent: 15 }],
    });
  });

  it("recusa revisão desatualizada, criação e remoção feitas por jogador", () => {
    const base = {
      current,
      requesterIsMaster: false,
      ownedCharacterIds: new Set(["ficha-a"]),
    };
    expect(mergeOwnedCharacterSlice({
      ...base,
      expectedRevision: 3,
      currentRevision: 4,
      proposed: current,
    })).toMatchObject({ ok: false, code: "stale" });
    expect(mergeOwnedCharacterSlice({
      ...base,
      expectedRevision: 4,
      currentRevision: 4,
      proposed: [...current, { id: "ficha-c", name: "C" }],
    })).toMatchObject({ ok: false, code: "forbidden" });
    expect(mergeOwnedCharacterSlice({
      ...base,
      expectedRevision: 4,
      currentRevision: 4,
      proposed: [current[0]],
    })).toMatchObject({ ok: false, code: "forbidden" });
  });

  it("recusa IDs duplicados ou snapshots que não sejam listas de fichas", () => {
    expect(mergeOwnedCharacterSlice({
      expectedRevision: 4,
      currentRevision: 4,
      current,
      proposed: [{ id: "ficha-a" }, { id: "ficha-a" }],
      requesterIsMaster: true,
      ownedCharacterIds: new Set(),
    })).toMatchObject({ ok: false, code: "invalid" });
    expect(mergeOwnedCharacterSlice({
      expectedRevision: 4,
      currentRevision: 4,
      current: {},
      proposed: [],
      requesterIsMaster: true,
      ownedCharacterIds: new Set(),
    })).toMatchObject({ ok: false, code: "invalid" });
  });
});
