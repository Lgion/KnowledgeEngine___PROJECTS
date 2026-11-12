
import { describe, it, expect } from 'vitest';
import { validateJsonSource } from './io_ingestion';

describe('Generic JSON Ingestion', () => {

    it('should flatten a dictionary of objects and return valid', async () => {
        const input = {
            "key1": { "fieldA": "value1" },
            "key2": { "fieldA": "value2" }
        };

        const result = await validateJsonSource(input);

        expect(result.isValid).toBe(true);
        expect(result.totalItems).toBe(2);
        expect(result.detectedFields).toContain('_key');
        expect(result.detectedFields).toContain('fieldA');
    });

    it('should handle array of objects as before', async () => {
        const input = [
            { "fieldA": "value1" },
            { "fieldA": "value2" }
        ];

        const result = await validateJsonSource(input);

        expect(result.isValid).toBe(true);
        expect(result.totalItems).toBe(2);
    });
});
