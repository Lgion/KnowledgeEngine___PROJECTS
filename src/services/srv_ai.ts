/**
 * AI Service
 * Handles interactions with AI endpoints for data enhancement and completion
 */

export async function completeMissingFields(
    items: any[],
    targetFields: string[],
    contextFields: string[],
    targetLanguage?: string
): Promise<any[]> {
    try {
        const url = '/api/ai/complete-fields';
        console.log(`[srv_ai] Dispatching fetch to ${url} for ${items.length} items...`);
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                items,
                targetFields,
                contextFields,
                targetLanguage
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.details || 'Failed to complete fields via AI');
        }

        const data = await response.json();
        return data.items;
    } catch (error) {
        console.error("AI Completion Service Error:", error);
        throw error;
    }
}
