"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Upload, CheckCircle, XCircle, ArrowRight, Database, Sparkles } from 'lucide-react';
import { validateJsonSource, importKnowledgeBundle } from '@/services/io_ingestion';
import { validateAnkiSource } from '@/services/io_anki';
import { createBundle } from '@/services/srv_bundle';
import { completeMissingFields } from '@/services/srv_ai';
import { type IngestionDiagnostic, type RawSource, type KnowledgeBundle } from '@/schemas/zod_models';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // Increased to 50MB for Anki packages

type Step = 'upload' | 'mapping' | 'success';

const LANGUAGES = [
    { flag: '🇬🇧', name: 'English', code: 'en' },
    { flag: '🇫🇷', name: 'French', code: 'fr' },
    { flag: '🇪🇸', name: 'Spanish', code: 'es' },
    { flag: '🇩🇪', name: 'German', code: 'de' },
    { flag: '🇮🇹', name: 'Italian', code: 'it' },
    { flag: '🇵🇹', name: 'Portuguese', code: 'pt' },
    { flag: '🇳🇱', name: 'Dutch', code: 'nl' },
    { flag: '🇷🇺', name: 'Russian', code: 'ru' },
    { flag: '🇺🇦', name: 'Ukrainian', code: 'uk' },
    { flag: '🇵🇱', name: 'Polish', code: 'pl' },
    { flag: '🇨🇿', name: 'Czech', code: 'cs' },
    { flag: '🇷🇴', name: 'Romanian', code: 'ro' },
    { flag: '🇭🇺', name: 'Hungarian', code: 'hu' },
    { flag: '🇸🇪', name: 'Swedish', code: 'sv' },
    { flag: '🇳🇴', name: 'Norwegian', code: 'no' },
    { flag: '🇩🇰', name: 'Danish', code: 'da' },
    { flag: '🇫🇮', name: 'Finnish', code: 'fi' },
    { flag: '🇬🇷', name: 'Greek', code: 'el' },
    { flag: '🇹🇷', name: 'Turkish', code: 'tr' },
    { flag: '🇸🇦', name: 'Arabic', code: 'ar' },
    { flag: '🇮🇱', name: 'Hebrew', code: 'he' },
    { flag: '🇮🇳', name: 'Hindi', code: 'hi' },
    { flag: '🇹🇭', name: 'Thai', code: 'th' },
    { flag: '🇻🇳', name: 'Vietnamese', code: 'vi' },
    { flag: '🇮🇩', name: 'Indonesian', code: 'id' },
    { flag: '🇲🇾', name: 'Malay', code: 'ms' },
    { flag: '🇯🇵', name: 'Japanese', code: 'ja' },
    { flag: '🇨🇳', name: 'Chinese', code: 'zh' },
    { flag: '🇰🇷', name: 'Korean', code: 'ko' },
    { flag: '🇧🇷', name: 'Brazilian Portuguese', code: 'pt-BR' },
    { flag: '🇲🇽', name: 'Latin American Spanish', code: 'es-MX' },
];

