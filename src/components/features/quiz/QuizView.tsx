"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    useQuizStore,
    useCurrentEntry,
    useQuizIsRevealed,
    useQuizStats,
    useQuizProgress,
    useQuizIsLoading,
    useSuggestedConfusions,
    resolveHint,
    useIsFrozen,
    useQuizIsRefining,
    useQuizAiExplanation,
    type HintItem
} from '@/stores/st_quiz';
import { Award, RotateCcw, ArrowRight, Target, FileText, ChevronRight, Zap, TimerOff, GitCompare, AlertOctagon, Lightbulb, CheckCircle2, XCircle, Pause, Play, StickyNote, Sparkles } from 'lucide-react';
import EditDrawer from '@/components/shared/EditDrawer';
import ArcadeIndicator from './ArcadeIndicator';
import { cn } from '@/lib/utils';
import { CustomEntry } from '@/schemas/zod_models';
import BundleItemsModal from '../library/BundleItemsModal';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/services/db_client';

const getMasteryStatus = (repetition: number) => {
    if (repetition > 5) return { label: 'Expert', color: 'text-cyan-500' };
    if (repetition > 2) return { label: 'Intermediate', color: 'text-emerald-500' };
    return { label: 'Learning', color: 'text-slate-400' };
};

const useIsFailure = () => {
    const lastQuality = useQuizStore(state => state.lastQuality);
    return lastQuality !== null && lastQuality < 3;
};

const useIsTimeout = () => {
    return useQuizStore(state => state.isTimeout);
};

export default function QuizView() {
    const status = useQuizStore(state => state.status);
    const entry = useCurrentEntry();
    const isRevealed = useQuizIsRevealed();
    const toggleFreeze = useQuizStore(state => state.toggleFreeze);
    const endSession = useQuizStore(state => state.endSession);
    const isFrozen = useIsFrozen();
    const [isItemsModalOpen, setIsItemsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [resumeMessage, setResumeMessage] = useState<string | null>(null);

    const source = useLiveQuery(() =>
        entry?.sourceId ? db.sources.get(entry.sourceId) : Promise.resolve(null),
        [entry?.sourceId]
    ) ?? null;

    const handleToggleFreeze = () => {
        if (isFrozen) {
            setResumeMessage("You paused the quiz and resumed it again, so this item will be shift in an other position in this quiz list items");
            setTimeout(() => setResumeMessage(null), 4000);
        }
        toggleFreeze();
    };

    // Reset baseline view when entry changes
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsItemsModalOpen(false);
        setResumeMessage(null);
    }, [entry?.id]);

    if (status === 'idle') {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500 h-[100dvh]">
                <RotateCcw className="h-12 w-12 mb-4 animate-spin-slow" />
                <p>Loading session...</p>
            </div>
        );
    }

    if (status === 'finished') {
        return <QuizSummary />;
    }

    return (
        <div className="h-[100dvh] flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
            {/* Top Bar - Pinned */}
            <div className="w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 z-30 px-6 py-3 shrink-0 flex items-center justify-between gap-4">
                <div className="flex-1 max-w-4xl mx-auto space-y-3">
                    <ArcadeIndicator />
                    <QuizProgressBar />
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleToggleFreeze}
                        disabled={isRevealed} // Disabled until next item
                        className={cn(
                            "p-3 rounded-xl border transition-all shrink-0 relative",
                            isFrozen
                                ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30"
                                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300",
                            isRevealed && "opacity-50 cursor-not-allowed"
                        )}
                        title={isFrozen ? "Resume Quiz" : "Pause Quiz"}
                    >
                        {isFrozen ? <Play className="h-5 w-5 fill-current" /> : <Pause className="h-5 w-5 fill-current" />}
                    </button>

                    <button
                        onClick={() => {
                            if (window.confirm("Are you sure you want to quit this session? Progress will be saved.")) {
                                endSession();
                            }
                        }}
                        className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all shrink-0"
                        title="Quit Session"
                    >
                        <XCircle className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col py-4 px-4 md:px-8">
                <AnimatePresence mode="wait">
                    {entry && (
                        <QuizActiveSession
                            key={entry.id}
                            entry={entry}
                            isRevealed={isRevealed}
                        />
                    )}
                </AnimatePresence>
            </div>

            {/* Bottom Bar - Conditional & Pinned */}
            <AnimatePresence>
                {isRevealed && (
                    <motion.div
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        exit={{ y: 100 }}
                        className="w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 z-30 px-6 py-6 shrink-0"
                    >
                        <div className="max-w-4xl mx-auto">
                            <QuizPostChoiceControls
                                setIsItemsModalOpen={setIsItemsModalOpen}
                                setIsEditing={setIsEditing}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <BundleItemsModal
                isOpen={isItemsModalOpen}
                onClose={() => setIsItemsModalOpen(false)}
                source={source as import('@/schemas/zod_models').Source | null}
            />

            <AnimatePresence>
                {resumeMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -50, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: -50, x: '-50%' }}
                        className="fixed top-24 left-1/2 z-[100] bg-slate-900/90 dark:bg-white/90 text-white dark:text-slate-900 px-6 py-4 rounded-2xl shadow-2xl max-w-sm text-center backdrop-blur-md border border-slate-700 dark:border-slate-200"
                    >
                        <p className="text-sm font-medium leading-relaxed">{resumeMessage}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {entry && (
                <EditDrawer
                    isOpen={isEditing}
                    onClose={() => setIsEditing(false)}
                    entry={entry}
                />
            )}

            <TimeoutOverlay />
        </div>
    );
}

