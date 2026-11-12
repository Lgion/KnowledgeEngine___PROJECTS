import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useQuizStore, type QuizSessionConfig } from './st_quiz';
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
            isReflexVerified: false,
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
        prompt: 'Apply',
        answer: 'Appliquer',
        stats: {
            interval: 0,
            repetition: 0,
            efactor: 2.5,
            nextReview: new Date(),
            history: [],
            isReflexVerified: false,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        customLayers: {},
        createdAt: new Date(),
        updatedAt: new Date()
    }
];

const mockConfig: QuizSessionConfig = {
    targetField: '',
    arrayMode: 'random',
    difficulty: 'medium',
    timerDuration: 30,
    itemCount: 10,
    strategy: 'sequential',
    autoShowNotes: true,
    autoShowHints: false,
    tipFields: [],
    optionsCount: 4
};

describe('st_quiz (Confusion Logic)', () => {
    beforeEach(async () => {
        await db.customEntries.clear();
        await db.customEntries.bulkAdd(mockEntries);
        useQuizStore.getState().endSession();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should suggest confusions on failure', async () => {
        const store = useQuizStore.getState();
        await store.startSession(mockEntries, mockConfig);

        // Fail the first item (Apple)
        await store.submitAnswer(1);

        const state = useQuizStore.getState();
        expect(state.phase).toBe('discovery');
        expect(state.suggestedConfusions.length).toBeGreaterThan(0);
        expect(state.suggestedConfusions[0].id).toBe('2'); // Apply is similar to Apple
    });

    it('should record confusion correctly', async () => {
        const store = useQuizStore.getState();
        await store.startSession(mockEntries, mockConfig);

        await store.submitAnswer(1);
        const suggestion = useQuizStore.getState().suggestedConfusions[0];

        await store.recordConfusion(suggestion.id!);

        const updatedEntry = await db.customEntries.get(mockEntries[0].id!);
        const confusions = updatedEntry?.metadata?.confusions as Record<string, number> | undefined;
        expect(confusions).toBeDefined();
        expect(confusions?.[suggestion.id!]).toBe(1);
    });

    it('should clear suggestions on next entry', async () => {
        const store = useQuizStore.getState();
        await store.startSession(mockEntries, mockConfig);

        await store.submitAnswer(1);
        expect(useQuizStore.getState().suggestedConfusions.length).toBeGreaterThan(0);

        await store.nextEntry();
        expect(useQuizStore.getState().suggestedConfusions.length).toBe(0);
    });

    it('should analyze and persist semantic confusions via AI endpoint', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue({
            ok: true,
            json: async () => ({
                confusions: [{ id: '2', reason: 'Lookalike English verb vs noun' }],
            }),
        } as Response);

        const store = useQuizStore.getState();
        await store.startSession(mockEntries, mockConfig);
        await store.analyzeSemanticConfusions();

        const state = useQuizStore.getState();
        expect(state.semanticReasons['2']).toBe('Lookalike English verb vs noun');
        expect(state.suggestedConfusions.some(e => e.id === '2')).toBe(true);

        const persisted = await db.customEntries.get('1');
        expect(persisted?.metadata?.semanticConfusions).toEqual([
            { id: '2', reason: 'Lookalike English verb vs noun' },
        ]);
    });
});
