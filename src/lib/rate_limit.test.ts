import { describe, it, expect, beforeEach } from "vitest";
import { consumeRateLimit, resetRateLimits } from "./rate_limit";

describe("rate_limit", () => {
    beforeEach(() => {
        resetRateLimits();
    });

    it("allows requests up to the limit and blocks subsequent ones", () => {
        const now = 1_000_000;
        expect(consumeRateLimit("user-1", 2, 60_000, now)).toEqual({
            allowed: true,
            remaining: 1,
            retryAfterSeconds: 0,
        });
        expect(consumeRateLimit("user-1", 2, 60_000, now + 1000)).toEqual({
            allowed: true,
            remaining: 0,
            retryAfterSeconds: 0,
        });

        const blocked = consumeRateLimit("user-1", 2, 60_000, now + 2000);
        expect(blocked.allowed).toBe(false);
        expect(blocked.remaining).toBe(0);
        expect(blocked.retryAfterSeconds).toBe(58);
    });

    it("resets capacity once the sliding window expires", () => {
        const now = 1_000_000;
        consumeRateLimit("user-2", 1, 10_000, now);
        expect(consumeRateLimit("user-2", 1, 10_000, now + 5_000).allowed).toBe(false);
        expect(consumeRateLimit("user-2", 1, 10_000, now + 10_001).allowed).toBe(true);
    });
});