function QuizActiveSession({ entry, isRevealed }: { entry: CustomEntry, isRevealed: boolean }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col max-w-4xl mx-auto w-full space-y-6 pt-10"
        >
            <div className="question_quiz flex flex-col items-center justify-center relative min-h-[250px] shrink-0">
                <QuizCard entry={entry} isRevealed={isRevealed} />
                <NotesButton entry={entry} />
                <HintButton entry={entry} />
                <ReflexHitOverlay entry={entry} />
            </div>

            <div className="answers_quiz flex-1 min-h-[120px]">
                <QuizOptionsGrid isRevealed={isRevealed} currentEntryId={entry.id || ''} />
            </div>
        </motion.div>
    );
}

function QuizProgressBar() {
    const { current, total } = useQuizProgress();
    const percentage = total > 0 ? (current / total) * 100 : 0;

    return (
        <div className="quiz_progress w-full space-y-1.5">
            <div style={{ "margin": "0" }} className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                <span>Quiz Progress</span>
                <span>{current} / {total}</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                />
            </div>
        </div>
    );
}

function QuizOptionsGrid({ isRevealed, currentEntryId }: { isRevealed: boolean, currentEntryId: string }) {
    const options = useQuizStore(state => state.options);
    const makeChoice = useQuizStore(state => state.makeChoice);
    const selectedId = useQuizStore(state => state.selectedId);
    const isLoading = useQuizIsLoading();
    const nextEntry = useQuizStore(state => state.nextEntry);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            {options.map((option, idx) => {
                const isSelected = !!option.id && selectedId === option.id;
                const isCorrect = !!option.id && option.id === currentEntryId;

                let buttonStyle = "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-blue-500/50";
                let textStyle = "text-slate-700 dark:text-slate-200";

                if (isRevealed) {
                    if (isCorrect) {
                        buttonStyle = "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)] cursor-pointer hover:scale-[1.02]";
                        textStyle = "text-emerald-700 dark:text-emerald-300";
                    } else if (isSelected && !isCorrect) {
                        buttonStyle = "bg-rose-50 dark:bg-rose-900/20 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.2)]";
                        textStyle = "text-rose-700 dark:text-rose-300";
                    } else {
                        buttonStyle = "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-60";
                    }
                }

                const handleClick = () => {
                    if (!isRevealed) {
                        makeChoice(option.id || '');
                    } else if (isCorrect) {
                        // Click correct answer to proceed
                        nextEntry();
                    }
                };

                return (
                    <motion.button
                        key={option.id || idx}
                        disabled={isLoading || (isRevealed && !isCorrect)}
                        onClick={handleClick}
                        whileHover={!isRevealed || (isRevealed && isCorrect) ? { scale: 1.02 } : {}}
                        whileTap={!isRevealed || (isRevealed && isCorrect) ? { scale: 0.98 } : {}}
                        className={cn(
                            "group relative p-4 rounded-2xl border-2 transition-all duration-300 text-left overflow-hidden",
                            buttonStyle
                        )}
                    >
                        <div className="relative z-10 flex items-center justify-between">
                            <div className="space-y-1 w-full">
                                <span className={cn(
                                    "text-[9px] font-black uppercase tracking-[0.2em] transition-colors",
                                    isRevealed && isCorrect ? "text-emerald-500" : isRevealed && isSelected ? "text-rose-500" : "text-slate-400"
                                )}>
                                    Option {idx + 1}
                                </span>
                                <p className={cn("text-base font-bold transition-colors", textStyle)}>
                                    {option.answer}
                                </p>
                                {/* Show prompt for wrong answers when revealed */}
                                {isRevealed && !isCorrect && option.prompt && (
                                    <p className="text-[10px] text-slate-400 mt-1 italic border-t border-slate-200 dark:border-slate-700 pt-1">
                                        Matches: {option.prompt}
                                    </p>
                                )}
                                {isRevealed && isCorrect && (
                                    <div className="mt-2 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider animate-pulse">
                                        <span>Tap to Continue</span>
                                        <ChevronRight className="h-3 w-3" />
                                    </div>
                                )}
                            </div>

                            {isRevealed && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="shrink-0 ml-3"
                                >
                                    {isCorrect && <CheckCircle2 className="h-6 w-6 text-emerald-500" />}
                                    {isSelected && !isCorrect && <XCircle className="h-6 w-6 text-rose-500" />}
                                </motion.div>
                            )}
                        </div>
                    </motion.button>
                );
            })}
        </div>
    );
}

