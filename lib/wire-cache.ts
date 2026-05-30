const cache = new Map<string, { savedAt: number; data: unknown }>();
const TTL = 2 * 60 * 60 * 1000;

export function getWireCache(query: string, wireSlug: string): unknown | null {
  const key = `${query.toLowerCase()}__${wireSlug}`;
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.savedAt > TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

export function setWireCache(
  query: string,
  wireSlug: string,
  data: unknown
): void {
  cache.set(`${query.toLowerCase()}__${wireSlug}`, {
    savedAt: Date.now(),
    data,
  });
}
