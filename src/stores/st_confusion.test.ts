import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useQuizStore } from './st_quiz';
import { db } from '../services/db_client';
import { type CustomEntry } from '../schemas/zod_models';

const mockEntries: CustomEntry[] = [
    {
        id: '1',
        sourceId: 'src1',
        prompt: 'Apple',
        answer: 'Pomme',
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
        isReflexVerified: false,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        id: '2',
        sourceId: 'src1',
        prompt: 'Apply',
        answer: 'Appliquer',
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
        isReflexVerified: false,
        createdAt: new Date(),
        updatedAt: new Date()
    }
];

const mockConfig: any = {
    targetField: 'answer',
    arrayMode: 'random',
    difficulty: 'medium',
    timerDuration: 30,
    itemCount: 10,
    strategy: 'random',
    showNotes: true,
    notesAsTip: false,
    tipFields: [],
    optionsCount: 4
};

describe('st_quiz (Confusion Logic)', () => {
    beforeEach(async () => {
        await db.customEntries.clear();
        await db.customEntries.bulkAdd(mockEntries);
        // Reset store state
        useQuizStore.setState({
            status: 'idle',
            phase: 'answering',
            queue: [],
            currentEntry: null,
            options: [],
            selectedId: null,
            stats: {
                correct: 0,
                incorrect: 0,
                total: 0,
                bonusScore: 0,
                startTime: null,
            },
            isRevealed: false,
            isLoading: false,
            lastQuality: null,
            suggestedConfusions: [],
            isFrozen: false,
            config: null,
        });
    });

    it('should suggest confusions on failure', async () => {
        const store = useQuizStore.getState();
        store.startSession(mockEntries, mockConfig);

        // Fail the first item (Apple)
        await store.submitAnswer(1);

        const state = useQuizStore.getState();
        expect(state.phase).toBe('discovery');
        expect(state.suggestedConfusions.length).toBeGreaterThan(0);
        expect(state.suggestedConfusions[0].id).toBe('2'); // Apply is similar to Apple
    });

    it('should record confusion correctly', async () => {
        const store = useQuizStore.getState();
        store.startSession(mockEntries, mockConfig);

        await store.submitAnswer(1);
        const suggestion = useQuizStore.getState().suggestedConfusions[0];

        await store.recordConfusion(suggestion.id!);

        const updatedEntry = await db.customEntries.get(mockEntries[0].id!);
        expect(updatedEntry?.metadata?.confusions).toBeDefined();
        // @ts-expect-error: metadata.confusions is inferred as unknown due to test setup
        expect(updatedEntry.metadata.confusions[suggestion.id!]).toBe(1);
    });

    it('should clear suggestions on next entry', async () => {
        const store = useQuizStore.getState();
        store.startSession(mockEntries, mockConfig);

        await store.submitAnswer(1);
        expect(useQuizStore.getState().suggestedConfusions.length).toBeGreaterThan(0);

        store.nextEntry();
        expect(useQuizStore.getState().suggestedConfusions.length).toBe(0);
    });
});
