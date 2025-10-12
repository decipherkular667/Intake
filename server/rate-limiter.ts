// Database-backed rate limiter for AI API calls
// Persists across server restarts and supports multiple instances

import { db, rateLimits } from './db';
import { eq } from 'drizzle-orm';

const LIMITS = {
  perMinute: 5,   // Max 5 AI requests per minute
  perHour: 20,    // Max 20 AI requests per hour
  perDay: 50,     // Max 50 AI requests per day
};

// Whitelist: Users exempt from rate limiting (e.g., developers, admins)
const WHITELIST = [
  '3e7a172c-7237-48b1-a17c-f10730466bf0', // decipherkul@gmail.com (developer)
];

/**
 * Check if user has exceeded rate limits
 * @param userId - User ID to check
 * @returns { allowed: boolean, retryAfter?: number, limit?: string }
 */
export function checkRateLimit(userId: string): {
  allowed: boolean;
  retryAfter?: number;
  limit?: string;
  remaining?: { minute: number; hour: number; day: number };
} {
  // Check if user is whitelisted (exempt from rate limits)
  if (WHITELIST.includes(userId)) {
    return {
      allowed: true,
      remaining: {
        minute: 999,
        hour: 999,
        day: 999,
      }
    };
  }

  const now = Date.now();

  // Get or create user's rate limit record from database
  let rateLimit = db.select().from(rateLimits).where(eq(rateLimits.userId, userId)).get();

  if (!rateLimit) {
    // Create new rate limit record
    db.insert(rateLimits).values({
      userId,
      minuteCount: 0,
      minuteResetAt: now + 60 * 1000,
      hourCount: 0,
      hourResetAt: now + 60 * 60 * 1000,
      dayCount: 0,
      dayResetAt: now + 24 * 60 * 60 * 1000,
      totalRequests: 0,
      lastRequestAt: null,
    }).run();

    rateLimit = db.select().from(rateLimits).where(eq(rateLimits.userId, userId)).get()!;
  }

  // Reset counters if time windows have passed
  let minuteCount = rateLimit.minuteCount;
  let minuteResetAt = rateLimit.minuteResetAt;
  let hourCount = rateLimit.hourCount;
  let hourResetAt = rateLimit.hourResetAt;
  let dayCount = rateLimit.dayCount;
  let dayResetAt = rateLimit.dayResetAt;

  if (now > minuteResetAt) {
    minuteCount = 0;
    minuteResetAt = now + 60 * 1000;
  }
  if (now > hourResetAt) {
    hourCount = 0;
    hourResetAt = now + 60 * 60 * 1000;
  }
  if (now > dayResetAt) {
    dayCount = 0;
    dayResetAt = now + 24 * 60 * 60 * 1000;
  }

  // Check limits
  if (minuteCount >= LIMITS.perMinute) {
    const retryAfter = Math.ceil((minuteResetAt - now) / 1000);
    return {
      allowed: false,
      retryAfter,
      limit: 'minute',
      remaining: {
        minute: 0,
        hour: LIMITS.perHour - hourCount,
        day: LIMITS.perDay - dayCount,
      }
    };
  }

  if (hourCount >= LIMITS.perHour) {
    const retryAfter = Math.ceil((hourResetAt - now) / 1000);
    return {
      allowed: false,
      retryAfter,
      limit: 'hour',
      remaining: {
        minute: LIMITS.perMinute - minuteCount,
        hour: 0,
        day: LIMITS.perDay - dayCount,
      }
    };
  }

  if (dayCount >= LIMITS.perDay) {
    const retryAfter = Math.ceil((dayResetAt - now) / 1000);
    return {
      allowed: false,
      retryAfter,
      limit: 'day',
      remaining: {
        minute: LIMITS.perMinute - minuteCount,
        hour: LIMITS.perHour - hourCount,
        day: 0,
      }
    };
  }

  // Increment counters and update database
  minuteCount++;
  hourCount++;
  dayCount++;

  db.update(rateLimits)
    .set({
      minuteCount,
      minuteResetAt,
      hourCount,
      hourResetAt,
      dayCount,
      dayResetAt,
      totalRequests: rateLimit.totalRequests + 1,
      lastRequestAt: now,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(rateLimits.userId, userId))
    .run();

  return {
    allowed: true,
    remaining: {
      minute: LIMITS.perMinute - minuteCount,
      hour: LIMITS.perHour - hourCount,
      day: LIMITS.perDay - dayCount,
    }
  };
}

/**
 * Get current usage for a user (for debugging/monitoring)
 */
export function getUserUsage(userId: string): {
  minute: number;
  hour: number;
  day: number;
  total: number;
} | null {
  const rateLimit = db.select().from(rateLimits).where(eq(rateLimits.userId, userId)).get();
  if (!rateLimit) return null;

  const now = Date.now();

  return {
    minute: now < rateLimit.minuteResetAt ? rateLimit.minuteCount : 0,
    hour: now < rateLimit.hourResetAt ? rateLimit.hourCount : 0,
    day: now < rateLimit.dayResetAt ? rateLimit.dayCount : 0,
    total: rateLimit.totalRequests,
  };
}

/**
 * Clear rate limits for a user (admin function)
 */
export function clearUserLimits(userId: string): void {
  db.delete(rateLimits).where(eq(rateLimits.userId, userId)).run();
}

/**
 * Get all active users with rate limits (monitoring)
 */
export function getActiveUsers(): { userId: string; usage: ReturnType<typeof getUserUsage> }[] {
  const allLimits = db.select().from(rateLimits).all();
  const active: { userId: string; usage: ReturnType<typeof getUserUsage> }[] = [];

  for (const limit of allLimits) {
    const usage = getUserUsage(limit.userId);
    if (usage && (usage.minute > 0 || usage.hour > 0 || usage.day > 0)) {
      active.push({ userId: limit.userId, usage });
    }
  }

  return active;
}

// Clean up stale entries every hour to prevent database bloat
setInterval(() => {
  const now = Date.now();
  const allLimits = db.select().from(rateLimits).all();

  for (const limit of allLimits) {
    // If all time windows have expired and no recent activity, delete the record
    if (now > limit.dayResetAt && limit.totalRequests === 0) {
      db.delete(rateLimits).where(eq(rateLimits.userId, limit.userId)).run();
    }
  }
}, 60 * 60 * 1000); // Run every hour
