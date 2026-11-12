"use client";

import React, { useState } from 'react';
import LibraryView from '@/components/features/library/LibraryView';
import dynamic from 'next/dynamic';
import { UserButton, useUser, SignInButton } from '@clerk/nextjs';
import { pushAllToCloud, pullFromCloud } from '@/services/srv_sync';
import MarketplaceView from '@/components/features/marketplace/MarketplaceView';

const ImportSource = dynamic(() => import('@/components/features/library/ImportSource'), { ssr: false });
import QuizView from '@/components/features/quiz/QuizView';
import { useQuizActive, useQuizFinished } from '@/stores/st_quiz';
import { X, RefreshCw, Cloud, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function Home() {
  const [isImporting, setIsImporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'library' | 'marketplace'>('library');
  const [isSyncing, setIsSyncing] = useState(false);
  const { isSignedIn, user } = useUser();

  const quizActive = useQuizActive();
  const quizFinished = useQuizFinished();

  // The quiz view should take over if active OR finished (recap screen)
  const showQuiz = quizActive || quizFinished;

  const handleSync = async () => {
    if (!isSignedIn) return;
    setIsSyncing(true);
    try {
      const pushRes = await pushAllToCloud();
      const pullRes = await pullFromCloud();
      alert(`Sync Complete!\nPushed: ${pushRes.success} | Pulled: ${pullRes.merged + pullRes.created}`);
    } catch (error) {
      console.error("Sync failed:", error);
      alert("Sync failed. Check console for details.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans selection:bg-blue-100 dark:selection:bg-blue-900/40">
      {/* Header / Logo */}
      {!showQuiz && (
        <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center">
                <span className="text-white dark:text-black font-black text-xs">KE</span>
              </div>
              <span className="font-black uppercase tracking-tighter text-xl">Knowledge Engine</span>
            </div>

            <div className="hidden md:flex items-center space-x-6 text-sm font-bold uppercase tracking-widest leading-none">
              <button
                onClick={() => setActiveTab('library')}
                className={cn(
                  "pb-1 border-b-2 transition-all",
                  activeTab === 'library' ? "text-slate-900 dark:text-white border-slate-900 dark:border-white" : "text-slate-400 border-transparent hover:text-slate-600"
                )}
              >
                Library
              </button>
              <button
                onClick={() => setActiveTab('marketplace')}
                className={cn(
                  "pb-1 border-b-2 transition-all",
                  activeTab === 'marketplace' ? "text-slate-900 dark:text-white border-slate-900 dark:border-white" : "text-slate-400 border-transparent hover:text-slate-600"
                )}
              >
                Marketplace
              </button>
            </div>

            <div className="flex items-center space-x-4">
              {isSignedIn ? (
                <>
                  <button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-500 rounded-xl transition-all"
                    title="Sync with Cloud"
                  >
                    <RefreshCw className={cn("h-5 w-5", isSyncing && "animate-spin")} />
                  </button>
                  <UserButton afterSignOutUrl="/" />
                </>
              ) : (
                <SignInButton mode="modal">
                  <button className="text-xs font-black uppercase tracking-widest px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg">
                    Login
                  </button>
                </SignInButton>
              )}
            </div>
          </div>
        </header>
      )}

      <main className={showQuiz ? "" : "pt-24 pb-12 max-w-6xl mx-auto px-6"}>
        <AnimatePresence mode="wait">
          {showQuiz ? (
            <motion.div
              key="quiz"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <QuizView />
            </motion.div>
          ) : activeTab === 'library' ? (
            <motion.div
              key="library"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <LibraryView onImportClick={() => setIsImporting(true)} />
            </motion.div>
          ) : (
            <motion.div
              key="marketplace"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <MarketplaceView />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Import Overlay */}
      <AnimatePresence>
        {isImporting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsImporting(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
            >
              <div className="absolute top-6 right-6 z-10">
                <button
                  onClick={() => setIsImporting(false)}
                  className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-full transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="max-h-[90vh] overflow-y-auto">
                <ImportSource />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
