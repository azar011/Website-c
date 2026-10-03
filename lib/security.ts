import crypto from 'crypto';

/**
 * Generates an unguessable 7-8 character alphanumeric public quiz code (e.g. PY8F29K)
 */
export function generatePublicCode(length: number = 7): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // excludes ambiguous chars like 0, 1, I, O
  let result = '';
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  return result;
}

/**
 * Generates a secure attempt token for student sessions
 */
export function generateAttemptToken(): string {
  return 'att_' + crypto.randomBytes(24).toString('hex');
}

/**
 * Generates a session ID
 */
export function generateSessionId(): string {
  return 'sess_' + crypto.randomBytes(16).toString('hex');
}

/**
 * Simple in-memory sliding window rate limiter for public routes
 */
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

export function checkRateLimit(
  identifier: string,
  limit: number = 60,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetIn: Math.ceil(windowMs / 1000) };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetIn: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count, resetIn: Math.ceil((entry.resetAt - now) / 1000) };
}

/**
 * Shuffle an array immutably (Fisher-Yates)
 */
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
