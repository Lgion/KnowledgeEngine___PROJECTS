import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { type CustomEntry } from '../schemas/zod_models';
import { calculateNextStats, isDeepGap } from '../services/srv_srs';
import { findPotentialConfusions, extractSemanticReasons, type SemanticConfusionMeta } from '../services/srv_confusion';
import { findSemanticConfusionsAI } from '../services/srv_ai';
import { db } from '../services/db_client';

interface QuizSessionStats {
    correct: number;
    incorrect: number;
    total: number;
    bonusScore: number;
    startTime: Date | null;
}

export const QUIZ_MODES = {
    CLASSIC: 'classic',
    ARCADE: 'arcade',
} as const;

export type QuizMode = typeof QUIZ_MODES[keyof typeof QUIZ_MODES];

export type ArrayMode = 'all' | 'random';
export type QuizDifficulty = 'easy' | 'medium' | 'hard';
export type QuizStrategy = 'random' | 'srs_due' | 'least_mastered' | 'sequential';

export interface QuizSessionConfig {
    targetField: string;
    arrayMode: ArrayMode;
    difficulty: QuizDifficulty;
    timerDuration: number | null;
    itemCount: number;
    strategy: QuizStrategy;
    autoShowNotes: boolean;
    autoShowHints: boolean;
    tipFields: string[];
    optionsCount: number;
}

export const getTimerDuration = (difficulty: QuizDifficulty): number | null => {
    switch (difficulty) {
        case 'hard': return 10;
        case 'medium': return 30;
        case 'easy': default: return null;
    }
};

export const DEFAULT_QUIZ_CONFIG: QuizSessionConfig = {
    targetField: '',
    arrayMode: 'random',
    difficulty: 'easy',
    timerDuration: null,
    itemCount: 20,
    strategy: 'sequential',
    autoShowNotes: true,
    autoShowHints: false,
    tipFields: [],
    optionsCount: 4,
};

type QuizStatus = 'idle' | 'active' | 'finished';
type QuizPhase = 'answering' | 'discovery';

interface QuizState {
    // State
    status: QuizStatus;
    phase: QuizPhase;
    originalEntries: CustomEntry[];
    queue: CustomEntry[];
    currentEntry: CustomEntry | null;
    options: CustomEntry[]; // Multiple choice options
    selectedId: string | null;
    stats: QuizSessionStats;
    isRevealed: boolean;
    isLoading: boolean;
    lastQuality: number | null;
    mode: QuizMode;
    arcadeTimer: number; // 0 to 100
    isTimeout: boolean;
    suggestedConfusions: CustomEntry[];
    semanticReasons: Record<string, string>;
    isAnalyzingConfusions: boolean;
    isFrozen: boolean;
    isRefining: boolean;
    isExplaining: boolean;
    aiExplanation: string | null;
    aiError: string | null;
    config: QuizSessionConfig | null;

    // Actions
    startSession: (entries: CustomEntry[], config?: Partial<QuizSessionConfig> | QuizMode, mode?: QuizMode) => Promise<void>;
    revealAnswer: () => void;
    makeChoice: (id: string) => Promise<void>;
    submitAnswer: (quality: number) => Promise<void>;
    updateEntry: (entry: CustomEntry) => Promise<void>;
    updateEntryNotes: (notes: string) => Promise<void>;
    refineItemWithAI: () => Promise<void>;
    requestTutorExplanation: (userChoice?: string) => Promise<void>;
    analyzeSemanticConfusions: () => Promise<void>;
    nextEntry: () => Promise<void>;
    toggleFreeze: () => void;
    restartSession: () => Promise<void>;
    tickArcadeTimer: (delta: number) => void;
    recordConfusion: (targetEntryId: string) => Promise<void>;
    endSession: () => void;
}

/**
 * Quiz Session Store
 * Manages the hot state of a quiz session
 */
/**
 * Resolves the answer string for an entry based on current session config
 */
export const resolveAnswer = (entry: CustomEntry, config: QuizSessionConfig | null, forceAll = false): string => {
    if (!config || !config.targetField) return entry.answer;

    const customLayers = entry.customLayers as { rawData?: Record<string, unknown> };
    const rawData = customLayers?.rawData;
    if (!rawData) return entry.answer;

    const val = rawData[config.targetField];
    if (val === undefined || val === null) return "N/A";

    if (Array.isArray(val)) {
        if (!forceAll && config.arrayMode === 'random') {
            const idx = Math.floor(Math.random() * val.length);
            return String(val[idx]);
        }
        return val.join(", ");
    }

    return String(val);
};

