"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Search, Download, ExternalLink, Box, Sparkles, CheckCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KnowledgeBundle } from '@/schemas/zod_models';
import { db } from '@/services/db_client';

export default function MarketplaceView() {
    const [bundles, setBundles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [cloningId, setCloningId] = useState<string | null>(null);

    useEffect(() => {
        fetchMarketplace();
    }, []);

    const fetchMarketplace = async () => {
        try {
            const res = await fetch("/api/marketplace");
            const data = await res.json();
            setBundles(data.bundles || []);
        } catch (error) {
            console.error("Marketplace Load Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleClone = async (bundle: KnowledgeBundle) => {
        if (!bundle.source.id) return;
        setCloningId(bundle.source.id);
        try {
            // 1. Check if we already have this sourceId
            const existing = await db.sources.get(bundle.source.id);
            if (existing) {
                alert("You already have this bundle in your library.");
                return;
            }

            // 2. Add to Dexie
            await db.transaction("rw", db.sources, db.customEntries, async () => {
                await db.sources.add(bundle.source);
                await db.customEntries.bulkAdd(bundle.entries);
            });

            alert(`Successfully cloned "${bundle.source.name}"!`);
        } catch (error) {
            console.error("Clone Error:", error);
            alert("Failed to clone bundle.");
        } finally {
            setCloningId(null);
        }
    };

    const filteredBundles = bundles.filter(b =>
        b.source.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex-1 flex flex-col p-6 md:p-10 space-y-8 max-w-7xl mx-auto w-full">
            {/* Header section with search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3 text-blue-500">
                        <ShoppingBag className="h-8 w-8" />
                        <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Marketplace</h1>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                        Discover community-driven knowledge bundles. Clone them to your local library.
                    </p>
                </div>

                <div className="relative group max-w-md w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search bundles..."
                        className="w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl py-3 pl-12 pr-4 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-all font-medium"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                    {loading ? (
                        Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)
                    ) : filteredBundles.length > 0 ? (
                        filteredBundles.map((bundle) => (
                            <MarketplaceCard
                                key={bundle.source.id}
                                bundle={bundle}
                                onClone={() => handleClone(bundle)}
                                isCloning={cloningId === bundle.source.id}
                            />
                        ))
                    ) : (
                        <div className="col-span-full py-20 text-center space-y-4">
                            <Box className="h-16 w-16 text-slate-200 dark:text-slate-800 mx-auto" />
                            <p className="text-slate-400 font-bold">No bundles found matching your search.</p>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

function MarketplaceCard({ bundle, onClone, isCloning }: { bundle: any, onClone: () => void, isCloning: boolean }) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ y: -5 }}
            className="group bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[32px] p-6 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 hover:border-blue-500/20 transition-all duration-500 flex flex-col h-full"
        >
            <div className="flex justify-between items-start mb-6">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl group-hover:scale-110 transition-transform duration-500">
                    {bundle.source.type === 'anki' ? <Sparkles className="h-6 w-6" /> : <Box className="h-6 w-6" />}
                </div>
                <div className="flex gap-2">
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-full">
                        {bundle.entries.length} Items
                    </span>
                </div>
            </div>

            <div className="space-y-2 flex-1">
                <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                    {bundle.source.name}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                    {bundle.source.metadata?.description || "A community shared knowledge bundle for masters."}
                </p>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="h-6 w-6 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full" />
                    <span className="text-xs font-bold text-slate-400">Community</span>
                </div>

                <button
                    onClick={onClone}
                    disabled={isCloning}
                    className={cn(
                        "flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
                        isCloning
                            ? "bg-emerald-500 text-white"
                            : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-95"
                    )}
                >
                    {isCloning ? (
                        <>
                            <CheckCircle className="h-4 w-4 animate-bounce" />
                            <span>Cloning...</span>
                        </>
                    ) : (
                        <>
                            <Download className="h-4 w-4" />
                            <span>Clone Bundle</span>
                        </>
                    )}
                </button>
            </div>
        </motion.div>
    );
}

function SkeletonCard() {
    return (
        <div className="bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-[32px] p-6 h-[250px] animate-pulse">
            <div className="flex justify-between items-start mb-6">
                <div className="h-14 w-14 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
                <div className="h-6 w-20 bg-slate-200 dark:bg-slate-800 rounded-full" />
            </div>
            <div className="space-y-3">
                <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded-lg" />
                <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            </div>
        </div>
    );
}
