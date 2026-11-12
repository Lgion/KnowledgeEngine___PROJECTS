import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const DEFAULT_HOURLY_LIMIT = 10;
const DEFAULT_DAILY_LIMIT = 30;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const requestLog = new Map<string, number[]>();

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    retryAfterSeconds: number;
}

/**
 * Sliding-window in-memory rate limiter for a given bucket key.
 */
export function consumeRateLimit(
    key: string,
    limit: number,
    windowMs: number,
    now = Date.now()
): RateLimitResult {
    const cutoff = now - windowMs;
    const recent = (requestLog.get(key) ?? []).filter((ts) => ts > cutoff);

    if (recent.length >= limit) {
        requestLog.set(key, recent);
        const oldest = recent[0];
        const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
        return { allowed: false, remaining: 0, retryAfterSeconds };
    }

    recent.push(now);
    requestLog.set(key, recent);
    return {
        allowed: true,
        remaining: Math.max(0, limit - recent.length),
        retryAfterSeconds: 0,
    };
}

/**
 * Clears all in-memory rate limit buckets (intended for unit tests).
 */
export function resetRateLimits(): void {
    requestLog.clear();
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
    if (!raw) return fallback;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Enforces per-user hourly and daily quotas on expensive PDF ingestion routes.
 * Returns a NextResponse (401 or 429) if blocked, or null if allowed.
 */
export async function enforcePdfIngestQuota(): Promise<NextResponse | null> {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hourlyLimit = parsePositiveInt(process.env.PDF_INGEST_HOURLY_LIMIT, DEFAULT_HOURLY_LIMIT);
    const dailyLimit = parsePositiveInt(process.env.PDF_INGEST_DAILY_LIMIT, DEFAULT_DAILY_LIMIT);

    const hourly = consumeRateLimit(`pdf:${userId}:hourly`, hourlyLimit, HOUR_MS);
    if (!hourly.allowed) {
        return NextResponse.json(
            {
                error: `Hourly PDF ingestion limit (${hourlyLimit}/h) exceeded. Please try again later.`,
                retryAfterSeconds: hourly.retryAfterSeconds,
            },
            {
                status: 429,
                headers: { "Retry-After": String(hourly.retryAfterSeconds) },
            }
        );
    }

    const daily = consumeRateLimit(`pdf:${userId}:daily`, dailyLimit, DAY_MS);
    if (!daily.allowed) {
        return NextResponse.json(
            {
                error: `Daily PDF ingestion limit (${dailyLimit}/day) exceeded. Please try again tomorrow.`,
                retryAfterSeconds: daily.retryAfterSeconds,
            },
            {
                status: 429,
                headers: { "Retry-After": String(daily.retryAfterSeconds) },
            }
        );
    }

    return null;
}

