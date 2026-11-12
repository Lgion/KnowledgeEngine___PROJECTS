"use client";

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useArcadeTimer, useQuizMode, useQuizPhase, useQuizStore } from '@/stores/st_quiz';
import { cn } from '@/lib/utils';
import { Zap } from 'lucide-react';

export default function ArcadeIndicator() {
    const mode = useQuizMode();
    const phase = useQuizPhase();
    const config = useQuizStore(state => state.config);
    const timer = useArcadeTimer();
    const tick = useQuizStore(state => state.tickArcadeTimer);

    // Smooth ticking logic
    const lastTickRef = useRef<number>(0);

    useEffect(() => {
        if (!config || config.difficulty === 'easy' || phase !== 'answering') return;

        let animationFrame: number;

        const animate = (time: number) => {
            if (!lastTickRef.current) lastTickRef.current = time;
            const delta = time - lastTickRef.current;

            // 100 units / (timerDuration * 1000) ms
            const durationMs = (config.timerDuration || 30) * 1000;
            const unitsPerMs = 100 / durationMs;

            if (delta > 16) { // ~60fps
                tick(delta * unitsPerMs);
                lastTickRef.current = time;
            }

            animationFrame = requestAnimationFrame(animate);
        };

        animationFrame = requestAnimationFrame(animate);
        return () => {
            cancelAnimationFrame(animationFrame);
            lastTickRef.current = 0;
        };
    }, [config, phase, tick]);

    if (!config || config.difficulty === 'easy') return null;

    // Color interpolation based on timer
    const gaugeColor = timer > 50
        ? "bg-emerald-500"
        : timer > 20
            ? "bg-amber-500"
            : "bg-rose-500";

    return (
        <div className="timer_progress w-full max-w-md mx-auto mb8" style={{ "width": "calc(100% + 2em)", "position": "relative" }}>

            <div style={{ "height": "1.5em", "borderRadius": "0" }} className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 p-0.5">
                <motion.div
                    className={cn("h-full rounded-full shadow-sm shadow-black/5", gaugeColor)}
                    style={{ "borderRadius": "0" }}
                    initial={{ width: "100%" }}
                    animate={{ width: `${timer}%` }}
                    transition={{ type: "spring", bounce: 0, duration: 0.1 }}
                />
            </div>

            <div className="flex items-center justify-between mb-2 px-1" style={{ "position": "absolute", "top": "4px", "left": "5px", "background": "black" }}>
                {/* <div className="flex items-center space-x-2">
                    <Zap className={cn("h-4 w-4 transition-colors", timer < 20 ? "text-rose-500 animate-pulse" : "text-amber-500")} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Arcade Reflex
                    </span>
                </div> */}
                <span className={cn(
                    "text-[10px] font-black tracking-tighter transition-colors",
                    timer < 20 ? "text-rose-500" : "text-slate-400"
                )}>
                    {Math.ceil(timer)}%
                </span>
            </div>

            {timer < 20 && (
                <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    aria-live="assertive"
                    style={{ "marginTop": "-2em" }}
                    className="text-center text-[8px] font-black uppercase tracking-[0.2em] text-rose-500 mt-2"
                >
                    Hurry Up!
                </motion.p>
            )
            }
        </div >
    );
}