interface PostChoiceProps {
    setIsItemsModalOpen: (open: boolean) => void;
    setIsEditing: (editing: boolean) => void;
}

function QuizPostChoiceControls({ setIsItemsModalOpen, setIsEditing }: PostChoiceProps) {
    const isFailure = useIsFailure();
    const suggestedConfusions = useSuggestedConfusions();
    const isRefining = useQuizIsRefining();
    const refineWithAI = useQuizStore(state => state.refineItemWithAI);
    const requestTutor = useQuizStore(state => state.requestTutorExplanation);
    const selectedId = useQuizStore(state => state.selectedId);
    const options = useQuizStore(state => state.options);
    const selectedText = options.find(o => o.id === selectedId)?.answer;

    // Controls now float as absolute elements in layout
    return (
        <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
            {/* Floating Action Buttons */}
            <div className="pointer-events-auto flex items-center gap-3">
                {isFailure && (
                    <button
                        onClick={() => requestTutor(selectedText)}
                        disabled={isRefining}
                        className={cn(
                            "postChoice_tutor p-4 rounded-full shadow-xl transition-all border-2 group bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:scale-110",
                            isRefining ? "animate-pulse opacity-70 cursor-not-allowed" : "cursor-pointer"
                        )}
                        title="Explique-moi (AI Tutor)"
                    >
                        <Lightbulb className={cn(
                            "h-5 w-5 transition-colors",
                            isRefining ? "text-amber-500 fill-amber-200" : "text-slate-500 group-hover:text-amber-500"
                        )} />
                    </button>
                )}

                <button
                    onClick={() => refineWithAI()}
                    disabled={isRefining}
                    className={cn(
                        "postChoice_finetuneWithAI p-4 rounded-full shadow-xl transition-all border-2 group bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:scale-110",
                        isRefining ? "animate-pulse opacity-70 cursor-not-allowed" : "cursor-pointer"
                    )}
                    title="Fine-tune with AI"
                >
                    <Sparkles className={cn(
                        "h-5 w-5 transition-colors",
                        isRefining ? "text-purple-500 fill-purple-200" : "text-slate-500 group-hover:text-purple-500"
                    )} />
                </button>

                <button
                    onClick={() => setIsItemsModalOpen(true)}
                    className={cn(
                        "postChoice_viewList p-4 rounded-full shadow-xl transition-all border-2 group bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800 hover:scale-110"
                    )}
                    title="View Items List"
                >
                    <FileText className="h-5 w-5 group-hover:text-blue-500 transition-colors" />
                </button>

                <button
                    onClick={() => setIsEditing(true)}
                    className="postChoice_commentItem p-4 bg-white dark:bg-slate-900 text-slate-500 border-2 border-slate-200 dark:border-slate-800 rounded-full shadow-xl hover:scale-110 transition-all group pointer-events-auto"
                    title="Quick Edit"
                >
                    <StickyNote className="h-5 w-5 group-hover:text-amber-500 transition-colors" />
                </button>
            </div>

            {isFailure && suggestedConfusions.length > 0 && (
                <div className="pointer-events-auto bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-amber-200 dark:border-amber-800 mt-2 max-w-sm">
                    <SuggestedConfusions list={suggestedConfusions} />
                </div>
            )}
        </div>
    );
}

