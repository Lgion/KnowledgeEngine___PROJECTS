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

describe('st_quiz Discovery Phase', () => {
    beforeEach(async () => {
        await db.customEntries.clear();
        await db.customEntries.bulkAdd(mockEntries);
        useQuizStore.getState().endSession();
    });

    it('should start in answering phase', () => {
        useQuizStore.getState().startSession(mockEntries);
        expect(useQuizStore.getState().phase).toBe('answering');
    });

    it('should transition to discovery phase after submitAnswer and NOT advance', async () => {
        useQuizStore.getState().startSession(mockEntries);

        await useQuizStore.getState().submitAnswer(5);

        const state = useQuizStore.getState();
        expect(state.phase).toBe('discovery');
        // Should STILL be on item 1
        expect(state.currentEntry?.id).toBe('1');
        expect(state.queue.length).toBe(1);
    });

    it('should advance to next item on nextEntry and back to answering phase', async () => {
        useQuizStore.getState().startSession(mockEntries);
        await useQuizStore.getState().submitAnswer(5);

        useQuizStore.getState().nextEntry();

        const state = useQuizStore.getState();
        expect(state.phase).toBe('answering');
        expect(state.currentEntry?.id).toBe('2');
        expect(state.queue.length).toBe(0);
        expect(state.isRevealed).toBe(false);
    });
});
