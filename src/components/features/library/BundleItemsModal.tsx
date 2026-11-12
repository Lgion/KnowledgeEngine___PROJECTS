"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, FileText, Filter } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/services/db_client';
import { Source, CustomEntry } from '@/schemas/zod_models';
import { cn } from '@/lib/utils';

interface BundleItemsModalProps {
    isOpen: boolean;
    onClose: () => void;
    source: Source | null;
}

export default function BundleItemsModal({ isOpen, onClose, source }: BundleItemsModalProps) {
    const [searchQuery, setSearchQuery] = useState('');

    const items = useLiveQuery(
        async () => {
            if (!source?.id) return [];
            return await db.customEntries
                .where('sourceId')
                .equals(source.id)
                .toArray();
        },
        [source?.id]
    ) as CustomEntry[] | undefined;

    const filteredItems = items?.filter(item => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            item.prompt.toLowerCase().includes(q) ||
            item.answer.toLowerCase().includes(q) ||
            (item.customLayers?.['notes'] as string)?.toLowerCase().includes(q)
        );
    }) || [];

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="ficheBundle relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shrink-0 z-10">
                            <div className="space-y-1">
                                <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                    <FileText className="h-6 w-6 text-blue-500" />
                                    <span>Bundle Content</span>
                                </h2>
                                <p className="text-sm text-slate-500 font-medium">
                                    Viewing {filteredItems.length} items from <span className="font-bold text-slate-700 dark:text-slate-300">{source?.name}</span>
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                            >
                                <X className="h-6 w-6 text-slate-400" />
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search prompts, answers, or notes..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-800 border-none rounded-xl py-3 pl-10 pr-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
                                />
                            </div>
                        </div>

                        {/* Items List */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 custom-scrollbar bg-slate-50 dark:bg-slate-950">
                            {filteredItems.length > 0 ? (
                                filteredItems.map((item) => (
                                    <div
                                        key={item.id}
                                        className="ficheBundle_line bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 hover:border-blue-400 dark:hover:border-blue-700 transition-all group"
                                    >
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex-1 space-y-1">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                                    Prompt
                                                    {!!item.customLayers?.['notes'] && <span className="text-blue-500">• Has Notes</span>}
                                                </span>
                                                <p className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
                                                    {item.prompt}
                                                </p>
                                            </div>

                                            <div className="md:text-right flex-1 space-y-1 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800 md:pl-6 md:border-l">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                                                    Answer
                                                </span>
                                                <div className="ficheBundle_lineAnswers flex flex-wrap gap-2 md:justify-end">
                                                    {(() => {
                                                        const mapping = (source?.metadata as any)?.mapping;
                                                        const answerFields = mapping?.answerField as string[] | undefined;
                                                        const rawData = item.customLayers?.rawData as any;

                                                        if (answerFields && answerFields.length > 0 && rawData) {
                                                            return answerFields.map((field) => {
                                                                const val = rawData[field];
                                                                if (val === undefined || val === null || val === "") return null;

                                                                const displayVal = Array.isArray(val) ? val.join(", ") : String(val);

                                                                return (
                                                                    <div
                                                                        key={field}
                                                                        title={field}
                                                                        className="px-3 py-1 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors cursor-help"
                                                                    >
                                                                        {displayVal}
                                                                    </div>
                                                                );
                                                            });
                                                        }

                                                        // Fallback if no mapping info
                                                        return (
                                                            <p className="text-base font-medium text-slate-700 dark:text-slate-300">
                                                                {item.answer}
                                                            </p>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Optional: Show Notes if they exist */}
                                        {!!item.customLayers?.['notes'] && (
                                            <div className="mt-3 text-xs bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg text-slate-600 dark:text-slate-400 italic">
                                                Note: {String(item.customLayers['notes'])}
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-20 opacity-50">
                                    <Filter className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                                    <p className="font-bold text-slate-400">No items found matching your search.</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
