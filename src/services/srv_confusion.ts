import { type CustomEntry } from '../schemas/zod_models';

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
 * Filters by a similarity threshold.
 */
export function findPotentialConfusions(
    target: CustomEntry,
    pool: CustomEntry[],
    threshold: number = 0.5
): CustomEntry[] {
    return pool
        .filter(entry => entry.id !== target.id)
        .map(entry => {
            const promptSim = calculateSimilarity(target.prompt, entry.prompt);
            const answerSim = calculateSimilarity(target.answer, entry.answer);
            // Also check cross-similarity (Thinking the answer is the other prompt)
            const crossSim1 = calculateSimilarity(target.prompt, entry.answer);
            const crossSim2 = calculateSimilarity(target.answer, entry.prompt);

            const maxSim = Math.max(promptSim, answerSim, crossSim1, crossSim2);
            return { entry, similarity: maxSim };
        })
        .filter(item => item.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .map(item => item.entry);
}
