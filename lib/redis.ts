import { Redis } from 'ioredis';

let instance: Redis | null = null;

export function redis(): Redis {
  if (!instance) {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error('REDIS_URL is not set');
    instance = new Redis(url, { maxRetriesPerRequest: null, lazyConnect: false });
  }
  return instance;
}
