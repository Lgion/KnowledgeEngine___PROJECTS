import { type CustomEntry } from '../schemas/zod_models';

export interface SemanticConfusionMeta {
    id: string;
    reason: string;
}

/**
 * Extracts cached semantic confusion reasons from an entry's metadata.
 */
export function extractSemanticReasons(entry: CustomEntry | null): Record<string, string> {
    const raw = entry?.metadata?.semanticConfusions;
    if (!Array.isArray(raw)) return {};

    const reasons: Record<string, string> = {};
    for (const item of raw) {
        if (item && typeof item === 'object' && typeof (item as SemanticConfusionMeta).id === 'string') {
            reasons[(item as SemanticConfusionMeta).id] = String((item as SemanticConfusionMeta).reason || '');
        }
    }
    return reasons;
}

/**
 * Calculates a similarity score between two strings (0 to 1).
 * Uses normalized Levenshtein distance.
 */
export function calculateSimilarity(a: string, b: string): number {
    const s1 = a.toLowerCase().trim();
    const s2 = b.toLowerCase().trim();

    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;

    const matrix: number[][] = [];

    for (let i = 0; i <= s1.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= s2.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= s1.length; i++) {
        for (let j = 1; j <= s2.length; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }

    const distance = matrix[s1.length][s2.length];
    const maxLength = Math.max(s1.length, s2.length);

    return 1 - distance / maxLength;
}

/**
 * Finds potential items that could be confused with the target item.
 * Combines user-recorded confusions, cached Gemini semantic confusions,
 * and normalized Levenshtein similarity.
 */
export function findPotentialConfusions(
    target: CustomEntry,
    pool: CustomEntry[],
    threshold: number = 0.5
): CustomEntry[] {
    const recordedConfusions = (target.metadata?.confusions as Record<string, number> | undefined) || {};
    const semanticReasons = extractSemanticReasons(target);

    return pool
        .filter(entry => entry.id !== target.id)
        .map(entry => {
            const entryId = entry.id || '';
            const recordedCount = entryId ? (recordedConfusions[entryId] || 0) : 0;
            const hasSemantic = Boolean(entryId && semanticReasons[entryId] !== undefined);

            const promptSim = calculateSimilarity(target.prompt, entry.prompt);
            const answerSim = calculateSimilarity(target.answer, entry.answer);
            const crossSim1 = calculateSimilarity(target.prompt, entry.answer);
            const crossSim2 = calculateSimilarity(target.answer, entry.prompt);
            const lexicalSim = Math.max(promptSim, answerSim, crossSim1, crossSim2);

            // Boost score for confirmed user traps & AI semantic traps so they rank first
            const score = lexicalSim
                + (recordedCount > 0 ? 2 + Math.min(recordedCount, 5) * 0.1 : 0)
                + (hasSemantic ? 0.9 : 0);

            return {
                entry,
                score,
                matches: recordedCount > 0 || hasSemantic || lexicalSim >= threshold,
            };
        })
        .filter(item => item.matches)
        .sort((a, b) => b.score - a.score)
        .map(item => item.entry);
}
