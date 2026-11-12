"use client";

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/services/db_client';
import { AlertCircle, Brain, Settings2 } from 'lucide-react';
import EditDrawer from '@/components/shared/EditDrawer';
import { CustomEntry } from '@/schemas/zod_models';
import { motion, AnimatePresence } from 'framer-motion';

export default function LacunaeSection() {
    // 1. Cross-browser safe query using boolean true
    const lacunae = useLiveQuery(() =>
        db.customEntries
            .where('metadata.isDeepGap')
            .equals(1)
            .toArray()
    );

    // 2. Fallback to prevent flicker during loading + handle potential index issues
    const activeLacunae = lacunae || [];
    const isLoading = lacunae === undefined;

    const [editingEntry, setEditingEntry] = useState<CustomEntry | null>(null);

    // 3. Hide while loading or if empty
    if (isLoading || activeLacunae.length === 0) return null;

    return (
        <section className="space-y-6 pt-12">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl">
                        <AlertCircle className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center">
                            Priority Focus
                            <span className="ml-3 px-2 py-0.5 bg-rose-500 text-white text-[10px] rounded-full">
                                {activeLacunae.length}
                            </span>
                        </h2>
                        <p className="text-xs text-slate-500 font-medium tracking-tight">Consistently failed items needing mnemonics.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence>
                    {activeLacunae.map((entry) => (
                        <motion.div
                            key={entry.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-start justify-between group hover:border-rose-200 dark:hover:border-rose-900/30 transition-all hover:shadow-lg"
                        >
                            <div className="space-y-3 flex-1">
                                <div className="space-y-1">
                                    <p className="text-xs font-black uppercase tracking-widest text-rose-500/60">Gap Detected</p>
                                    <h4 className="font-bold text-slate-900 dark:text-slate-100 line-clamp-1">{entry.prompt}</h4>
                                    <p className="text-sm text-slate-500 line-clamp-1">{entry.answer}</p>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-1 text-[10px] font-bold text-slate-400">
                                        <Brain className="h-3 w-3" />
                                        <span>{entry.stats.history.filter(h => h.quality < 3).length} Failures</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setEditingEntry(entry)}
                                aria-label={`Fix mnemonic for ${entry.prompt}`}
                                className="ml-4 p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all flex items-center space-x-2 group/btn"
                            >
                                <Settings2 className="h-4 w-4 group-hover/btn:rotate-90 transition-transform" />
                                <span className="text-[10px] font-black uppercase pr-1">Fix</span>
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            <EditDrawer
                isOpen={!!editingEntry}
                onClose={() => setEditingEntry(null)}
                entry={editingEntry as CustomEntry}
            />
        </section>
    );
}
