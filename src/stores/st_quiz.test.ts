import { describe, it, expect, beforeEach } from 'vitest';
import { useQuizStore } from './st_quiz';
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
    },
    {
        id: '2',
        sourceId: 'src1',
        prompt: 'Q2',
        answer: 'A2',
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

describe('st_quiz (Zustand Store)', () => {
    beforeEach(async () => {
        await db.customEntries.clear();
        await db.customEntries.bulkAdd(mockEntries);

        // Reset store state
        useQuizStore.getState().endSession();
    });

    it('should initialize session with entries', () => {
        const store = useQuizStore.getState();
        store.startSession(mockEntries);

        const state = useQuizStore.getState();
        expect(state.status).toBe('active');
        expect(state.currentEntry?.id).toBe('1');
        expect(state.queue.length).toBe(1);
        expect(state.stats.total).toBe(2);
    });

    it('should advance to next item on submitAnswer', async () => {
        const store = useQuizStore.getState();
        store.startSession(mockEntries);

        await useQuizStore.getState().submitAnswer(5);
        useQuizStore.getState().nextEntry();

        const state = useQuizStore.getState();
        expect(state.currentEntry?.id).toBe('2');
        expect(state.queue.length).toBe(0);
        expect(state.stats.correct).toBe(1);

        // Check DB update
        const entryInDb = await db.customEntries.get('1');
        expect(entryInDb?.stats.repetition).toBe(1);
        expect(entryInDb?.stats.history.length).toBe(1);
    });

    it('should handle session finish', async () => {
        const store = useQuizStore.getState();
        store.startSession(mockEntries);

        await useQuizStore.getState().submitAnswer(5);
        useQuizStore.getState().nextEntry();
        await useQuizStore.getState().submitAnswer(5);
        useQuizStore.getState().nextEntry();

        const state = useQuizStore.getState();
        expect(state.status).toBe('finished');
        expect(state.currentEntry).toBeNull();
        expect(state.stats.correct).toBe(2);
    });

    it('should reveal answer', () => {
        const store = useQuizStore.getState();
        store.startSession(mockEntries);
        expect(useQuizStore.getState().isRevealed).toBe(false);

        useQuizStore.getState().revealAnswer();
        expect(useQuizStore.getState().isRevealed).toBe(true);
    });

    it('should prevent double submission while loading', async () => {
        const store = useQuizStore.getState();
        store.startSession(mockEntries);

        // Trigger first submission
        const p1 = useQuizStore.getState().submitAnswer(5);
        // Trigger second immediate submission
        const p2 = useQuizStore.getState().submitAnswer(5);

        await Promise.all([p1, p2]);
        useQuizStore.getState().nextEntry();

        const state = useQuizStore.getState();
        // If protection works, ONLY one should have processed for currentEntry '1'
        // and we should be at currentEntry '2' now
        expect(state.currentEntry?.id).toBe('2');
        expect(state.stats.correct).toBe(1);
    });

    it('should clean up isDeepGap flag if mastery improves', async () => {
        const entryWithGap = {
            ...mockEntries[0],
            metadata: { isDeepGap: true }
        };
        useQuizStore.getState().startSession([entryWithGap]);

        // Submit high quality answer
        await useQuizStore.getState().submitAnswer(5);

        const entryInDb = await db.customEntries.get('1');
        expect(entryInDb?.metadata?.isDeepGap).toBeUndefined();
    });
});