function SuggestedConfusions({ list }: { list: CustomEntry[] }) {
    const [exploringId, setExploringId] = useState<string | null>(null);

    return (
        <div className="space-y-3 pt-2">
            <div className="flex items-center space-x-2 text-amber-500 animate-pulse justify-center">
                <GitCompare className="h-3.5 w-3.5" />
                <span className="text-[9px] font-black uppercase tracking-widest text-center">Potential Confusion Patterns Detected</span>
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
                {list.map((d) => (
                    <button
                        key={d.id}
                        onClick={() => setExploringId(exploringId === d.id ? null : (d.id || null))}
                        style={{ "fontSize": "1em" }}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-[9px] font-bold border transition-all flex flex-col items-start gap-1",
                            exploringId === d.id
                                ? "bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-400"
                                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-amber-200"
                        )}
                    >
                        <span>{d.answer}</span>
                        <AnimatePresence>
                            {exploringId === d.id && (
                                <motion.p
                                    initial={{ height: 0, opacity: 0 }}
                                    style={{ "fontSize": "1em" }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    className="text-[8px] leading-tight text-slate-600 dark:text-slate-400 border-t border-amber-200 dark:border-amber-800 pt-1 mt-1 text-left"
                                >
                                    This relates to: <span className="italic font-medium">{d.prompt}</span> {!!d.customLayers?.['notes'] && <span className="text-blue-500">• Has Notes</span>}
                                </motion.p>
                            )}
                        </AnimatePresence>
                    </button>
                ))}
            </div>
        </div>
    );
}

