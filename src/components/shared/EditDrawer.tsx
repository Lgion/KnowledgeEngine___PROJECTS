"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuizStore, useQuizIsLoading } from '@/stores/st_quiz';
import { Loader2, X, Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CustomEntry } from '@/schemas/zod_models';

interface EditDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    entry: CustomEntry;
}

export default function EditDrawer({ isOpen, onClose, entry }: EditDrawerProps) {
    const isLoading = useQuizIsLoading();

    if (!isOpen || !entry) return null;

    const initialNotes = (entry?.customLayers?.notes as string) || "";

    return (
        <AnimatePresence>
            {isOpen && (
                <EditDrawerContent
                    key={`${entry.id}-${isOpen}`}
                    entry={entry}
                    initialNotes={initialNotes}
                    isLoading={isLoading}
                    onClose={onClose}
                />
            )}
        </AnimatePresence>
    );
}

function EditDrawerContent({
    entry,
    initialNotes,
    isLoading,
    onClose
}: {
    entry: CustomEntry,
    initialNotes: string,
    isLoading: boolean,
    onClose: () => void
}) {
    const updateEntry = useQuizStore(state => state.updateEntry);
    const [notes, setNotes] = useState(initialNotes);
    const [aiHint, setAiHint] = useState<string | undefined>(entry.customLayers?.aiHint as string | undefined);
    const [aiConfusionPatterns, setAiConfusionPatterns] = useState<string | undefined>(entry.metadata?.aiConfusionPatterns as string | undefined);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    const isDirty = notes !== initialNotes || aiHint !== entry.customLayers?.aiHint || aiConfusionPatterns !== entry.metadata?.aiConfusionPatterns;

    const handleSuggestMnemonic = async () => {
        if (isSuggesting) return;
        setIsSuggesting(true);
        setAiError(null);
        try {
            const response = await fetch("/api/ai/refine", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: entry.prompt,
                    answer: entry.answer,
                    notes,
                    history: entry.stats.history.slice(-10).map(h => h.quality),
                }),
            });
            if (!response.ok) {
                const errBody = await response.json().catch(() => ({}));
                throw new Error(errBody.details || errBody.error || "Failed to generate mnemonic");
            }
            const data = await response.json();
            if (data.improvedNotes) setNotes(data.improvedNotes);
            if (data.improvedHint) setAiHint(data.improvedHint);
            if (data.confusionPatterns) setAiConfusionPatterns(data.confusionPatterns);
        } catch (err) {
            setAiError((err as Error).message || "Failed to generate mnemonic");
        } finally {
            setIsSuggesting(false);
        }
    };

    const handleSave = async () => {
        if (isLoading) return;

        const updatedEntry: CustomEntry = {
            ...entry,
            customLayers: {
                ...entry.customLayers,
                notes,
                ...(aiHint ? { aiHint } : {}),
            },
            metadata: {
                ...entry.metadata,
                ...(aiConfusionPatterns ? { aiConfusionPatterns } : {}),
            },
            updatedAt: new Date(),
        };

        await updateEntry(updatedEntry);
        setIsSuccess(true);
        setTimeout(() => onClose(), 800);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        }
    };

    const handleCloseAttempt = () => {
        if (isDirty && !isSuccess) {
            if (window.confirm("You have unsaved changes. Are you sure you want to close?")) {
                onClose();
            }
        } else {
            onClose();
        }
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleCloseAttempt}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
            />
            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-[32px] p-8 z-[70] max-h-[85vh] overflow-y-auto shadow-2xl"
                onKeyDown={handleKeyDown}
            >
                <div className="max-w-xl mx-auto space-y-8">
                    <div className="flex justify-between items-center">
                        <div className="space-y-1">
                            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Edit Knowledge</h3>
                            <p className="text-xs text-slate-500 font-medium">Customize this entry in your local bundle.</p>
                        </div>
                        <button
                            onClick={handleCloseAttempt}
                            aria-label="Close edit drawer"
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                        >
                            <X className="h-5 w-5 text-slate-400" />
                        </button>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Prompt / Question</label>
                            <p className="font-bold text-slate-900 dark:text-slate-100">{entry?.prompt}</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Answer</label>
                            <p className="font-bold text-emerald-500">{entry?.answer}</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center gap-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mnemonics & Notes</label>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={handleSuggestMnemonic}
                                        disabled={isSuggesting}
                                        className="px-3 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors disabled:opacity-50"
                                    >
                                        {isSuggesting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                                        <span>{isSuggesting ? "Designing..." : "Suggest with Gemini 4 Argon"}</span>
                                    </button>
                                    <span className="text-[8px] text-slate-400 font-bold uppercase hidden sm:inline">⌘ + Enter to save</span>
                                </div>
                            </div>
                            {aiError && (
                                <p className="text-xs text-rose-500 font-medium">{aiError}</p>
                            )}
                            <textarea
                                autoFocus
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add your mnemonic here to help you remember..."
                                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 min-h-[120px] resize-none text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>
                        <div className="flex space-x-3">
                            <button
                                onClick={handleCloseAttempt}
                                className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isLoading || isSuccess || (!isDirty && !isSuccess)}
                                className={cn(
                                    "flex-[2] py-4 rounded-xl font-bold text-sm uppercase tracking-widest transition-all flex items-center justify-center space-x-2",
                                    isSuccess
                                        ? "bg-emerald-500 text-white"
                                        : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:shadow-none"
                                )}
                            >
                                {isLoading ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : isSuccess ? (
                                    <>
                                        <Check className="h-5 w-5" />
                                        <span>Saved!</span>
                                    </>
                                ) : (
                                    <span>Save Changes</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </>
    );
}
