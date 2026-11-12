"use client";

import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/services/db_client';
import { useQuizStore, QUIZ_MODES, type QuizMode } from '@/stores/st_quiz';
import { Play, Plus, BookOpen, Trash2, Zap, Download, Snowflake, Rocket, Share2 } from 'lucide-react';
import { exportBundle } from '@/services/io_export';
import { freezeBundle } from '@/services/io_freeze';
import { createBundle } from '@/services/srv_bundle';
import { cn } from '@/lib/utils';
import { type Source } from '@/schemas/zod_models';
import LacunaeSection from './LacunaeSection';
import QuizSetupModal, { type QuizSessionConfig } from './QuizSetupModal';
import BundleItemsModal from './BundleItemsModal';
import PdfImportModal from './PdfImportModal';

interface LibraryViewProps {
    onImportClick: () => void;
}

interface SourceCardProps {
    source: Source;
    onStartQuiz: (source: Source) => void;
    onDelete: (id: string) => Promise<void>;
    onExport: (id: string) => Promise<void>;
    onFreeze: (sourceId: string, currentName: string) => Promise<void>;
    onShare: (sourceId: string) => Promise<void>;
    onInitialize: (source: Source) => Promise<void>;
    onViewItems: (source: Source) => void;
}

export default function LibraryView({ onImportClick }: LibraryViewProps) {
    const sources = useLiveQuery(() => db.sources.toArray());
    const startSession = useQuizStore(state => state.startSession);

    // Setup Modal state
    const [isSetupOpen, setIsSetupOpen] = React.useState(false);
    const [sourceToSetup, setSourceToSetup] = React.useState<Source | null>(null);

    const handleStartQuiz = (source: Source) => {
        setSourceToSetup(source);
        setIsSetupOpen(true);
    };

    // Items Modal state
    const [isItemsOpen, setIsItemsOpen] = React.useState(false);
    const [sourceToView, setSourceToView] = React.useState<Source | null>(null);

    const handleViewItems = (source: Source) => {
        setSourceToView(source);
        setIsItemsOpen(true);
    };

    // PDF Modal state
    const [isPdfOpen, setIsPdfOpen] = React.useState(false);

    const onSetupStart = async (config: QuizSessionConfig) => {
        if (!sourceToSetup) return;

        const entries = await db.customEntries
            .where('sourceId')
            .equals(sourceToSetup.id!)
            .toArray();

        if (entries.length > 0) {
            await startSession(entries, config);
        } else {
            alert("No items found in this bundle.");
        }
    };

    const handleDeleteSource = async (id: string) => {
        if (confirm("Are you sure you want to delete this bundle? This will also delete all stats.")) {
            await db.sources.delete(id);
            await db.customEntries.where('sourceId').equals(id).delete();
        }
    };

    const handleFreeze = async (sourceId: string, currentName: string) => {
        const newName = prompt("Enter a name for the frozen source:", `${currentName} (Frozen)`);
        if (!newName) return;

        try {
            await freezeBundle(sourceId, newName);
            alert("Bundle frozen as a new source! You can now use it as a base for new learning sessions.");
        } catch (e) {
            console.error("Freeze failed", e);
            alert("Failed to freeze bundle.");
        }
    };

    const handleInitializeBundle = async (source: Source) => {
        try {
            await createBundle({
                name: `${source.name} (Active)`,
                type: 'custom',
                rawData: source.originalData as any,
                mapping: {
                    promptField: 'prompt', // Standard for frozen sources
                    answerField: ['answer']
                }
            });
            alert("Knowledge Bundle initialized! You can now start learning.");
        } catch (e) {
            console.error("Initialization failed", e);
            alert("Failed to initialize bundle.");
        }
    };

    const handleShare = async (sourceId: string) => {
        try {
            const source = await db.sources.get(sourceId);
            const entries = await db.customEntries.where('sourceId').equals(sourceId).toArray();

            if (!source || entries.length === 0) {
                alert("Bundle must be initialized before sharing.");
                return;
            }

            const bundle = {
                version: "1.0",
                exportDate: new Date(),
                source,
                entries
            };

            const response = await fetch("/api/marketplace", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bundle })
            });

            if (response.ok) {
                alert("Bundle shared successfully to the Marketplace!");
            } else {
                alert("Failed to share bundle. Are you logged in?");
            }
        } catch (e) {
            console.error("Share failed", e);
            alert("An error occurred while sharing.");
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex justify-between items-end">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Your Library</h1>
                    <p className="text-slate-500 dark:text-slate-400">Master your knowledge bundles.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsPdfOpen(true)}
                        className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-500/20"
                    >
                        <Zap className="h-5 w-5" />
                        <span>AI Import (PDF)</span>
                    </button>
                    <button
                        onClick={onImportClick}
                        className="flex items-center space-x-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 px-6 py-3 rounded-2xl font-bold transition-all"
                    >
                        <Plus className="h-5 w-5" />
                        <span>Manual Import (json, apkg)</span>
                    </button>
                </div>
            </div>

            <LacunaeSection />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sources?.map((source) => (
                    <SourceCard
                        key={source.id}
                        source={source}
                        onStartQuiz={handleStartQuiz}
                        onDelete={handleDeleteSource}
                        onExport={exportBundle}
                        onFreeze={handleFreeze}
                        onShare={handleShare}
                        onInitialize={handleInitializeBundle}
                        onViewItems={handleViewItems}
                    />
                ))}

                {sources?.length === 0 && (
                    <div className="col-span-full py-24 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl space-y-4">
                        <div className="mx-auto w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
                            <Plus className="h-8 w-8" />
                        </div>
                        <div className="space-y-1">
                            <p className="font-bold text-slate-900 dark:text-slate-100">No bundles yet</p>
                            <p className="text-sm text-slate-500">Import your first source to begin learning.</p>
                        </div>
                    </div>
                )}
            </div>

            <QuizSetupModal
                isOpen={isSetupOpen}
                onClose={() => setIsSetupOpen(false)}
                onStart={onSetupStart}
                source={sourceToSetup}
            />

            <BundleItemsModal
                isOpen={isItemsOpen}
                onClose={() => setIsItemsOpen(false)}
                source={sourceToView}
            />

            <PdfImportModal
                isOpen={isPdfOpen}
                onClose={() => setIsPdfOpen(false)}
                onSuccess={() => { }}
            />
        </div>
    );
}

