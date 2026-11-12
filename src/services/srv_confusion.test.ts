import { describe, it, expect } from 'vitest';
import { findPotentialConfusions, calculateSimilarity } from './srv_confusion';
import { type CustomEntry } from '../schemas/zod_models';

const mockEntries: CustomEntry[] = [
    {
        id: '1',
        prompt: 'Apple',
        answer: 'Pomme',
        sourceId: 'src1',
        stats: {} as any,
        customLayers: {},
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        id: '2',
        prompt: 'Apply',
        answer: 'Appliquer',
        sourceId: 'src1',
        stats: {} as any,
        customLayers: {},
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        id: '3',
        prompt: 'Pineapple',
        answer: 'Ananas',
        sourceId: 'src1',
        stats: {} as any,
        customLayers: {},
        createdAt: new Date(),
        updatedAt: new Date()
    }
];

describe('srv_confusion', () => {
    describe('calculateSimilarity', () => {
        it('should return 1 for identical strings', () => {
            expect(calculateSimilarity('test', 'test')).toBe(1);
        });

        it('should return 0 for completely different strings', () => {
            expect(calculateSimilarity('abc', 'xyz')).toBe(0);
        });

        it('should return a high value for visually similar strings', () => {
            const similarity = calculateSimilarity('Apple', 'Apply');
            expect(similarity).toBeGreaterThan(0.6);
        });
    });

    describe('findPotentialConfusions', () => {
        it('should find items with similar prompts', () => {
            const target = mockEntries[0]; // Apple
            const others = [mockEntries[1], mockEntries[2]];

            const results = findPotentialConfusions(target, others);

            expect(results.length).toBeGreaterThan(0);
            expect(results[0].id).toBe('2'); // Apply is closer than Pineapple
        });
    });
});
