// Per-IP rate limiting using Vercel KV (Redis).
//
// Fails OPEN if KV isn't configured — so the app keeps serving requests
// even before the database is connected. Once KV env vars (KV_REST_API_URL
// and KV_REST_API_TOKEN) are present, rate limiting activates automatically.
//
// Usage in an endpoint:
//   import { checkRateLimit, rateLimitResponse } from './_rateLimit.js';
//   const rl = await checkRateLimit(req, 'render', { limit: 5, windowSec: 3600 });
//   if (!rl.allowed) return rateLimitResponse(res, rl);

import { kv } from '@vercel/kv';

function clientIp(req) {
  // Vercel sets x-forwarded-for; first IP is the real client
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string') return fwd.split(',')[0].trim();
  if (Array.isArray(fwd)) return fwd[0];
  return req.socket?.remoteAddress || 'unknown';
}

function kvConfigured() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

/**
 * @param {object} req - Vercel request object
 * @param {string} bucket - Logical key (e.g. 'render', 'chat', 'quote')
 * @param {{ limit: number, windowSec: number }} opts
 */
export async function checkRateLimit(req, bucket, { limit, windowSec }) {
  if (!kvConfigured()) {
    // Fail open: no rate limit storage means no rate limiting
    return { allowed: true, count: 0, limit, remaining: limit, resetIn: 0, bypassed: true };
  }

  const ip = clientIp(req);
  const key = `rl:${bucket}:${ip}`;
  try {
    const count = await kv.incr(key);
    if (count === 1) {
      // First request in this window — set TTL
      await kv.expire(key, windowSec);
    }
    const ttl = await kv.ttl(key);
    return {
      allowed: count <= limit,
      count,
      limit,
      remaining: Math.max(0, limit - count),
      resetIn: ttl > 0 ? ttl : windowSec,
      bypassed: false,
    };
  } catch (err) {
    // KV outage — fail open rather than block all users
    console.error('Rate limit KV error, failing open:', err);
    return { allowed: true, count: 0, limit, remaining: limit, resetIn: 0, bypassed: true };
  }
}

/** Send a standardized 429 response when rate limit exceeded. */
export function rateLimitResponse(res, rl) {
  res.setHeader('Retry-After', rl.resetIn);
  res.setHeader('X-RateLimit-Limit', rl.limit);
  res.setHeader('X-RateLimit-Remaining', '0');
  res.setHeader('X-RateLimit-Reset', rl.resetIn);
  return res.status(429).json({
    error: 'Rate limit exceeded',
    message: `Too many requests. Try again in ${Math.ceil(rl.resetIn / 60)} minute(s).`,
    retryAfterSec: rl.resetIn,
  });
}
