import Redis from 'ioredis'
import env from './environment'

export const NETWORK_METRICS_TTL = 1200
export const LB_METRICS_TTL = 60

if (!env('REDIS_ENDPOINT')) {
  console.log('---REDIS ENDPOINT MISSING---')
}

export const cache = new Redis(env('REDIS_ENDPOINT') as string)

export async function getResponseFromCache(key: string): Promise<unknown> {
  const cachedResponse = await cache.get(key)

  if (!cachedResponse) {
    console.log(`${key} NOT CACHED`)
    return null
  }
  console.log(`${key} SERVING CACHED RESPONSE`)
  return cachedResponse
}
