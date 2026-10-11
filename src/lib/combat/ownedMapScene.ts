export type MapEntitySnapshot = Record<string, unknown> & { id: string };
export type MapSceneSnapshot = Record<string, unknown> & {
  scenes: Record<string, Record<string, unknown> & { entities?: Record<string, MapEntitySnapshot> }>;
  sceneOrder: string[];
  activeSceneId: string;
  layerVisible: Record<string, unknown>;
};

export type OwnedMapSceneResult =
  | { ok: true; data: MapSceneSnapshot; changedEntityIds: string[] }
  | { ok: false; code: "invalid"; reason: string };

function parseMapScene(value: unknown): MapSceneSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const map = value as Record<string, unknown>;
  if (!map.scenes || typeof map.scenes !== "object" || Array.isArray(map.scenes) ||
      !Array.isArray(map.sceneOrder) || map.sceneOrder.some((id) => typeof id !== "string") ||
      typeof map.activeSceneId !== "string" ||
      !map.layerVisible || typeof map.layerVisible !== "object" || Array.isArray(map.layerVisible)) return null;

  const scenes = map.scenes as Record<string, unknown>;
  for (const [sceneId, rawScene] of Object.entries(scenes)) {
    if (!sceneId || sceneId.length > 128 || !rawScene || typeof rawScene !== "object" || Array.isArray(rawScene)) return null;
    const entities = (rawScene as Record<string, unknown>).entities;
    if (entities === undefined) continue;
    if (!entities || typeof entities !== "object" || Array.isArray(entities)) return null;
    for (const [entityId, rawEntity] of Object.entries(entities as Record<string, unknown>)) {
      if (!entityId || entityId.length > 128 || !rawEntity || typeof rawEntity !== "object" || Array.isArray(rawEntity)) return null;
      if ((rawEntity as Record<string, unknown>).id !== entityId) return null;
    }
  }
  return value as MapSceneSnapshot;
}

/**
 * Offline contract for write_owned_map_scene(): a player can move only an
 * existing, unlocked token whose character is linked to that account. The
 * database RPC remains authoritative and also validates the authenticated UUID.
 */
export function applyOwnedMapScenePositions(input: {
  current: unknown;
  proposed: unknown;
  ownedCharacterIds: ReadonlySet<string>;
  requesterIsMaster?: boolean;
}): OwnedMapSceneResult {
  const current = parseMapScene(input.current);
  const proposed = parseMapScene(input.proposed);
  if (!current || !proposed) {
    return { ok: false, code: "invalid", reason: "O mapa precisa conter cenas e entidades válidas." };
  }
  if (input.requesterIsMaster) return { ok: true, data: proposed, changedEntityIds: [] };

  const data = structuredClone(current);
  const changedEntityIds: string[] = [];
  for (const [sceneId, scene] of Object.entries(current.scenes)) {
    const currentEntities = scene.entities ?? {};
    const proposedEntities = proposed.scenes[sceneId]?.entities ?? {};
    for (const [entityId, entity] of Object.entries(currentEntities)) {
      if (entity.locked === true) continue;
      const ownerCharacterId = typeof entity.ownerCharId === "string" && entity.ownerCharId
        ? entity.ownerCharId
        : typeof entity.characterId === "string" ? entity.characterId : null;
      if (!ownerCharacterId || !input.ownedCharacterIds.has(ownerCharacterId)) continue;

      const candidate = proposedEntities[entityId];
      if (!candidate) continue;
      const { x, y } = candidate;
      if (typeof x !== "number" || !Number.isFinite(x) || Math.abs(x) > 10_000_000 ||
          typeof y !== "number" || !Number.isFinite(y) || Math.abs(y) > 10_000_000) {
        return { ok: false, code: "invalid", reason: "A posição do token precisa ser finita e estar dentro dos limites do mapa." };
      }
      if (x === entity.x && y === entity.y) continue;
      data.scenes[sceneId].entities![entityId] = { ...entity, x, y };
      changedEntityIds.push(entityId);
    }
  }

  return { ok: true, data, changedEntityIds };
}

