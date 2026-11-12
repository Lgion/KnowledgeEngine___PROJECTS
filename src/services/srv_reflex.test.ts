import { describe, it, expect } from 'vitest';
import { calculateNextStats } from './srv_srs';
import { type SRSStats } from '../schemas/zod_models';

const createMockStats = (overrides: Partial<SRSStats> = {}): SRSStats => ({
    interval: 0,
    repetition: 0,
    efactor: 2.5,
    nextReview: new Date(),
    history: [],
    isReflexVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
});

describe('srv_srs (Reflex Logic)', () => {
    it('should grant Reflex Verified status on fast arcade correct answer (Rep > 2)', () => {
        const stats = createMockStats({ repetition: 3 });
        const next = calculateNextStats(stats, 5, { isArcade: true, timerValue: 80 });

        expect(next.isReflexVerified).toBe(true);
    });

    it('should NOT grant Reflex Verified status if Rep <= 2', () => {
        const stats = createMockStats({ repetition: 2 });
        const next = calculateNextStats(stats, 5, { isArcade: true, timerValue: 80 });

        expect(next.isReflexVerified).toBe(false);
    });

    it('should NOT grant Reflex Verified status if timer < 70%', () => {
        const stats = createMockStats({ repetition: 3 });
        const next = calculateNextStats(stats, 5, { isArcade: true, timerValue: 60 });

        expect(next.isReflexVerified).toBe(false);
    });

    it('should LOSE Reflex Verified status if correct but SLOW (timer < 70%)', () => {
        const stats = createMockStats({ repetition: 3, isReflexVerified: true });
        const next = calculateNextStats(stats, 5, { isArcade: true, timerValue: 60 });

        expect(next.isReflexVerified).toBe(false);
    });

    it('should protect item on fail if Reflex Verified (10% reduction)', () => {
        const stats = createMockStats({
            repetition: 10,
            interval: 100,
            isReflexVerified: true
        });

        // Quality 1 = Fail
        const next = calculateNextStats(stats, 1);

        // repetition: 10 * 0.9 = 9
        // interval: 100 * 0.9 = 90
        expect(next.repetition).toBe(9);
        expect(next.interval).toBe(90);
        expect(next.isReflexVerified).toBe(false); // Status RESET after protection used
    });

    it('should NOT protect item on fail if NOT Reflex Verified', () => {
        const stats = createMockStats({
            repetition: 5,
            interval: 50,
            isReflexVerified: false
        });

        const next = calculateNextStats(stats, 1);

        expect(next.repetition).toBe(0);
        expect(next.interval).toBe(1);
    });
});