function QuizCard({ entry, isRevealed }: { entry: CustomEntry, isRevealed: boolean }) {
    const [mounted, setMounted] = useState(false);
    const config = useQuizStore(state => state.config);
    const aiExplanation = useQuizAiExplanation();
    const isRefining = useQuizIsRefining();

    const hintItems = useMemo<HintItem[]>(() => {
        if (!config || !entry) return [];
        const tipFields = config.tipFields || [];
        return resolveHint(entry, tipFields);
    }, [entry, config]);

    const renderedHint = useMemo<any>(() => {
        if (hintItems.length > 0) {
            return (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center space-x-2 mb-1">
                        <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Hint / Context</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        {hintItems.map((tip, i) => (
                            <React.Fragment key={i}>
                                <HintItemView item={tip} />
                                {i < hintItems.length - 1 && <span className="text-slate-300 dark:text-slate-700">|</span>}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            );
        }
        return null;
    }, [hintItems]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            className={cn(
                "w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl p-8 md:p-12 transition-all duration-500 relative overflow-hidden",
                "backdrop-blur-xl bg-white/80 dark:bg-slate-900/80",
                isRevealed ? "min-h-[350px]" : "aspect-[16/9] flex flex-col items-center justify-center text-center"
            )}
        >
            <div className="space-y-6 w-full z-10">
                <ConfusionRibbon entry={entry} />
                <div className="flex justify-between items-start w-full">
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-[9px] font-black uppercase tracking-widest">
                        Item Prompt
                    </span>
                    {entry.stats.isReflexVerified && (
                        <div className="flex items-center space-x-1 px-3 py-1 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg shadow-cyan-500/20">
                            <Zap className="h-3 w-3 fill-current" />
                            <span>Reflex</span>
                        </div>
                    )}
                </div>

                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
                    {entry.prompt}
                </h2>

                <AnimatePresence>
                    {isRevealed && (
                        <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="pt-6 border-t border-slate-100 dark:border-slate-800 text-left space-y-4"
                        >
                            <div className="space-y-1.5">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Technical Baseline</span>
                                <div className="technicalBaseline p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-4">
                                    <div className="space-y-2">
                                        {entry.answer.split('\n').map((part, i) => (
                                            <p key={i} className="text-lg font-bold text-emerald-500">{part}</p>
                                        ))}
                                    </div>

                                    {/* Hint Display in Baseline */}
                                    {renderedHint as any}

                                    {/* AI Generated Hint */}
                                    {entry.customLayers?.aiHint && (
                                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center space-x-2 mb-1">
                                                <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">AI Memory Anchor</span>
                                            </div>
                                            <p className="text-sm text-slate-600 dark:text-slate-300 font-bold">
                                                {entry.customLayers.aiHint as string}
                                            </p>
                                        </div>
                                    )}

                                    {/* Note Display - Always shown if notes exist */}
                                    {entry.customLayers?.notes && typeof entry.customLayers.notes === 'string' && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="pt-2 border-t border-slate-100 dark:border-slate-800"
                                        >
                                            <div className="flex items-center space-x-2 mb-1">
                                                <StickyNote className="h-3.5 w-3.5 text-blue-500" />
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Personal Notes</span>
                                            </div>
                                            <p className="text-sm text-slate-600 dark:text-slate-300 italic leading-relaxed">
                                                &quot;{entry.customLayers.notes as any}&quot;
                                            </p>
                                        </motion.div>
                                    )}

                                    {/* AI Tutor Explanation */}
                                    <AnimatePresence>
                                        {(aiExplanation || isRefining) && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="pt-4 border-t border-slate-100 dark:border-slate-800"
                                            >
                                                <div className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-xl space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-2">
                                                            <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">AI Tutor Insight</span>
                                                        </div>
                                                        {isRefining && <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />}
                                                    </div>
                                                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                                                        {isRefining ? "Génération d'une explication conceptuelle..." : aiExplanation}
                                                    </p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-0.5">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Mastery Level</span>
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        {entry.stats.repetition > 5 ? 'Expert' : entry.stats.repetition > 2 ? 'Intermediate' : 'Learning'}
                                    </p>
                                </div>
                                <div className="space-y-0.5 text-right">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Next Review</span>
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        {mounted ? new Date(entry.stats.nextReview).toLocaleDateString() : '...'}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Soft decorative background element */}
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
        </motion.div>
    );
}

function ConfusionRibbon({ entry }: { entry: CustomEntry }) {
    const confusions = entry.metadata?.confusions as Record<string, number> | undefined;
    if (!confusions || Object.keys(confusions).length === 0) return null;

    return (
        <div className="space-y-2 mb-2">
            <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center space-x-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 p-2 rounded-xl"
            >
                <AlertOctagon className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-[9px] font-black uppercase tracking-tight text-amber-700 dark:text-amber-400">
                    Warning: Often confused with another item
                </span>
            </motion.div>

            {!!entry.metadata?.aiConfusionPatterns && (
                <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-center space-x-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-900/30 p-2 rounded-xl"
                >
                    <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                    <span className="text-[9px] font-black uppercase tracking-tight text-purple-700 dark:text-purple-400">
                        AI Insight: {entry.metadata.aiConfusionPatterns as string}
                    </span>
                </motion.div>
            )}
        </div>
    );
}

function NotesButton({ entry }: { entry: CustomEntry }) {
    const config = useQuizStore(state => state.config);
    // Show if configured to show notes AND notes exist
    // Auto-Show logic if configured - initialize state directly since component remounts on key change
    const [showNotes, setShowNotes] = useState(() => {
        return !!(config?.autoShowNotes && entry.customLayers?.notes);
    });

    if (!entry.customLayers?.notes) return null;

    if (!entry.customLayers?.notes) return null;

    // Auto-show notes after reveal if configured? 
    // "Automatically displaying hints and notes after a choice is made." -> Handled in QuizCard usually, or popup?
    // Let's keep this as a manual toggle or indicator.

    return (
        <div className="absolute -top-6 left-0 z-40">
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative"
            >
                {!showNotes ? (
                    <button
                        onClick={() => setShowNotes(true)}
                        className="p-3 bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 rounded-full hover:scale-110 transition-all shadow-xl border-2 border-blue-200 dark:border-blue-700 group ring-4 ring-white dark:ring-slate-950"
                    >
                        <StickyNote className="h-5 w-5 group-hover:fill-blue-400 transition-colors" />
                    </button>
                ) : (
                    <motion.div
                        layoutId="notes"
                        className="bg-blue-50 dark:bg-blue-900/90 border border-blue-200 dark:border-blue-700 p-4 rounded-2xl shadow-xl max-w-[250px] text-left z-50 backdrop-blur-md"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <StickyNote className="w-3.5 h-3.5 text-blue-500 fill-current" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Personal Notes</span>
                        </div>
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-200 leading-snug italic">
                            &quot;{entry.customLayers.notes as any}&quot;
                        </p>
                        <button
                            onClick={() => setShowNotes(false)}
                            className="mt-3 text-[10px] font-bold text-slate-400 hover:text-slate-600 underline"
                        >
                            Hide
                        </button>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}

function HintButton({ entry }: { entry: CustomEntry }) {
    const config = useQuizStore(state => state.config);
    const isRevealed = useQuizIsRevealed();

    const hintItems: HintItem[] = React.useMemo(() => {
        if (!config || !entry) return [];
        const tipFields = config.tipFields || [];
        return resolveHint(entry, tipFields);
    }, [entry, config]);

    const [showHint, setShowHint] = useState(() => {
        if (!config || !entry) return false;
        const tipFields = config.tipFields || [];
        const hint = resolveHint(entry, tipFields);
        return !!(config.autoShowHints && hint.length > 0);
    });

    if (hintItems.length === 0 || isRevealed) return null;

    return (
        <div className="absolute -top-6 right-0 z-40">
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative"
            >
                {!showHint ? (
                    <button
                        onClick={() => setShowHint(true)}
                        className="p-3 bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 rounded-full hover:scale-110 transition-all shadow-xl border-2 border-amber-200 dark:border-amber-700 group ring-4 ring-white dark:ring-slate-950"
                    >
                        <Lightbulb className="h-5 w-5 group-hover:fill-amber-400 transition-colors" />
                    </button>
                ) : (
                    <motion.div
                        layoutId="hint"
                        className="bg-amber-50 dark:bg-amber-900/90 border border-amber-200 dark:border-amber-700 p-4 rounded-2xl shadow-xl max-w-[250px] text-left z-50 backdrop-blur-md"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <Lightbulb className="w-3.5 h-3.5 text-amber-500 fill-current" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Hint revealed</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            {hintItems.map((tip, i) => (
                                <React.Fragment key={i}>
                                    <HintItemView item={tip} />
                                    {i < hintItems.length - 1 && <span className="text-slate-300 dark:text-slate-700">|</span>}
                                </React.Fragment>
                            ))}
                        </div>
                        <button
                            onClick={() => setShowHint(false)}
                            className="mt-3 text-[10px] font-bold text-slate-400 hover:text-slate-600 underline"
                        >
                            Hide
                        </button>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}

function QuizSummary() {
    const stats = useQuizStats();
    const endSession = useQuizStore(state => state.endSession);
    const accuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;

    // TODO: Move to SRS service logic
    const masteryGain = Math.round((stats.correct / (stats.total || 1)) * 12);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-2xl mx-auto px-6 py-24 text-center space-y-12 h-screen overflow-y-auto"
        >
            <div className="space-y-4">
                <div className="inline-flex items-center justify-center p-6 bg-emerald-100 dark:bg-emerald-900/30 rounded-full mb-4">
                    <Award className="h-16 w-16 text-emerald-600" />
                </div>
                <h1 className="text-5xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Session Complete!</h1>
                <p className="text-slate-500 dark:text-slate-400 text-lg">Your knowledge graph has been reinforced.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl space-y-2">
                    <p className="text-3xl font-black text-slate-900 dark:text-slate-100">{stats.total}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Items</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl space-y-2">
                    <p className="text-3xl font-black text-emerald-500">{accuracy.toFixed(0)}%</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Accuracy</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl space-y-2">
                    <div className="flex items-center justify-center space-x-1">
                        <Zap className="h-4 w-4 text-amber-500" />
                        <p className="text-3xl font-black text-amber-500">{stats.bonusScore}</p>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Arcade Bonus</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl space-y-2">
                    <div className="flex items-center justify-center space-x-1">
                        <Target className="h-4 w-4 text-blue-500" />
                        <p className="text-3xl font-black text-blue-500">+{masteryGain}%</p>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mastery Boost</p>
                </div>
            </div>

            <div className="bg-slate-100 dark:bg-slate-900/50 rounded-[32px] p-8 space-y-6">
                <div className="flex justify-between items-center text-xs font-black uppercase tracking-tighter text-slate-400">
                    <span>Overall Mastery Progress</span>
                    <span className="text-blue-500 flex items-center space-x-1">
                        <Sparkles className="h-3 w-3" />
                        <span>Reinforcing Knowledge</span>
                    </span>
                </div>
                <div className="h-4 w-full bg-white dark:bg-slate-800 rounded-full overflow-hidden p-1">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${65 + (masteryGain / 2)}%` }} // Mocking progress
                        className="h-full bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full shadow-lg"
                    />
                </div>
            </div>

            <button
                onClick={() => endSession()}
                className="px-12 py-5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl font-black uppercase tracking-widest flex items-center space-x-3 mx-auto hover:opacity-90 transition-opacity"
            >
                <span>Back to Library</span>
                <ArrowRight className="h-5 w-5" />
            </button>
        </motion.div>
    );
}

function ReflexHitOverlay({ entry }: { entry: CustomEntry }) {
    const isRevealed = useQuizIsRevealed();
    const phase = useQuizStore(state => state.phase);
    const lastQuality = useQuizStore(state => state.lastQuality);

    // Condition: Just revealed, discovered phase, got high quality, AND is verified
    const isReflexHit = isRevealed && phase === 'discovery' && lastQuality !== null && lastQuality >= 4 && entry.stats.isReflexVerified;

    return (
        <AnimatePresence>
            {isReflexHit && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.5, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 1.5 }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] pointer-events-none"
                >
                    <div className="bg-cyan-500 text-white px-6 py-3 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.5)] flex items-center space-x-2 border-2 border-cyan-300">
                        <Zap className="h-6 w-6 fill-current animate-pulse" />
                        <span className="text-2xl font-black uppercase tracking-tighter">Reflex Hit!</span>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function TimeoutOverlay() {
    const isTimeout = useIsTimeout();

    return (
        <AnimatePresence>
            {isTimeout && (
                <motion.div

                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="timesup absolute inset-0 z-50 flex flex-col items-center justify-center bg-rose-500/10 backdrop-blur-[2px] rounded-3xl"
                >
                    <motion.div
                        initial={{ y: 20 }}
                        animate={{ y: 0 }}
                        className="bg-rose-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center space-x-3 pointer-events-auto"
                    >
                        <TimerOff className="h-6 w-6 animate-bounce" />
                        <button className="text-2xl font-black uppercase tracking-tighter hover:scale-105 transition-transform"
                            onClick={() => useQuizStore.setState({ isTimeout: false })}
                        >Time&apos;s Up!</button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function HintItemView({ item }: { item: HintItem }) {
    const [showPopup, setShowPopup] = useState(false);

    return (
        <span
            className="technicalBaseline_hint relative cursor-help group inline-block"
            onMouseEnter={() => setShowPopup(true)}
            onMouseLeave={() => setShowPopup(false)}
            onClick={(e) => {
                e.stopPropagation();
                setShowPopup(!showPopup);
            }}
        >
            <span className="text-sm text-slate-600 dark:text-slate-300 font-medium hover:text-blue-500 transition-colors">
                {item.value}
            </span>
            <AnimatePresence>
                {showPopup && (
                    <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.9 }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-900 dark:bg-slate-800 text-white dark:text-slate-100 text-[10px] font-black tracking-widest uppercase rounded-lg shadow-xl z-[100] whitespace-nowrap border border-slate-700 pointer-events-none"
                    >
                        {item.label}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800" />
                    </motion.div>
                )}
            </AnimatePresence>
        </span>
    );
}