export interface HintItem {
    label: string;
    value: string;
}

/**
 * Resolves hints/tips based on the source's designated tip fields
 */
export const resolveHint = (entry: CustomEntry, tipFields: string[]): HintItem[] => {
    if (!tipFields || tipFields.length === 0) return [];

    const customLayers = entry.customLayers as { rawData?: Record<string, unknown> };
    const rawData = customLayers?.rawData;
    if (!rawData) return [];

    const tips: HintItem[] = tipFields
        .filter(f => rawData[f] !== undefined && rawData[f] !== null && rawData[f] !== "")
        .map(f => {
            const val = rawData[f];
            return {
                label: f,
                value: Array.isArray(val) ? val.join(", ") : String(val)
            };
        });

    return tips;
};

export const useQuizStore = create<QuizState>((set, get) => {
    // Internal helper to generate options for the current entry
    const generateOptions = async (entry: CustomEntry, config: QuizSessionConfig | null): Promise<CustomEntry[]> => {
        if (!config) return [];
        // Fetch pool from database
        const pool = await db.customEntries
            .where('sourceId')
            .equals(entry.sourceId)
            .toArray();

        // 2. Try to find potential confusions (distractors)
        // Default target is 4 (3 distractors) if config not set
        const targetOptions = config?.optionsCount || 4;
        const targetDistractors = Math.max(1, targetOptions - 1);

        let distractors = findPotentialConfusions(entry, pool, 0.4).slice(0, targetDistractors);

        // 3. If not enough, fill with random items from pool
        if (distractors.length < targetDistractors) {
            const others = pool.filter(e => e.id !== entry.id && !distractors.find(d => d.id === e.id));
            const needed = targetDistractors - distractors.length;
            const randoms = others.sort(() => 0.5 - Math.random()).slice(0, needed);
            distractors = [...distractors, ...randoms];
        }

        // 4. Shuffle everything
        const all = [entry, ...distractors].sort(() => 0.5 - Math.random());

        // 5. Apply dynamic answer resolution
        return all.map(e => {
            // We resolve the answer for EVERY option according to config.arrayMode
            // This ensures options show one or all according to selected mode, 
            // regardless of the baseline's forceAll setting.
            return {
                ...e,
                answer: resolveAnswer(e, config)
            };
        });
    };

    return {
        status: 'idle',
        phase: 'answering',
        originalEntries: [],
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
        mode: QUIZ_MODES.CLASSIC,
        arcadeTimer: 100,
        isTimeout: false,
        suggestedConfusions: [],
        semanticReasons: {},
        isAnalyzingConfusions: false,
        isFrozen: false,
        isRefining: false,
        isExplaining: false,
        aiExplanation: null,
        aiError: null,
        config: null,

        startSession: async (entries, configOrMode, explicitMode) => {
            if (!entries || entries.length === 0) return;

            const isModeArg = configOrMode === QUIZ_MODES.CLASSIC || configOrMode === QUIZ_MODES.ARCADE;
            const providedMode = explicitMode ?? (isModeArg ? configOrMode : undefined);
            const rawConfig = isModeArg ? undefined : configOrMode;

            const resolvedDifficulty: QuizDifficulty = rawConfig?.difficulty
                ?? (providedMode === QUIZ_MODES.ARCADE ? 'medium' : DEFAULT_QUIZ_CONFIG.difficulty);

            const resolvedConfig: QuizSessionConfig = {
                ...DEFAULT_QUIZ_CONFIG,
                itemCount: entries.length,
                ...rawConfig,
                difficulty: resolvedDifficulty,
                timerDuration: rawConfig?.timerDuration !== undefined
                    ? rawConfig.timerDuration
                    : getTimerDuration(resolvedDifficulty),
            };

            const resolvedMode: QuizMode = providedMode
                ?? (resolvedConfig.difficulty !== 'easy' || resolvedConfig.timerDuration !== null
                    ? QUIZ_MODES.ARCADE
                    : QUIZ_MODES.CLASSIC);

            const now = new Date();
            let sessionItems = [...entries];

            // 1. Apply Selection Strategy
            if (resolvedConfig.strategy === 'srs_due') {
                sessionItems = entries.filter(e => !e.stats.nextReview || new Date(e.stats.nextReview) <= now);
                sessionItems.sort(() => Math.random() - 0.5);
            } else if (resolvedConfig.strategy === 'least_mastered') {
                sessionItems.sort((a, b) => {
                    if (a.stats.repetition !== b.stats.repetition) {
                        return (a.stats.repetition || 0) - (b.stats.repetition || 0);
                    }
                    return (a.stats.efactor || 0) - (b.stats.efactor || 0);
                });
            } else if (resolvedConfig.strategy === 'random') {
                sessionItems.sort(() => Math.random() - 0.5);
            }
            // 'sequential' keeps the input order intact

            // 2. Limit to itemCount
            sessionItems = sessionItems.slice(0, resolvedConfig.itemCount);

            if (sessionItems.length === 0) {
                if (entries.length > 0 && resolvedConfig.strategy === 'srs_due') {
                    sessionItems = [...entries].sort(() => Math.random() - 0.5).slice(0, resolvedConfig.itemCount);
                } else {
                    return;
                }
            }

            const [first, ...rest] = sessionItems;
            // Baseline always shows all meanings flattened
            const resolvedFirst = { ...first, answer: resolveAnswer(first, resolvedConfig, true) };
            const options = await generateOptions(resolvedFirst, resolvedConfig);

            set({
                status: 'active',
                phase: 'answering',
                mode: resolvedMode,
                arcadeTimer: 100,
                originalEntries: sessionItems,
                currentEntry: resolvedFirst,
                options,
                selectedId: null,
                queue: rest,
                config: resolvedConfig,
                stats: {
                    correct: 0,
                    incorrect: 0,
                    total: sessionItems.length,
                    bonusScore: 0,
                    startTime: new Date(),
                },
                isRevealed: false,
                isLoading: false,
                lastQuality: null,
                isTimeout: false,
                suggestedConfusions: [],
                semanticReasons: extractSemanticReasons(resolvedFirst),
                isAnalyzingConfusions: false,
                isFrozen: false,
                isRefining: false,
                isExplaining: false,
                aiExplanation: null,
                aiError: null,
            });
        },

        revealAnswer: () => {
            set({ isRevealed: true });
        },

        makeChoice: async (id: string) => {
            const { currentEntry, phase, status, isLoading, submitAnswer, arcadeTimer, mode } = get();
            if (!currentEntry || phase !== 'answering' || status !== 'active' || isLoading) return;

            const isCorrect = id === currentEntry.id;
            set({ selectedId: id });

            // Map choice to SRS quality
            // 4 = Good, 1 = Forgot
            // If arcade and fast, maybe 5?
            let quality = isCorrect ? 4 : 1;

            if (isCorrect && mode === QUIZ_MODES.ARCADE && arcadeTimer >= 70) {
                quality = 5;
            }

            await submitAnswer(quality);
        },

        submitAnswer: async (quality) => {
            const { currentEntry, stats, isLoading, status } = get();

            // Anti-double-tap and safety guards
            if (!currentEntry || isLoading || status !== 'active') return;

            set({ isLoading: true });

            const now = new Date();
            const { mode, arcadeTimer } = get();

            // 1. Calculate new SRS stats
            const newStats = calculateNextStats(
                currentEntry.stats,
                quality,
                { isArcade: mode === QUIZ_MODES.ARCADE, timerValue: arcadeTimer }
            );

            // 2. Prepare updated entry
            const updatedEntry: CustomEntry = {
                ...currentEntry,
                stats: newStats,
                updatedAt: now,
            };

            // 3. Dynamic Deep Gap detection (Add/Remove)
            const isCurrentlyDeepGap = isDeepGap(newStats.history);
            const metadata = { ...(updatedEntry.metadata || {}) };

            if (isCurrentlyDeepGap) {
                metadata.isDeepGap = 1;
            } else {
                delete metadata.isDeepGap;
            }
            updatedEntry.metadata = metadata;

            try {
                // 4. Persistence
                await db.customEntries.put(updatedEntry);

                // 5. Update session stats
                const isCorrect = quality >= 3;

                // Calculate arcade bonus
                let bonus = 0;
                if (mode === QUIZ_MODES.ARCADE && isCorrect) {
                    const normalizedTimer = arcadeTimer / 100;
                    bonus = Math.round(Math.pow(normalizedTimer, 2) * 1000);
                }

                const newSessionStats = {
                    ...stats,
                    correct: stats.correct + (isCorrect ? 1 : 0),
                    incorrect: stats.incorrect + (isCorrect ? 0 : 1),
                    bonusScore: stats.bonusScore + bonus,
                };

                // 6. Transition to Discovery Phase
                // 7. If failed, look for potential confusions
                let suggestedConfusions: CustomEntry[] = [];
                if (!isCorrect && mode !== undefined) {
                    const pool = await db.customEntries
                        .where('sourceId')
                        .equals(currentEntry.sourceId)
                        .toArray();

                    suggestedConfusions = findPotentialConfusions(currentEntry, pool);
                }

                set({
                    currentEntry: updatedEntry,
                    stats: newSessionStats,
                    phase: 'discovery',
                    isLoading: false,
                    lastQuality: quality,
                    isRevealed: true, // Always reveal on submission (to see answer)
                    suggestedConfusions,
                    semanticReasons: extractSemanticReasons(updatedEntry),
                });
            } catch (error) {
                console.error("Failed to update SRS stats in DB", error);
                set({ isLoading: false });
            }
        },

        toggleFreeze: () => {
            const { isFrozen, currentEntry, queue } = get();
            const nextState = !isFrozen;

            set({ isFrozen: nextState });

            // Unfreeze logic: shuffle current + next
            if (!nextState && currentEntry) {
                // Push current entry back into queue at random position > 1
                // To avoid seeing it immediately again if queue is small, but ensure separation
                const newQueue = [...queue];
                if (newQueue.length > 1) {
                    const insertIdx = Math.floor(Math.random() * (newQueue.length - 1)) + 1;
                    newQueue.splice(insertIdx, 0, currentEntry);
                } else {
                    newQueue.push(currentEntry);
                }

                // Immediately allow picking next
                set({ queue: newQueue });

                // Force move to next entry (which is now different)
                get().nextEntry();
            }
        },

        restartSession: async () => {
            const { config, mode, originalEntries, currentEntry, queue, startSession } = get();
            if (!config) return;

            const fallbackEntries = originalEntries.length > 0
                ? originalEntries
                : [...(currentEntry ? [currentEntry] : []), ...queue];

            if (fallbackEntries.length === 0) return;

            // Refresh from IndexedDB when available so newly edited notes/stats are kept
            const ids = fallbackEntries.map(e => e.id).filter((id): id is string => Boolean(id));
            let latestEntries = fallbackEntries;
            if (ids.length > 0) {
                const fetched = await db.customEntries.bulkGet(ids);
                const byId = new Map(fetched.filter((e): e is CustomEntry => Boolean(e && e.id)).map(e => [e.id!, e]));
                latestEntries = fallbackEntries.map(e => (e.id ? (byId.get(e.id) ?? e) : e));
            }

            await startSession(latestEntries, config, mode);
        },

        updateEntry: async (updatedEntry: CustomEntry) => {
            const { currentEntry } = get();
            set({ isLoading: true });

            try {
                await db.customEntries.put(updatedEntry);

                // Sync currentEntry if it's the one we just updated
                if (currentEntry && currentEntry.id === updatedEntry.id) {
                    set({ currentEntry: updatedEntry });
                }

                // Sync queue if the entry is in there
                const { queue } = get();
                const entryIndex = queue.findIndex(e => e.id === updatedEntry.id);
                if (entryIndex !== -1) {
                    const newQueue = [...queue];
                    newQueue[entryIndex] = updatedEntry;
                    set({ queue: newQueue });
                }

                set({ isLoading: false });
            } catch (error) {
                console.error("Failed to update entry in DB", error);
                set({ isLoading: false });
            }
        },

        updateEntryNotes: async (notes) => {
            const { currentEntry, updateEntry } = get();
            if (!currentEntry) return;

            const updatedEntry: CustomEntry = {
                ...currentEntry,
                customLayers: {
                    ...currentEntry.customLayers,
                    notes,
                },
                updatedAt: new Date(),
            };

            await updateEntry(updatedEntry);
        },

        refineItemWithAI: async () => {
            const { currentEntry, updateEntry, isRefining } = get();
            if (!currentEntry || isRefining) return;

            set({ isRefining: true, aiError: null });

            try {
                const response = await fetch("/api/ai/refine", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        prompt: currentEntry.prompt,
                        answer: currentEntry.answer,
                        notes: currentEntry.customLayers?.notes,
                        history: currentEntry.stats.history.slice(-10).map(h => h.quality)
                    })
                });

                if (!response.ok) {
                    const errBody = await response.json().catch(() => ({}));
                    throw new Error(errBody.error || "AI refinement failed");
                }

                const data = await response.json();

                const updatedEntry: CustomEntry = {
                    ...currentEntry,
                    customLayers: {
                        ...currentEntry.customLayers,
                        notes: data.improvedNotes || currentEntry.customLayers?.notes,
                        aiHint: data.improvedHint,
                    },
                    metadata: {
                        ...currentEntry.metadata,
                        aiConfusionPatterns: data.confusionPatterns
                    },
                    updatedAt: new Date(),
                };

                await updateEntry(updatedEntry);
            } catch (error) {
                console.error("AI Refine Error:", error);
                set({ aiError: (error as Error).message || "AI refinement failed" });
            } finally {
                set({ isRefining: false });
            }
        },

        requestTutorExplanation: async (userChoice) => {
            const { currentEntry, aiExplanation, isExplaining } = get();
            if (!currentEntry || aiExplanation || isExplaining) return;

            set({ isExplaining: true, aiError: null });

            try {
                const response = await fetch("/api/ai/tutor", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        prompt: currentEntry.prompt,
                        answer: currentEntry.answer,
                        userChoice,
                        notes: currentEntry.customLayers?.notes
                    })
                });

                if (!response.ok) {
                    const errBody = await response.json().catch(() => ({}));
                    throw new Error(errBody.error || "AI Tutor request failed");
                }

                const data = await response.json();
                set({ aiExplanation: data.explanation });
            } catch (error) {
                console.error("AI Tutor Error:", error);
                set({ aiError: (error as Error).message || "AI Tutor request failed" });
            } finally {
                set({ isExplaining: false });
            }
        },

        analyzeSemanticConfusions: async () => {
            const { currentEntry, isAnalyzingConfusions, updateEntry, suggestedConfusions } = get();
            if (!currentEntry || !currentEntry.id || isAnalyzingConfusions) return;

            set({ isAnalyzingConfusions: true, aiError: null });

            try {
                const pool = await db.customEntries
                    .where('sourceId')
                    .equals(currentEntry.sourceId)
                    .toArray();

                const candidates = pool
                    .filter(e => e.id && e.id !== currentEntry.id)
                    .slice(0, 150)
                    .map(e => ({
                        id: e.id!,
                        prompt: e.prompt,
                        answer: e.answer,
                    }));

                if (candidates.length === 0) {
                    set({ isAnalyzingConfusions: false });
                    return;
                }

                const aiConfusions = await findSemanticConfusionsAI(
                    {
                        id: currentEntry.id,
                        prompt: currentEntry.prompt,
                        answer: currentEntry.answer,
                    },
                    candidates
                );

                const existingRaw = Array.isArray(currentEntry.metadata?.semanticConfusions)
                    ? (currentEntry.metadata.semanticConfusions as SemanticConfusionMeta[])
                    : [];

                const mergedMap = new Map<string, SemanticConfusionMeta>();
                for (const item of existingRaw) {
                    if (item?.id) mergedMap.set(item.id, item);
                }
                for (const item of aiConfusions) {
                    mergedMap.set(item.id, item);
                }

                const mergedList = Array.from(mergedMap.values());
                const updatedEntry: CustomEntry = {
                    ...currentEntry,
                    metadata: {
                        ...currentEntry.metadata,
                        semanticConfusions: mergedList,
                    },
                    updatedAt: new Date(),
                };

                await updateEntry(updatedEntry);

                const entryById = new Map(pool.filter(e => e.id).map(e => [e.id!, e]));
                const aiEntries = aiConfusions
                    .map(c => entryById.get(c.id))
                    .filter((e): e is CustomEntry => Boolean(e));

                const combinedSuggestions = [
                    ...aiEntries,
                    ...suggestedConfusions.filter(s => !aiEntries.some(a => a.id === s.id)),
                ];

                set({
                    suggestedConfusions: combinedSuggestions,
                    semanticReasons: extractSemanticReasons(updatedEntry),
                });
            } catch (error) {
                console.error("Semantic Confusion Analysis Error:", error);
                set({ aiError: (error as Error).message || "Failed to analyze semantic confusions" });
            } finally {
                set({ isAnalyzingConfusions: false });
            }
        },

        nextEntry: async () => {
            const { queue, status } = get();
            if (status !== 'active') return;

            if (queue.length > 0) {
                const { config } = get();
                const [next, ...remaining] = queue;
                // Baseline always shows all meanings flattened
                const resolvedNext = { ...next, answer: resolveAnswer(next, config, true) };
                const options = await generateOptions(resolvedNext, config);

                set({
                    currentEntry: resolvedNext,
                    options,
                    selectedId: null,
                    queue: remaining,
                    isRevealed: false,
                    phase: 'answering',
                    arcadeTimer: 100,
                    isTimeout: false,
                    suggestedConfusions: [],
                    semanticReasons: extractSemanticReasons(resolvedNext),
                    isAnalyzingConfusions: false,
                    isExplaining: false,
                    aiExplanation: null,
                    aiError: null,
                });
            } else {
                set({
                    currentEntry: null,
                    options: [],
                    selectedId: null,
                    queue: [],
                    status: 'finished',
                    isRevealed: false,
                    phase: 'answering',
                    suggestedConfusions: [],
                    semanticReasons: {},
                    isAnalyzingConfusions: false,
                    isExplaining: false,
                    aiExplanation: null,
                    aiError: null,
                });
            }
        },

        tickArcadeTimer: (delta) => {
            const { config, status, phase, arcadeTimer, isRevealed, isLoading, submitAnswer, isFrozen } = get();

            // Easy mode = No timer
            if (!config || config.difficulty === 'easy' ||
                status !== 'active' ||
                phase !== 'answering' ||
                isRevealed ||
                isFrozen ||
                isLoading) return;

            const nextTimer = Math.max(0, arcadeTimer - delta);
            set({ arcadeTimer: nextTimer });

            if (nextTimer <= 0) {
                // AUTO-FAIL on timeout
                set({ isTimeout: true });
                submitAnswer(1); // Quality 1 = Forgot
            }
        },

        recordConfusion: async (targetEntryId) => {
            const { currentEntry, updateEntry } = get();
            if (!currentEntry) return;

            const metadata = { ...currentEntry.metadata };
            const confusions = { ...(metadata.confusions as Record<string, number> || {}) };

            confusions[targetEntryId] = (confusions[targetEntryId] || 0) + 1;
            metadata.confusions = confusions;

            await updateEntry({
                ...currentEntry,
                metadata,
            });
        },

        endSession: () => {
            set({
                status: 'idle',
                phase: 'answering',
                originalEntries: [],
                currentEntry: null,
                options: [],
                selectedId: null,
                queue: [],
                isRevealed: false,
                isLoading: false,
                lastQuality: null,
                mode: QUIZ_MODES.CLASSIC,
                arcadeTimer: 100,
                isTimeout: false,
                suggestedConfusions: [],
                semanticReasons: {},
                isAnalyzingConfusions: false,
                isFrozen: false,
                isRefining: false,
                isExplaining: false,
                aiExplanation: null,
                aiError: null,
                config: null,
            });
        },
    };
});

