export type CharacterSnapshot = Record<string, unknown> & { id: string };

export type OwnedCharacterSliceResult =
  | { ok: true; data: CharacterSnapshot[]; revision: number }
  | { ok: false; code: "invalid" | "stale" | "forbidden"; reason: string };

function parseCharacters(value: unknown): CharacterSnapshot[] | null {
  if (!Array.isArray(value)) return null;
  const ids = new Set<string>();
  const characters: CharacterSnapshot[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const id = (item as Record<string, unknown>).id;
    if (typeof id !== "string" || !id.trim() || id.length > 128 || ids.has(id)) return null;
    ids.add(id);
    characters.push(item as CharacterSnapshot);
  }
  return characters;
}

/**
 * Deterministic counterpart of write_owned_characters_slice(). The database
 * RPC remains authoritative; this pure rule is also used by offline tests.
 */
export function mergeOwnedCharacterSlice(input: {
  expectedRevision: number;
  currentRevision: number;
  current: unknown;
  proposed: unknown;
  requesterIsMaster: boolean;
  ownedCharacterIds: ReadonlySet<string>;
}): OwnedCharacterSliceResult {
  if (!Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0 ||
      !Number.isSafeInteger(input.currentRevision) || input.currentRevision < 0) {
    return { ok: false, code: "invalid", reason: "A revisão precisa ser um inteiro não negativo." };
  }
  if (input.expectedRevision !== input.currentRevision) {
    return { ok: false, code: "stale", reason: "A fatia mudou; carregue a revisão mais recente e tente novamente." };
  }
  const current = parseCharacters(input.current);
  const proposed = parseCharacters(input.proposed);
  if (!current || !proposed) {
    return { ok: false, code: "invalid", reason: "A fatia precisa conter fichas com IDs únicos." };
  }
  if (input.requesterIsMaster) return { ok: true, data: proposed, revision: input.currentRevision + 1 };

  const currentById = new Map(current.map((character) => [character.id, character]));
  const proposedById = new Map(proposed.map((character) => [character.id, character]));
  if (currentById.size !== proposedById.size || [...currentById.keys()].some((id) => !proposedById.has(id))) {
    return {
      ok: false,
      code: "forbidden",
      reason: "Jogadores não podem criar ou remover fichas pela fatia compartilhada.",
    };
  }

  const data = current.map((character) =>
    input.ownedCharacterIds.has(character.id) ? proposedById.get(character.id)! : character,
  );
  return { ok: true, data, revision: input.currentRevision + 1 };
}
