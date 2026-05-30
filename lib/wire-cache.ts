import fs from "fs";
import path from "path";

const CACHE_DIR = path.join(process.cwd(), ".cache", "wire");
const TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

interface CacheEntry {
  savedAt: number;
  data: unknown;
}

function cachePath(key: string): string {
  const safe = key.replace(/[^a-zA-Z0-9._-]/g, "_");
  return path.join(CACHE_DIR, `${safe}.json`);
}

export function getWireCache(query: string, wireSlug: string): unknown | null {
  try {
    const file = cachePath(`${query.toLowerCase()}__${wireSlug}`);
    if (!fs.existsSync(file)) return null;
    const entry = JSON.parse(fs.readFileSync(file, "utf-8")) as CacheEntry;
    if (Date.now() - entry.savedAt > TTL_MS) {
      fs.unlinkSync(file);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function setWireCache(
  query: string,
  wireSlug: string,
  data: unknown
): void {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    const entry: CacheEntry = { savedAt: Date.now(), data };
    fs.writeFileSync(
      cachePath(`${query.toLowerCase()}__${wireSlug}`),
      JSON.stringify(entry)
    );
  } catch {
    /* cache write is best-effort */
  }
}
