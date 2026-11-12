/**
 * AI Service
 * Handles interactions with AI endpoints for data enhancement, mapping, and confusion analysis.
 */

export interface SemanticConfusionResult {
    id: string;
    reason: string;
}

export interface SuggestedMappingResult {
    promptField: string;
    answerField: string[];
    tipFields: string[];
    reason: string;
}

export async function completeMissingFields(
    items: Record<string, unknown>[],
    targetFields: string[],
    contextFields: string[],
    targetLanguage?: string
): Promise<Record<string, unknown>[]> {
    const response = await fetch('/api/ai/complete-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            items,
            targetFields,
            contextFields,
            targetLanguage
        }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.details || error.error || 'Failed to complete fields via AI');
    }

    const data = await response.json();
    return data.items;
}

export async function suggestImportMapping(
    detectedFields: string[],
    sampleItems: Record<string, unknown>[],
    fileName?: string
): Promise<SuggestedMappingResult> {
    const response = await fetch('/api/ai/suggest-mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            detectedFields,
            sampleItems: sampleItems.slice(0, 5),
            fileName
        }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.details || error.error || 'Failed to suggest mapping via AI');
    }

    return response.json();
}

export async function findSemanticConfusionsAI(
    target: { id: string; prompt: string; answer: string },
    candidates: Array<{ id: string; prompt: string; answer: string }>
): Promise<SemanticConfusionResult[]> {
    const response = await fetch('/api/ai/confusions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, candidates }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.details || error.error || 'Failed to analyze semantic confusions via AI');
    }

    const data = await response.json();
    return Array.isArray(data.confusions) ? data.confusions : [];
}
