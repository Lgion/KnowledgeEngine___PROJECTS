import { type SRSStats } from "../schemas/zod_models";

/**
 * SRS Logic Service
 * Implements the Weighted Sliding Window algorithm
 */

const HISTORY_LIMIT = 20; // We keep a bit more than 10 for "Expert" protection logic
const PASS_THRESHOLD = 3;

/**
 * Calculates the next state for an item after a review
 * @param current Current stats
 * @param quality Quality of response (0-5)
 * @param options Mode-specific options (optional)
 * @returns Updated SRS stats
 */
export function calculateNextStats(
    current: SRSStats,
    quality: number,
    options?: { isArcade: boolean, timerValue: number }
): SRSStats {
    const now = new Date();
    const history = [...current.history, { date: now, quality }];

    // Maintain a rolling history window
    if (history.length > HISTORY_LIMIT) {
        history.shift();
    }

    let { interval, repetition, efactor, isReflexVerified } = current;

    // 1. Calculate Basal SM-2 Logic
    if (quality >= PASS_THRESHOLD) {
        if (repetition === 0) {
            interval = 1;
        } else if (repetition === 1) {
            interval = 6;
        } else {
            interval = Math.round(interval * efactor);
        }
        repetition++;

        // 1.2 Reflex Detection: Correct in Arcade with >= 70% timer (if already Rep > 2)
        if (options?.isArcade && options.timerValue >= 70 && current.repetition > 2) {
            isReflexVerified = true;
        } else if (options?.isArcade && options.timerValue < 70) {
            // Optional: If correct but slow, we might want to lose the status? 
            // AC says "validated ONLY if...", so let's be strict.
            isReflexVerified = false;
        }
    } else {
        // FAIL LOGIC with Expert & Reflex Protection
        const isExpert = repetition > 10 && calculateMastery(history.slice(-10)) > 0.8;
        const isReflexProtected = isReflexVerified;

        if (isReflexProtected) {
            // Reflex Protection: Only reduce by 10%
            repetition = Math.max(1, Math.floor(repetition * 0.9));
            interval = Math.max(1, Math.floor(interval * 0.9));
            // Reset status: the protection is only for an "isolated" fail
            isReflexVerified = false;
        } else if (isExpert) {
            // Protected: don't reset to 0, just reduce interval and repetition slightly
            repetition = Math.max(1, Math.floor(repetition * 0.5));
            interval = Math.max(1, Math.floor(interval * 0.3));
        } else {
            repetition = 0;
            interval = 1;
        }
    }

    // 2. Adjust E-Factor (stability)
    efactor = efactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (efactor < 1.3) efactor = 1.3;

    // 3. Sliding Window Multipliers (Streak-based)
    const recentHistory = history.slice(-10);
    const successStreak = getStreak(recentHistory);

    if (successStreak >= 10) interval *= 2.0;
    else if (successStreak >= 5) interval *= 1.5;
    else if (successStreak >= 3) interval *= 1.2;

    // 4. Calculate Next Review Date
    const nextReview = new Date(now);
    nextReview.setDate(now.getDate() + Math.ceil(interval));

    return {
        ...current,
        interval,
        repetition,
        efactor,
        isReflexVerified,
        nextReview,
        history,
        updatedAt: now
    };
}

/**
 * Calculates a mastery score (0 to 1) based on a window of history
 */
export function calculateMastery(history: { quality: number }[]): number {
    if (history.length === 0) return 0;
    const sum = history.reduce((acc, curr) => acc + curr.quality, 0);
    return sum / (history.length * 5); // 5 is max quality
}

/**
 * Returns the number of consecutive successes (quality >= 3) at the end of history
 */
function getStreak(history: { quality: number }[]): number {
    let streak = 0;
    for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].quality >= PASS_THRESHOLD) {
            streak++;
        } else {
            break;
        }
    }
    return streak;
}

/**
 * Flags if an item is a "Lacune Grave" (Deep Gap)
 * > 7 fails in the last 10 attempts
 */
export function isDeepGap(history: { quality: number }[]): boolean {
    if (history.length < 5) return false;
    const recent = history.slice(-10);
    const fails = recent.filter(h => h.quality < PASS_THRESHOLD).length;
    return fails >= 7;
}
