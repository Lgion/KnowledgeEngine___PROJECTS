import { describe, it, expect } from 'vitest';
import { calculateNextStats, isDeepGap } from './srv_srs';
import { type SRSStats } from '../schemas/zod_models';

const createInitialStats = (): SRSStats => ({
    interval: 0,
    repetition: 0,
    efactor: 2.5,
    nextReview: new Date(),
    history: [],
    createdAt: new Date(),
    updatedAt: new Date()
});

describe('srv_srs (Sliding Window Algorithm)', () => {

    it('should progress normally with quality 5 (SM-2 basal)', () => {
        let stats = createInitialStats();

        // 1st review
        stats = calculateNextStats(stats, 5);
        expect(stats.repetition).toBe(1);
        expect(stats.interval).toBe(1);

        // 2nd review
        stats = calculateNextStats(stats, 5);
        expect(stats.repetition).toBe(2);
        expect(stats.interval).toBe(6);
    });

    it('should detect Deep Gaps (Lacune Grave) after 7 fails out of 10', () => {
        let stats = createInitialStats();
        // Fail 7 times
        for (let i = 0; i < 7; i++) {
            stats = calculateNextStats(stats, 1);
        }
        expect(isDeepGap(stats.history)).toBe(true);
    });

    it('should implement Expert Protection for high-repetition items', () => {
        let stats = createInitialStats();
        // Simulate 15 successes to become expert
        for (let i = 0; i < 15; i++) {
            stats = calculateNextStats(stats, 5);
        }

        const intervalBeforeFail = stats.interval;

        // One isolated fail
        stats = calculateNextStats(stats, 1);

        // Without protection, repetition would be 0 and interval 1
        // With protection, it should be degraded but not reset
        expect(stats.repetition).toBeGreaterThan(0);
        expect(stats.interval).toBeLessThan(intervalBeforeFail);
        expect(stats.interval).toBeGreaterThan(1);
    });

    it('should apply multipliers for success streaks', () => {
        let stats = createInitialStats();
        // 5 successes in a row
        for (let i = 0; i < 5; i++) {
            stats = calculateNextStats(stats, 5);
        }

        // The 5th success should have a 1.5x multiplier on top of EF
        // Manual calc: 
        // 1: int 1, rep 1
        // 2: int 6, rep 2
        // 3: int 15, rep 3 (6 * 2.5) -> streak 3 boost (15 * 1.2 = 18)
        // 4: int 45, rep 4 (18 * 2.5 = 45) -> streak 4 boost (45 * 1.2 = 54)
        // 5: int 135, rep 5 (54 * 2.5 = 135) -> streak 5 boost (135 * 1.5 = 202.5 -> 203)

        expect(stats.interval).toBeGreaterThan(100);
    });

    it('should handle performance: 10,000 calculations < 200ms', () => {
        const items = Array.from({ length: 10000 }, () => createInitialStats());
        const start = performance.now();

        items.forEach(item => {
            calculateNextStats(item, 4);
        });

        const end = performance.now();
        const duration = end - start;

        console.log(`10,000 SRS updates took ${duration.toFixed(2)}ms`);
        expect(duration).toBeLessThan(200);
    });
});
