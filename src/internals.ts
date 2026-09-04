import type { MapExplorerFeature } from "./index.js";

export const lineHitAreaPaneName = "mapExplorerLineHitArea";

export function supportsLineHitArea(feature: MapExplorerFeature, width: number | undefined) {
  return Number.isFinite(width) && (width ?? 0) > 0 &&
    (feature.geometry.type === "LineString" || feature.geometry.type === "MultiLineString");
}

export function getLineHitAreaPathOptions(width: number) {
  return {
    pane: lineHitAreaPaneName,
    stroke: true,
    color: "transparent",
    opacity: 0,
    weight: width,
    fill: false,
    fillOpacity: 0,
    interactive: true,
    className: "map-explorer__line-hit-area",
  } as const;
}

export function collectFeatureLayersInRenderOrder<TEntry, TLayer>(
  entries: Iterable<TEntry>,
  getHitLayer: (entry: TEntry) => TLayer | null,
  getVisibleLayer: (entry: TEntry) => TLayer,
) {
  const ordered: TLayer[] = [];
  const retainedEntries = [...entries];
  for (const entry of retainedEntries) {
    const hitLayer = getHitLayer(entry);
    if (hitLayer) ordered.push(hitLayer);
  }
  for (const entry of retainedEntries) ordered.push(getVisibleLayer(entry));
  return ordered;
}

export type MapSearchRecord = {
  id: string;
  type: string;
  haystack: string;
  representative: MapExplorerFeature;
};

export function sameMapFeatureIds(current: string[] | null, next: string[]) {
  return current !== null && current.length === next.length && current.every((id, index) => id === next[index]);
}

export function reconcileMapEntries<TFeature extends object, TEntry>(
  registry: Map<TFeature, TEntry>,
  features: TFeature[],
  create: (feature: TFeature) => TEntry,
  remove: (entry: TEntry) => void,
) {
  const active = new Set(features);
  for (const [feature, entry] of registry) {
    if (active.has(feature)) continue;
    remove(entry);
    registry.delete(feature);
  }
  for (const feature of features) {
    if (!registry.has(feature)) registry.set(feature, create(feature));
  }
}

export function uniqueEntriesByKey<TEntry, TKey>(
  entries: Iterable<TEntry>,
  getKey: (entry: TEntry) => TKey,
) {
  const unique: TEntry[] = [];
  const seen = new Set<TKey>();
  for (const entry of entries) {
    const key = getKey(entry);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(entry);
  }
  return unique;
}

export function reconcileKeyedEntries<TKey, TInput, TValue>(
  registry: Map<TKey, TValue>,
  inputs: TInput[],
  getKey: (input: TInput) => TKey,
  create: (input: TInput) => TValue,
  update: (value: TValue, input: TInput) => void,
  remove: (value: TValue) => void,
) {
  const desiredKeys = new Set(inputs.map(getKey));
  for (const [key, value] of registry) {
    if (desiredKeys.has(key)) continue;
    remove(value);
    registry.delete(key);
  }
  for (const input of inputs) {
    const key = getKey(input);
    if (registry.has(key)) update(registry.get(key) as TValue, input);
    else registry.set(key, create(input));
  }
}

export function collectVisibleFeatureIds(
  features: MapExplorerFeature[],
  intersects: (feature: MapExplorerFeature) => boolean,
) {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const feature of features) {
    const id = feature.properties.id;
    if (seen.has(id) || !intersects(feature)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

export function updateSelectedEntries<TEntry>(
  entries: Iterable<TEntry>,
  previousSelectedId: string | null,
  nextSelectedId: string | null,
  updateAll: boolean,
  getId: (entry: TEntry) => string,
  update: (entry: TEntry, selected: boolean) => void,
) {
  let count = 0;
  for (const entry of entries) {
    const id = getId(entry);
    if (!updateAll && id !== previousSelectedId && id !== nextSelectedId) continue;
    update(entry, id === nextSelectedId);
    count += 1;
  }
  return count;
}

export function buildMapSearchIndex(features: MapExplorerFeature[]) {
  const records = new Map<string, MapSearchRecord>();
  for (const feature of features) {
    const { id, label, type, typeLabel, searchText } = feature.properties;
    const text = `${label} ${typeLabel ?? type} ${searchText ?? ""}`.toLocaleLowerCase();
    const existing = records.get(id);
    if (existing) {
      if (!existing.haystack.includes(text)) existing.haystack += ` ${text}`;
    } else {
      records.set(id, { id, type, haystack: text, representative: feature });
    }
  }
  return [...records.values()];
}

export function filterMapSearchIndex(records: MapSearchRecord[], query: string, type = "all") {
  const needle = query.trim().toLocaleLowerCase();
  return records.filter((record) =>
    (type === "all" || record.type === type) && (!needle || record.haystack.includes(needle)),
  );
}
