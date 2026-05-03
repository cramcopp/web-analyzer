type CacheEnv = {
  CACHE?: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  };
};

function getCache(env?: CacheEnv | Record<string, unknown> | null) {
  const cache = (env as CacheEnv | undefined)?.CACHE;
  return cache && typeof cache.get === 'function' && typeof cache.put === 'function' ? cache : null;
}

export function hasCloudflareCache(env?: CacheEnv | Record<string, unknown> | null) {
  return Boolean(getCache(env));
}

export async function getCacheJson<T>(env: CacheEnv | Record<string, unknown> | undefined, key: string) {
  const cache = getCache(env);
  if (!cache) return null;

  const value = await cache.get(key);
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function putCacheJson(
  env: CacheEnv | Record<string, unknown> | undefined,
  key: string,
  value: unknown,
  ttlSeconds: number
) {
  const cache = getCache(env);
  if (!cache) return false;

  await cache.put(key, JSON.stringify(value), { expirationTtl: ttlSeconds });
  return true;
}
