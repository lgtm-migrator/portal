import Redis from 'ioredis'
import env from './environment'

export const TEN_MINUTES_CACHE_EXPIRATION_TIME = 600
export const FIVE_MINUTES_CACHE_EXPIRATION_TIME = 300

if (!env('REDIS_ENDPOINT')) {
  console.log('---REDIS NOT RUNNING---')
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
