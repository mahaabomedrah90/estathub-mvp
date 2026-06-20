import { prisma } from './prisma'

const _cache = new Map<string, { value: boolean; expiresAt: number }>()
const TTL_MS = 30_000

export function clearFeatureFlagCache(key?: string): void {
  if (key) _cache.delete(key)
  else _cache.clear()
}

/**
 * Read a boolean feature flag from the Settings table.
 * Result is cached for 30 seconds per key.
 * On DB error, returns `defaultValue` without caching so the next call retries.
 */
export async function getFeatureFlag(key: string, defaultValue: boolean): Promise<boolean> {
  const now = Date.now()
  const hit = _cache.get(key)
  if (hit && hit.expiresAt > now) return hit.value

  try {
    const row = await prisma.settings.findUnique({ where: { key } })
    const value = row ? row.value === 'true' : defaultValue
    _cache.set(key, { value, expiresAt: now + TTL_MS })
    return value
  } catch {
    return defaultValue
  }
}
