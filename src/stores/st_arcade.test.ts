import { describe, it, expect, beforeEach } from 'vitest';
import { useQuizStore, QUIZ_MODES } from './st_quiz';
import { db } from '../services/db_client';
import { type CustomEntry } from '../schemas/zod_models';

const mockEntries: CustomEntry[] = [
    {
        id: '1',
        sourceId: 'src1',
        prompt: 'Q1',
        answer: 'A1',
        stats: {
            interval: 0,
            repetition: 0,
            efactor: 2.5,
            nextReview: new Date(),
            history: [],
            createdAt: new Date(),
            updatedAt: new Date()
        },
        customLayers: {},
        createdAt: new Date(),
        updatedAt: new Date()
    }
];

describe('st_quiz (Arcade Mode)', () => {
    beforeEach(async () => {
        await db.customEntries.clear();
        await db.customEntries.bulkAdd(mockEntries);
        // Reset store
        useQuizStore.getState().endSession();
    });

    it('should start session in arcade mode', () => {
        const store = useQuizStore.getState();
        store.startSession(mockEntries, QUIZ_MODES.ARCADE);

        const state = useQuizStore.getState();
        expect(state.mode).toBe(QUIZ_MODES.ARCADE);
        expect(state.arcadeTimer).toBe(100);
    });

    it('should calculate quadratic arcade bonus on correct answer', async () => {
        const store = useQuizStore.getState();
        store.startSession(mockEntries, QUIZ_MODES.ARCADE);

        // Manually set timer to 50%
        useQuizStore.setState({ arcadeTimer: 50 });

        // (50/100)^2 * 1000 = 0.25 * 1000 = 250
        await useQuizStore.getState().submitAnswer(5);

        const state = useQuizStore.getState();
        expect(state.stats.bonusScore).toBe(250);
    });

    it('should stay at zero bonus if answer is incorrect', async () => {
        const store = useQuizStore.getState();
        store.startSession(mockEntries, QUIZ_MODES.ARCADE);
        useQuizStore.setState({ arcadeTimer: 80 });

        await useQuizStore.getState().submitAnswer(1);

        const state = useQuizStore.getState();
        expect(state.stats.bonusScore).toBe(0);
    });

    it('should set isTimeout and auto-fail when timer hits zero', async () => {
        const store = useQuizStore.getState();
        store.startSession(mockEntries, QUIZ_MODES.ARCADE);

        // tick down exactly to 0
        store.tickArcadeTimer(100);

        // Wait for the async submitAnswer to complete
        // Since it's Zustand, we can wait for the loading state to finish
        // but it's tricky. Let's just wait a tick.
        await new Promise(resolve => setTimeout(resolve, 50));

        const state = useQuizStore.getState();
        expect(state.arcadeTimer).toBe(0);
        expect(state.isTimeout).toBe(true);
        expect(state.phase).toBe('discovery');
        expect(state.lastQuality).toBe(1);
    });

    it('should stop timer once revealed', async () => {
        const store = useQuizStore.getState();
        store.startSession(mockEntries, QUIZ_MODES.ARCADE);

        store.revealAnswer();
        const timerBefore = useQuizStore.getState().arcadeTimer;

        store.tickArcadeTimer(10);

        const timerAfter = useQuizStore.getState().arcadeTimer;
        expect(timerAfter).toBe(timerBefore);
    });
});
