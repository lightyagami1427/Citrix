interface CacheEntry {
  response: string;
  sources: string[];
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const MAX_CACHE_SIZE = 100;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in ms

/**
 * Normalize a query string for cache key generation.
 */
function normalizeQuery(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Get a cached response for a query.
 */
export function getCachedResponse(
  query: string
): { response: string; sources: string[] } | null {
  const key = normalizeQuery(query);
  const entry = cache.get(key);

  if (!entry) return null;

  // Check if expired
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }

  return { response: entry.response, sources: entry.sources };
}

/**
 * Store a response in the cache.
 */
export function setCachedResponse(
  query: string,
  response: string,
  sources: string[]
): void {
  const key = normalizeQuery(query);

  // LRU eviction if cache is full
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) {
      cache.delete(oldestKey);
    }
  }

  cache.set(key, {
    response,
    sources,
    timestamp: Date.now(),
  });
}