export default function ImportSource() {
    const [step, setStep] = useState<Step>('upload');
    const [diagnostic, setDiagnostic] = useState<IngestionDiagnostic | null>(null);
    const [rawJson, setRawJson] = useState<RawSource | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const [showLangDropdown, setShowLangDropdown] = useState(false);

    // Mapping state
    const [mapping, setMapping] = useState({
        bundleName: '',
        promptField: '',
        answerField: [] as string[],
        tipFields: [] as string[],
        targetLanguage: '',
        aiTranslateFields: [] as string[]
    });

    // Ref to always have the latest mapping (avoids stale closures in async handlers)
    const mappingRef = useRef(mapping);
    useEffect(() => { mappingRef.current = mapping; }, [mapping]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.size > MAX_FILE_SIZE) {
            setDiagnostic({
                isValid: false,
                isBundle: false,
                totalItems: 0,
                validItems: 0,
                invalidItems: 1,
                errors: [{ index: 0, message: `File too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Max limit is 50MB.` }],
                detectedFields: [],
                duplicateCount: 0
            });
            setFileName(file.name);
            return;
        }

        setFileName(file.name);
        setIsLoading(true);

        try {
            let report: IngestionDiagnostic & { rawData?: RawSource };

            if (file.name.endsWith('.apkg')) {
                report = await validateAnkiSource(file);
            } else {
                const text = await file.text();
                const json = JSON.parse(text);
                report = await validateJsonSource(json);
                report.rawData = json;
            }

            setDiagnostic(report);

            if (report.isValid && report.rawData) {
                setRawJson(report.rawData as RawSource);
                setMapping(prev => ({
                    ...prev,
                    bundleName: report.isBundle
                        ? (report.rawData as unknown as KnowledgeBundle).source.name
                        : file.name.replace(/\.[^/.]+$/, ""),
                    promptField: report.detectedFields.includes("_key") ? "_key" : (report.detectedFields[0] || ''),
                    answerField: report.detectedFields[1] ? [report.detectedFields[1]] : (report.detectedFields[0] ? [report.detectedFields[0]] : [])
                }));

                // Auto-advance if it's a bundle?
                // Actually, let's keep the strategy page but change its appearance
            }
        } catch (e) {
            setDiagnostic({
                isValid: false,
                isBundle: false,
                totalItems: 0,
                validItems: 0,
                invalidItems: 1,
                errors: [{ index: 0, message: "Import Failed: " + (e as Error).message }],
                detectedFields: [],
                duplicateCount: 0
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateBundle = async () => {
        // Read the LATEST mapping from the ref to avoid stale closure issues
        const currentMapping = mappingRef.current;

        console.log("[Import] handleCreateBundle triggered", {
            hasJson: !!rawJson,
            bundleName: currentMapping.bundleName,
            isBundle: diagnostic?.isBundle,
            targetLanguage: currentMapping.targetLanguage,
            aiFields: currentMapping.aiTranslateFields,
            promptField: currentMapping.promptField,
            answerFields: currentMapping.answerField
        });
        if (!rawJson || !currentMapping.bundleName) return;
        if (!diagnostic?.isBundle && (!currentMapping.promptField || currentMapping.answerField.length === 0)) return;

        setIsLoading(true);

        const rawDataArray = Array.isArray(rawJson) ? rawJson : Object.entries(rawJson as object).map(([key, value]) => ({ _key: key, ...(value as any) }));
        let finalRawData = [...rawDataArray];

        // AI Completion & Translation Layer
        if (!diagnostic?.isBundle && currentMapping.targetLanguage.trim() !== "" && currentMapping.aiTranslateFields.length > 0) {

            // Helper to strip items to essential fields only
            const stripItem = (item: any) => {
                const subset: any = { _key: item._key || item[currentMapping.promptField] };
                subset[currentMapping.promptField] = item[currentMapping.promptField];
                currentMapping.aiTranslateFields.forEach(f => { subset[f] = item[f]; });
                return subset;
            };

            // Helper to merge results back
            const mergeResults = (originalData: any[], results: any[]) => {
                const map = new Map(results.map(r => [String(r._key), r]));
                return originalData.map(item => {
                    const key = String(item._key || item[currentMapping.promptField]);
                    const updated = map.get(key);
                    if (updated) {
                        const newItem = { ...item };
                        currentMapping.aiTranslateFields.forEach(f => {
                            if (updated[f] !== undefined) newItem[f] = updated[f];
                        });
                        return newItem;
                    }
                    return item;
                });
            };

            // Helper to process in chunks (Avoids 429 Quota errors)
            const processInChunks = async (items: any[], label: string, language?: string) => {
                const CHUNK_SIZE = 100;

                const results = [];
                for (let i = 0; i < items.length; i += CHUNK_SIZE) {
                    const chunk = items.slice(i, i + CHUNK_SIZE);
                    const chunkSizeKB = (new TextEncoder().encode(JSON.stringify(chunk)).length / 1024).toFixed(2);

                    console.log(`[AI ${label}] Chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(items.length / CHUNK_SIZE)} | Size: ${chunkSizeKB} KB...`);

                    const completed = await completeMissingFields(chunk, currentMapping.aiTranslateFields, [currentMapping.promptField], language);
                    results.push(...completed);
                    // Minimal delay between chunks to be safe
                    if (i + CHUNK_SIZE < items.length) await new Promise(r => setTimeout(r, 1000));
                }
                return results;
            };

            try {
                // PASS 1: Complete missing fields (only for items that are actually empty)
                const itemsNeedingCompletion = finalRawData
                    .filter(item => currentMapping.aiTranslateFields.some(f => !item[f] || String(item[f]).trim() === ""))
                    .map(stripItem);

                if (itemsNeedingCompletion.length > 0) {
                    console.log(`[AI] Pass 1: Completing ${itemsNeedingCompletion.length} items...`);
                    const completionResults = await processInChunks(itemsNeedingCompletion, "Completion");
                    finalRawData = mergeResults(finalRawData, completionResults);
                }

                // PASS 2: Translate everything (for all items)
                console.log(`[AI] Pass 2: Translating all ${finalRawData.length} items into ${currentMapping.targetLanguage}...`);
                const itemsToTranslate = finalRawData.map(stripItem);
                const translationResults = await processInChunks(itemsToTranslate, "Translation", currentMapping.targetLanguage);
                finalRawData = mergeResults(finalRawData, translationResults);

            } catch (aiError) {
                console.error("AI Layer failed, proceeding with best available data", aiError);
            }
        }

        try {
            if (diagnostic?.isBundle) {
                await importKnowledgeBundle(rawJson as unknown as KnowledgeBundle);
            } else {
                await createBundle({
                    name: currentMapping.bundleName,
                    type: fileName?.endsWith('.apkg') ? 'anki' : 'json',
                    rawData: finalRawData,
                    mapping: {
                        promptField: currentMapping.promptField,
                        answerField: currentMapping.answerField,
                        tipFields: currentMapping.tipFields
                    }
                });
            }
            setStep('success');
        } catch (e) {
            console.error("Failed to create bundle", e);
            setDiagnostic({
                isValid: false,
                isBundle: false,
                totalItems: 0,
                validItems: 0,
                invalidItems: 1,
                errors: [{ index: 0, message: "Database error: Could not save bundle." }],
                detectedFields: [],
                duplicateCount: 0
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full">
            <AnimatePresence mode="wait">
                {step === 'upload' && (
                    <motion.div
                        key="upload"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="p-8 space-y-8"
                    >
                        <div className="space-y-1">
                            <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Import Source</h2>
                            <p className="text-slate-500 dark:text-slate-400">Upload a JSON or Anki file to begin.</p>
                        </div>

                        <div className={cn(
                            "relative group border-2 border-dashed rounded-[24px] transition-all duration-300",
                            "focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500",
                            isLoading ? "animate-pulse border-blue-400 bg-blue-50/50" : "border-slate-200 dark:border-slate-800"
                        )}>
                            <input
                                type="file"
                                accept=".json,.apkg"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 focus:outline-none"
                                disabled={isLoading}
                                aria-label="Upload source items"
                            />
                            <div className={cn(
                                "p-12 text-center",
                                "group-hover:border-blue-500 group-hover:bg-blue-50/30 dark:group-hover:bg-blue-900/10 transition-all",
                            )}>
                                <div className="flex flex-col items-center space-y-4">
                                    <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-400 group-hover:text-blue-500 transition-colors">
                                        <Upload className="h-10 w-10" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-bold text-slate-700 dark:text-slate-200 text-lg">
                                            {fileName ?? "Drop your file here or click to browse"}
                                        </p>
                                        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Supported: .json, .apkg (Max 50MB)</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {diagnostic && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={cn(
                                    "rounded-[24px] border p-6 space-y-6",
                                    diagnostic.isValid ? "bg-emerald-50/30 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-800" : "bg-rose-50/30 border-rose-100 dark:bg-rose-900/10 dark:border-rose-800"
                                )}
                            >
                                <div className="flex items-center space-x-3">
                                    {diagnostic.isValid ? (
                                        <CheckCircle className="h-6 w-6 text-emerald-500" />
                                    ) : (
                                        <XCircle className="h-6 w-6 text-rose-500" />
                                    )}
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                        {diagnostic.isValid ? "Diagnostic Successful" : "Validation Failed"}
                                    </h3>
                                </div>

                                {diagnostic.isValid ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-white dark:bg-slate-900/50 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Items</p>
                                            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{diagnostic.totalItems}</p>
                                        </div>
                                        <div className="p-4 bg-white dark:bg-slate-900/50 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fields Detected</p>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {diagnostic.detectedFields.map(field => (
                                                    <span key={field} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-black text-slate-600 dark:text-slate-400">
                                                        {field}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <ul className="space-y-2">
                                        {diagnostic.errors.slice(0, 5).map((error, idx) => (
                                            <li key={idx} className="text-sm font-medium text-rose-600 dark:text-rose-400 flex items-start space-x-2">
                                                <span className="mt-1 flex-shrink-0 w-1.5 h-1.5 bg-rose-500 rounded-full" />
                                                <span>{error.message}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                {diagnostic.isValid && (
                                    <button
                                        onClick={() => setStep('mapping')}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-sm py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/20"
                                    >
                                        Next Strategy
                                    </button>
                                )}
                            </motion.div>
                        )}
                    </motion.div>
                )}

                {step === 'mapping' && diagnostic && (
                    <motion.div
                        key="mapping"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="p-8 space-y-8"
                    >
                        <div className="space-y-1">
                            <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Configure Mapping</h2>
                            <p className="text-slate-500 dark:text-slate-400">Instruct the engine on how to interpret your data.</p>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Bundle Name</label>
                                <input
                                    type="text"
                                    value={mapping.bundleName}
                                    onChange={e => setMapping(prev => ({ ...prev, bundleName: e.target.value }))}
                                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                                    placeholder="e.g., Medical Terminology"
                                />
                            </div>

                            {!diagnostic.isBundle ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-blue-500">Prompt (Question)</label>
                                        <select
                                            value={mapping.promptField}
                                            onChange={e => setMapping(prev => ({ ...prev, promptField: e.target.value }))}
                                            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl appearance-none font-bold outline-none ring-blue-500 focus:ring-2"
                                        >
                                            {diagnostic.detectedFields.map(f => <option key={f} value={f}>{f}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2 col-span-2 md:col-span-1">
                                        <label className="answerTargets_title text-xs font-black uppercase tracking-widest text-amber-500">Answer (Targets)</label>
                                        <div className="answerTargets bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 max-h-64 overflow-y-auto space-y-4">
                                            <div className="space-y-2 relative">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Language (AI Context)</label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={mapping.targetLanguage}
                                                        disabled={mapping.aiTranslateFields.length === 0}
                                                        onChange={e => {
                                                            setMapping(prev => ({ ...prev, targetLanguage: e.target.value }));
                                                            setShowLangDropdown(true);
                                                        }}
                                                        onFocus={() => setShowLangDropdown(true)}
                                                        onBlur={() => setTimeout(() => setShowLangDropdown(false), 200)}
                                                        placeholder={mapping.aiTranslateFields.length === 0 ? "✨ Activate a sparkle to enable AI" : "🌐 Choose a language..."}
                                                        className={cn(
                                                            "answerTargets_language w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500 transition-all",
                                                            "disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-slate-50 dark:disabled:bg-slate-900/50",
                                                            mapping.aiTranslateFields.length > 0 && !mapping.targetLanguage.trim()
                                                                ? "border-red-400 dark:border-red-500 ring-1 ring-red-300"
                                                                : "border-slate-200 dark:border-slate-700"
                                                        )}
                                                    />
                                                    {showLangDropdown && (() => {
                                                        const filtered = LANGUAGES.filter(l =>
                                                            !mapping.targetLanguage || l.name.toLowerCase().includes(mapping.targetLanguage.toLowerCase())
                                                        );
                                                        return filtered.length > 0 ? (
                                                            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl shadow-slate-200/50 dark:shadow-black/50 max-h-48 overflow-y-auto">
                                                                {filtered.map(lang => (
                                                                    <button
                                                                        key={lang.code}
                                                                        type="button"
                                                                        onMouseDown={(e) => {
                                                                            e.preventDefault();
                                                                            setMapping(prev => ({ ...prev, targetLanguage: lang.name }));
                                                                            setShowLangDropdown(false);
                                                                        }}
                                                                        className="w-full flex items-center space-x-3 px-3 py-2.5 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors text-left first:rounded-t-xl last:rounded-b-xl"
                                                                    >
                                                                        <span className="text-xl leading-none">{lang.flag}</span>
                                                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{lang.name}</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        ) : null;
                                                    })()}
                                                </div>
                                                {mapping.aiTranslateFields.length > 0 && !mapping.targetLanguage.trim() && (
                                                    <p className="text-[10px] text-red-500 font-bold flex items-center space-x-1 mt-1 animate-pulse">
                                                        <XCircle className="w-3 h-3" />
                                                        <span>Required: AI fields are selected but no target language is set.</span>
                                                    </p>
                                                )}
                                            </div>

                                            <p className="text-xs text-slate-400 mb-2">Select fields to combine:</p>
                                            <div className="space-y-2">
                                                {diagnostic.detectedFields.map(f => (
                                                    <div key={f} className="answerTargets_choices flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 p-2 rounded-lg transition-colors group">
                                                        <div
                                                            className="flex items-center space-x-3 flex-grow"
                                                            onClick={() => {
                                                                const isChecked = mapping.answerField.includes(f);
                                                                if (!isChecked) {
                                                                    setMapping(prev => ({
                                                                        ...prev,
                                                                        answerField: [...prev.answerField, f],
                                                                        tipFields: prev.tipFields.filter(x => x !== f)
                                                                    }));
                                                                } else {
                                                                    setMapping(prev => ({
                                                                        ...prev,
                                                                        answerField: prev.answerField.filter(x => x !== f),
                                                                        aiTranslateFields: prev.aiTranslateFields.filter(x => x !== f)
                                                                    }));
                                                                }
                                                            }}
                                                        >
                                                            <div className={cn(
                                                                "w-5 h-5 rounded border flex items-center justify-center transition-all",
                                                                mapping.answerField.includes(f)
                                                                    ? "bg-amber-500 border-amber-500"
                                                                    : "border-slate-300 dark:border-slate-600"
                                                            )}>
                                                                {mapping.answerField.includes(f) && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                                            </div>
                                                            <span className="font-bold text-sm text-slate-700 dark:text-slate-300">{f}</span>
                                                        </div>

                                                        {mapping.answerField.includes(f) && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    console.log("[Import] Toggling sparkle for field:", f);
                                                                    setMapping(prev => {
                                                                        const isIncluded = prev.aiTranslateFields.includes(f);
                                                                        const next = isIncluded
                                                                            ? prev.aiTranslateFields.filter(x => x !== f)
                                                                            : [...prev.aiTranslateFields, f];
                                                                        console.log("[Import] Next aiTranslateFields:", next);
                                                                        return { ...prev, aiTranslateFields: next };
                                                                    });
                                                                }}
                                                                className={cn(
                                                                    "answerTargets_sparkle p-1.5 rounded-lg transition-all relative z-50",
                                                                    mapping.aiTranslateFields.includes(f)
                                                                        ? "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400"
                                                                        : "text-slate-300 hover:text-purple-400 dark:text-slate-600"
                                                                )}
                                                                title="Translate/Complete with AI"
                                                            >
                                                                <Sparkles className={cn("w-3.5 h-3.5", mapping.aiTranslateFields.includes(f) && "fill-current")} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="tipsHints space-y-4 col-span-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-black uppercase tracking-widest text-emerald-500">Tips (Hints)</label>
                                            <span className="text-[10px] font-bold text-slate-400">Optional</span>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 max-h-48 overflow-y-auto">
                                            <p className="text-xs text-slate-400 mb-2">Select fields to show as hints during quiz:</p>
                                            <div className="space-y-2">
                                                {diagnostic.detectedFields
                                                    .filter(f => !mapping.answerField.includes(f) && f !== mapping.promptField)
                                                    .map(f => (
                                                        <label key={f} className="flex items-center space-x-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 p-2 rounded-lg transition-colors">
                                                            <div className={cn(
                                                                "w-5 h-5 rounded border flex items-center justify-center transition-all",
                                                                mapping.tipFields.includes(f)
                                                                    ? "bg-emerald-500 border-emerald-500"
                                                                    : "border-slate-300 dark:border-slate-600"
                                                            )}>
                                                                {mapping.tipFields.includes(f) && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                                            </div>
                                                            <input
                                                                type="checkbox"
                                                                className="hidden"
                                                                checked={mapping.tipFields.includes(f)}
                                                                onChange={e => {
                                                                    if (e.target.checked) {
                                                                        setMapping(prev => ({ ...prev, tipFields: [...prev.tipFields, f] }));
                                                                    } else {
                                                                        setMapping(prev => ({ ...prev, tipFields: prev.tipFields.filter(x => x !== f) }));
                                                                    }
                                                                }}
                                                            />
                                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{f}</span>
                                                        </label>
                                                    ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-6 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl">
                                    <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                                        This is a pre-configured Knowledge Bundle. Mapping and stats are preserved.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="pt-4 flex items-center space-x-4">
                            <button
                                onClick={() => setStep('upload')}
                                className="px-6 py-4 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-bold"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleCreateBundle}
                                disabled={isLoading || (mapping.aiTranslateFields.length > 0 && !mapping.targetLanguage.trim())}
                                className={cn(
                                    "finalizeImport flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center space-x-2 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed",
                                    mapping.aiTranslateFields.length > 0 && !mapping.targetLanguage.trim()
                                        ? "bg-red-400 text-white shadow-red-500/20"
                                        : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
                                )}
                            >
                                <span>{isLoading ? "Integrating..." : mapping.aiTranslateFields.length > 0 && !mapping.targetLanguage.trim() ? "⚠ Set Target Language" : "Finalize Import"}</span>
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        </div>
                    </motion.div>
                )}

                {step === 'success' && (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-12 text-center space-y-8"
                    >
                        <div className="inline-flex items-center justify-center p-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                            <Database className="h-16 w-16 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight">System Updated</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-lg">Your Knowledge Bundle is successfully persistent.</p>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-12 py-5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl font-black uppercase tracking-widest text-sm hover:opacity-90 transition-all shadow-xl"
                        >
                            Return to Command
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