/**
 * Atomic Selectors for performance optimization (preventing unnecessary re-renders)
 */
export const useQuizActive = () => useQuizStore((state) => state.status === 'active');
export const useQuizFinished = () => useQuizStore((state) => state.status === 'finished');
export const useCurrentEntry = () => useQuizStore((state) => state.currentEntry);
export const useQuizIsRevealed = () => useQuizStore((state) => state.isRevealed);
export const useQuizIsLoading = () => useQuizStore((state) => state.isLoading);
export const useQuizStats = () => useQuizStore((state) => state.stats);
export const useQuizMode = () => useQuizStore((state) => state.mode);
export const useArcadeTimer = () => useQuizStore((state) => state.arcadeTimer);
export const useQuizPhase = () => useQuizStore((state) => state.phase);
export const useQuizIsTimeout = () => useQuizStore((state) => state.isTimeout);
export const useSuggestedConfusions = () => useQuizStore((state) => state.suggestedConfusions);
export const useSemanticReasons = () => useQuizStore((state) => state.semanticReasons);
export const useIsAnalyzingConfusions = () => useQuizStore((state) => state.isAnalyzingConfusions);
export const useIsFrozen = () => useQuizStore((state) => state.isFrozen);
export const useQuizIsRefining = () => useQuizStore((state) => state.isRefining);
export const useQuizIsExplaining = () => useQuizStore((state) => state.isExplaining);
export const useQuizAiExplanation = () => useQuizStore((state) => state.aiExplanation);
export const useQuizAiError = () => useQuizStore((state) => state.aiError);

export const useQuizProgress = () => useQuizStore(
    useShallow((state) => {
        const remaining = state.queue.length + (state.currentEntry ? 1 : 0);
        return {
            current: state.stats.total - remaining + (state.status === 'active' ? 1 : 0),
            total: state.stats.total
        };
    })
);
