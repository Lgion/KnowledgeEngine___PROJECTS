import { describe, it, expect } from 'vitest';
import { validateJsonSource } from './io_ingestion';

describe('io_ingestion service', () => {
    it('should validate a correct array of objects', async () => {
        const data = [
            { question: "What is 2+2?", answer: "4" },
            { question: "What is the capital of France?", answer: "Paris" }
        ];

        const diagnostic = await validateJsonSource(data);

        expect(diagnostic.isValid).toBe(true);
        expect(diagnostic.totalItems).toBe(2);
        expect(diagnostic.detectedFields).toContain('question');
        expect(diagnostic.detectedFields).toContain('answer');
    });

    it('should detect duplicates with different key ordering', async () => {
        const data = [
            { q: "A", a: "1" },
            { a: "1", q: "A" } // Symmetrically identical
        ];

        const diagnostic = await validateJsonSource(data);

        expect(diagnostic.isValid).toBe(true);
        expect(diagnostic.duplicateCount).toBe(1);
    });

    it('should fail on empty objects', async () => {
        const data = [{}, { payload: "data" }];

        const diagnostic = await validateJsonSource(data);

        expect(diagnostic.isValid).toBe(false);
        expect(diagnostic.invalidItems).toBe(1);
        expect(diagnostic.errors[0].message).toContain("Item cannot be empty");
    });

    it('should provide precise error indices', async () => {
        const data = [
            { valid: "data" },
            "invalid",
            { valid: "data 2" }
        ];

        const diagnostic = await validateJsonSource(data);

        expect(diagnostic.isValid).toBe(false);
        expect(diagnostic.errors[0].index).toBe(1);
        expect(diagnostic.errors[0].message).toContain("Item at index 1");
    });

    it('should fail on non-array input', async () => {
        const data = { not: "an array" };

        const diagnostic = await validateJsonSource(data);

        expect(diagnostic.isValid).toBe(false);
    });
});
