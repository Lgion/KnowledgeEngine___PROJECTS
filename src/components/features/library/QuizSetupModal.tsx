"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Clock, Zap, Target, BookOpen, CheckCircle, List, Brain, Info, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Source } from '@/schemas/zod_models';
import { db } from '@/services/db_client';

interface QuizSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onStart: (config: QuizSessionConfig) => void;
    source: Source | null;
}

export type QuizDifficulty = 'easy' | 'medium' | 'hard';
export type ArrayMode = 'all' | 'random';
export type QuizStrategy = 'random' | 'srs_due' | 'least_mastered';

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

export default function QuizSetupModal({ isOpen, onClose, onStart, source }: QuizSetupModalProps) {
    const [targetField, setTargetField] = useState<string>('');
    const [availableFields, setAvailableFields] = useState<string[]>([]);

    const [itemCount, setItemCount] = useState<number>(0);
    const [optionsCount, setOptionsCount] = useState<number>(4);
    const [strategy, setStrategy] = useState<QuizStrategy>('random');
    const [autoShowNotes, setAutoShowNotes] = useState<boolean>(true);
    const [autoShowHints, setAutoShowHints] = useState<boolean>(false);

    const [difficulty, setDifficulty] = useState<QuizDifficulty>('medium');
    const [arrayMode, setArrayMode] = useState<ArrayMode>('random');
    const [maxItems, setMaxItems] = useState<number>(0);

    useEffect(() => {
        const initData = async () => {
            if (source?.metadata?.mapping) {
                const mapping = source.metadata.mapping as { answerField?: string[] };
                const fields = mapping.answerField || [];
                setAvailableFields(fields);
                setTargetField(fields[0] || '');

                const totalItems = (source.metadata.itemCount as any) || 0;
                setMaxItems(totalItems);

                // Calculate due items for SRS-aware default
                if (source.id) {
                    const now = new Date();
                    const entries = await db.customEntries
                        .where('sourceId')
                        .equals(source.id)
                        .toArray();

                    const dueItems = entries.filter(e =>
                        !e.stats.nextReview || new Date(e.stats.nextReview) <= now
                    );

                    if (dueItems.length > 0) {
                        setItemCount(dueItems.length);
                        setStrategy('srs_due'); // Default to SRS due strategy if items are due
                    } else {
                        setItemCount(totalItems);
                        setStrategy('random');
                    }
                } else {
                    setItemCount(totalItems);
                }
            }
        };

        if (isOpen) {
            initData();
        }
    }, [source, isOpen]);

    const handleStart = () => {
        const timerDurations: Record<QuizDifficulty, number | null> = {
            'easy': null,
            'medium': 30,
            'hard': 10
        };

        onStart({
            targetField,
            arrayMode,
            difficulty,
            timerDuration: timerDurations[difficulty],
            itemCount,
            strategy,
            autoShowNotes,
            optionsCount,
            autoShowHints,
            tipFields: (source?.metadata?.mapping as any)?.tipFields || []
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg my-auto"
                >
                    <div className="p-6 space-y-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
                        <div className="text-center space-y-1">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Quiz Session Setup</h2>
                            <p className="text-slate-500 text-sm">Fine-tune your learning experience</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left Column: Core Settings */}
                            <div className="space-y-6">
                                {/* Target Field Selection */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Field (Answer)</label>
                                    <div className="relative">
                                        <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <select
                                            value={targetField}
                                            onChange={(e) => setTargetField(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        >
                                            {availableFields.map(field => (
                                                <option key={field} value={field}>{field}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Options Count */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Options per Question</label>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex gap-1">
                                            {[2, 4, 6].map(count => (
                                                <button
                                                    key={count}
                                                    onClick={() => setOptionsCount(count)}
                                                    className={cn(
                                                        "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all",
                                                        optionsCount === count
                                                            ? "bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white"
                                                            : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                                                    )}
                                                >
                                                    {count}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Difficulty Selection */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Timer & Pressure</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['easy', 'medium', 'hard'] as QuizDifficulty[]).map((d) => (
                                            <button
                                                key={d}
                                                onClick={() => setDifficulty(d)}
                                                className={cn(
                                                    "p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all",
                                                    difficulty === d
                                                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                                                        : "border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                                                )}
                                            >
                                                {d === 'easy' && <BookOpen className="w-5 h-5" />}
                                                {d === 'medium' && <Clock className="w-5 h-5" />}
                                                {d === 'hard' && <Zap className="w-5 h-5" />}
                                                <div className="text-[10px] font-black uppercase tracking-tighter">{d}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Item Count */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quantity</label>
                                    <div className="flex items-center gap-3">
                                        <div className="relative flex-1">
                                            <input
                                                type="number"
                                                min={1}
                                                max={maxItems}
                                                value={itemCount}
                                                onChange={(e) => setItemCount(Math.min(maxItems, Math.max(1, parseInt(e.target.value) || 1)))}
                                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <button
                                            onClick={() => setItemCount(maxItems)}
                                            className={cn(
                                                "p-2.5 rounded-xl border transition-all flex items-center justify-center gap-2",
                                                itemCount === maxItems
                                                    ? "bg-blue-600 border-blue-600 text-white"
                                                    : "border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                                            )}
                                            title="Select all items"
                                        >
                                            <Check className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Logic & Display */}
                            <div className="space-y-6">
                                {/* Strategy Selection */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Selection Logic</label>
                                    <div className="space-y-2">
                                        {(['random', 'srs_due', 'least_mastered'] as QuizStrategy[]).map((s) => (
                                            <button
                                                key={s}
                                                onClick={() => setStrategy(s)}
                                                className={cn(
                                                    "w-full px-4 py-3 rounded-xl border flex items-center justify-between transition-all",
                                                    strategy === s
                                                        ? "bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 shadow-sm"
                                                        : "border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {s === 'random' && <List className="w-4 h-4" />}
                                                    {s === 'srs_due' && <Brain className="w-4 h-4" />}
                                                    {s === 'least_mastered' && <Target className="w-4 h-4" />}
                                                    <span className="font-bold text-xs">
                                                        {s === 'random' && "Random Shuffle"}
                                                        {s === 'srs_due' && "SRS: Due Items"}
                                                        {s === 'least_mastered' && "SRS: Focus Weakness"}
                                                    </span>
                                                </div>
                                                {strategy === s && <CheckCircle className="w-4 h-4" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Array Handling */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Answer Strategy</label>
                                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                        {(['random', 'all'] as ArrayMode[]).map((m) => (
                                            <button
                                                key={m}
                                                onClick={() => setArrayMode(m)}
                                                className={cn(
                                                    "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                                    arrayMode === m
                                                        ? "bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white"
                                                        : "text-slate-500 dark:text-slate-400"
                                                )}
                                            >
                                                {m === 'random' ? "1 in Random" : "All in flatten display"}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Note & Tip Settings */}
                        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <label className="flex items-center justify-between cursor-pointer group p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <div className="space-y-0.5">
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-500 transition-colors group-hover:text-slate-900 dark:group-hover:text-white">Auto-Show Notes</span>
                                    <p className="text-[10px] text-slate-400">Open automatically on start</p>
                                </div>
                                <div
                                    onClick={() => setAutoShowNotes(!autoShowNotes)}
                                    className={cn(
                                        "w-10 h-5 rounded-full relative transition-colors",
                                        autoShowNotes ? "bg-blue-500" : "bg-slate-200 dark:bg-slate-700"
                                    )}
                                >
                                    <motion.div
                                        animate={{ x: autoShowNotes ? 22 : 2 }}
                                        className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm"
                                    />
                                </div>
                            </label>

                            <label className="flex items-center justify-between cursor-pointer group p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-l-0 md:border-l border-slate-100 dark:border-slate-800">
                                <div className="space-y-0.5">
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-500 transition-colors group-hover:text-slate-900 dark:group-hover:text-white">Auto-Show Hints</span>
                                    <p className="text-[10px] text-slate-400">Open hints automatically</p>
                                </div>
                                <div
                                    onClick={() => setAutoShowHints(!autoShowHints)}
                                    className={cn(
                                        "w-10 h-5 rounded-full relative transition-colors",
                                        autoShowHints ? "bg-amber-500" : "bg-slate-200 dark:bg-slate-700"
                                    )}
                                >
                                    <motion.div
                                        animate={{ x: autoShowHints ? 22 : 2 }}
                                        className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm"
                                    />
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-4 px-4 rounded-2xl font-black uppercase tracking-widest text-[10px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-all border border-slate-200 dark:border-slate-800"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleStart}
                            className="flex-[2] py-4 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                        >
                            <Play className="w-4 h-4 fill-current" />
                            <span>Ignite Session</span>
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
