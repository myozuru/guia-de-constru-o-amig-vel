import { describe, expect, it } from "vitest";
import { applyOwnedMapScenePositions, type MapSceneSnapshot } from "@/lib/combat/ownedMapScene";

const current: MapSceneSnapshot = {
  scenes: {
    cena: {
      id: "cena",
      walls: [{ id: "parede", x: 1 }],
      entities: {
        jogador: { id: "jogador", characterId: "ficha-a", x: 10, y: 20, locked: false, label: "A" },
        invocacao: { id: "invocacao", ownerCharId: "ficha-a", x: 30, y: 40, locked: false, invocationState: "ativa" },
        alheio: { id: "alheio", characterId: "ficha-b", x: 50, y: 60, locked: false },
        bloqueado: { id: "bloqueado", characterId: "ficha-a", x: 70, y: 80, locked: true },
      },
    },
  },
  sceneOrder: ["cena"],
  activeSceneId: "cena",
  layerVisible: { tokens: true },
};

describe("applyOwnedMapScenePositions", () => {
  it("move apenas tokens existentes ligados às fichas da conta", () => {
    const proposed = structuredClone(current);
    proposed.scenes.cena.entities!.jogador.x = 11;
    proposed.scenes.cena.entities!.jogador.y = 21;
    proposed.scenes.cena.entities!.invocacao.x = 31;
    proposed.scenes.cena.entities!.alheio.x = 999;
    proposed.scenes.cena.entities!.bloqueado.y = 999;
    proposed.scenes.cena.entities!.jogador.label = "adulterada";
    proposed.scenes.cena.walls = [];
    proposed.sceneOrder = [];

    const result = applyOwnedMapScenePositions({
      current,
      proposed,
      ownedCharacterIds: new Set(["ficha-a"]),
    });

    expect(result).toMatchObject({ ok: true, changedEntityIds: ["jogador", "invocacao"] });
    if (!result.ok) return;
    expect(result.data.scenes.cena.entities!.jogador).toEqual({
      ...current.scenes.cena.entities!.jogador,
      x: 11,
      y: 21,
    });
    expect(result.data.scenes.cena.entities!.invocacao).toMatchObject({ x: 31, y: 40, invocationState: "ativa" });
    expect(result.data.scenes.cena.entities!.alheio).toEqual(current.scenes.cena.entities!.alheio);
    expect(result.data.scenes.cena.entities!.bloqueado).toEqual(current.scenes.cena.entities!.bloqueado);
    expect(result.data.scenes.cena.walls).toEqual(current.scenes.cena.walls);
    expect(result.data.sceneOrder).toEqual(current.sceneOrder);
  });

  it("não cria nem remove cenas ou tokens a partir do snapshot do jogador", () => {
    const proposed = structuredClone(current);
    delete proposed.scenes.cena.entities!.alheio;
    proposed.scenes.cena.entities!.novo = { id: "novo", characterId: "ficha-a", x: 0, y: 0 };
    proposed.scenes.nova = { id: "nova", entities: {} };

    const result = applyOwnedMapScenePositions({ current, proposed, ownedCharacterIds: new Set(["ficha-a"]) });

    expect(result).toMatchObject({ ok: true, changedEntityIds: [] });
    if (!result.ok) return;
    expect(result.data).toEqual(current);
  });

  it("permite ao mestre publicar a cena completa", () => {
    const proposed = structuredClone(current);
    proposed.scenes.cena.entities!.alheio.x = 55;
    proposed.scenes.nova = { id: "nova", entities: {} };
    const result = applyOwnedMapScenePositions({
      current,
      proposed,
      ownedCharacterIds: new Set(),
      requesterIsMaster: true,
    });
    expect(result).toMatchObject({ ok: true, data: proposed });
  });

  it("recusa posições sem valor numérico finito ou fora dos limites", () => {
    const proposed = structuredClone(current);
    proposed.scenes.cena.entities!.jogador.x = Number.POSITIVE_INFINITY;
    expect(applyOwnedMapScenePositions({
      current,
      proposed,
      ownedCharacterIds: new Set(["ficha-a"]),
    })).toMatchObject({ ok: false, code: "invalid" });
  });
});
