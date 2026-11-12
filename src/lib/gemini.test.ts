import { describe, it, expect } from 'vitest';
import { GEMINI_MODELS, parseJsonResponse } from './gemini';

describe('gemini helper', () => {
    it('should expose Gemini 4 Fast and Deep model constants', () => {
        expect(GEMINI_MODELS.FAST).toBe('gemini-4-hydrogen');
        expect(GEMINI_MODELS.DEEP).toBe('gemini-4-argon');
    });

    it('should parse clean JSON and markdown-wrapped JSON', () => {
        expect(parseJsonResponse('{"ok":true}')).toEqual({ ok: true });
        expect(parseJsonResponse('```json\n[{"id":"1"}]\n```')).toEqual([{ id: '1' }]);
    });

    it('should throw on empty or non-JSON responses', () => {
        expect(() => parseJsonResponse('   ')).toThrow('Empty response from AI');
        expect(() => parseJsonResponse('not valid json at all')).toThrow();
    });
});