function SourceCard({ source, onStartQuiz, onDelete, onExport, onFreeze, onShare, onInitialize, onViewItems }: SourceCardProps) {
    const entriesCount = useLiveQuery(
        () => db.customEntries.where('sourceId').equals(source.id!).count(),
        [source.id]
    );

    const isActiveBundle = entriesCount !== undefined && entriesCount > 0;

    return (
        <div className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-6 hover:shadow-xl transition-all hover:translate-y-[-4px]">
            <div className="flex justify-between items-start">
                <div className={cn(
                    "p-3 rounded-2xl transition-colors",
                    isActiveBundle
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-blue-600 group-hover:text-white"
                        : "bg-slate-50 dark:bg-slate-900 text-slate-300 border border-slate-100 dark:border-slate-800"
                )}>
                    <BookOpen className="h-6 w-6" />
                </div>
                <div className="flex items-center space-x-1">
                    {isActiveBundle && (
                        <button
                            onClick={() => onFreeze(source.id!, source.name)}
                            className="p-2 text-slate-400 hover:text-cyan-500 transition-colors"
                            title="Freeze as New Source (Baseline)"
                        >
                            <Snowflake className="h-4 w-4" />
                        </button>
                    )}
                    {isActiveBundle && (
                        <button
                            onClick={() => onShare(source.id!)}
                            className="p-2 text-slate-400 hover:text-emerald-500 transition-colors"
                            title="Share to Marketplace"
                        >
                            <Share2 className="h-4 w-4" />
                        </button>
                    )}
                    <button
                        onClick={() => onExport(source.id!)}
                        className="p-2 text-slate-400 hover:text-blue-500 transition-colors"
                        title="Export Source/Bundle"
                    >
                        <Download className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => onDelete(source.id!)}
                        className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                        title="Delete"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                    {isActiveBundle && (
                        <button
                            onClick={() => onViewItems(source)}
                            className="p-2 text-slate-400 hover:text-blue-500 transition-colors"
                            title="View Items List"
                        >
                            <BookOpen className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            <div className="space-y-1">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 truncate">
                        {source.name}
                    </h3>
                    {!isActiveBundle && (
                        <span className="px-2 py-0.5 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 text-[10px] font-black uppercase rounded-full">
                            Pure Source
                        </span>
                    )}
                </div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    {source.type} {isActiveBundle ? "Bundle" : "Baseline"} • {entriesCount ?? 0} items
                </p>
            </div>

            <div className="flex space-x-2">
                {isActiveBundle ? (
                    <button
                        onClick={() => onStartQuiz(source)}
                        className="flex-1 flex items-center justify-center space-x-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:opacity-90 transition-all border border-transparent shadow-lg"
                    >
                        <Play className="h-3 w-3 fill-current" />
                        <span>Start Learning</span>
                    </button>
                ) : (
                    <button
                        onClick={() => onInitialize(source)}
                        className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                    >
                        <Rocket className="h-3 w-3" />
                        <span>Initialize Learning Bundle</span>
                    </button>
                )}
            </div>
        </div>
    );
}
