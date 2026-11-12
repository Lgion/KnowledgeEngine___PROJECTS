"use client";

import React, { useState } from 'react';
import { Upload, X, FileText, Loader2, Check, Save, Trash2, AlertCircle, FileDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cn } from '@/lib/utils';
import { db } from '@/services/db_client';
import { type CustomEntry } from '@/schemas/zod_models';

interface PdfImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface GeneratedItem {
    prompt: string;
    answer: string;
    notes?: string;
}

export default function PdfImportModal({ isOpen, onClose, onSuccess }: PdfImportModalProps) {
    const [step, setStep] = useState<'upload' | 'raw' | 'preview'>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [rawText, setRawText] = useState("");
    const [customPrompt, setCustomPrompt] = useState("");
    const [targetLanguage, setTargetLanguage] = useState("");
    const [reprompt, setReprompt] = useState("");
    const [items, setItems] = useState<GeneratedItem[]>([]);
    const [bundleName, setBundleName] = useState("");
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setBundleName(e.target.files[0].name.replace('.pdf', ''));
            setError(null);
        }
    };

    const handleExtract = async () => {
        if (!file) return;

        setIsLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/ingest/pdf/extract", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to extract text");
            }

            const data = await res.json();
            setRawText(data.text);
            setStep('raw');
        } catch (e: unknown) {
            console.error("Extraction failed", e);
            setError((e as Error).message || "An error occurred during extraction.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!rawText) return;

        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/ingest/pdf/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: rawText,
                    customPrompt,
                    targetLanguage
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to generate items");
            }

            const data = await res.json();
            if (Array.isArray(data.items)) {
                setItems(data.items);
                setStep('preview');
            } else {
                throw new Error("Invalid response format from AI");
            }
        } catch (e: unknown) {
            console.error("AI Generation failed", e);
            setError((e as Error).message || "An error occurred during AI generation.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuickSwap = () => {
        setItems(prev => prev.map(item => ({
            ...item,
            prompt: item.answer,
            answer: item.prompt
        })));
    };

    const handleSmartSwap = async () => {
        if (items.length === 0) return;
        setIsLoading(true);
        try {
            const res = await fetch("/api/ingest/pdf/refine", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ items, mode: "smart_swap" }),
            });

            if (!res.ok) throw new Error("Failed to swap items smartly");

            const data = await res.json();
            if (Array.isArray(data.items)) setItems(data.items);
        } catch (e: unknown) {
            console.error("Smart Swap failed", e);
            setError("Smart Swap failed. Try Quick Swap instead.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefine = async () => {
        if (items.length === 0 || !reprompt) return;
        setIsLoading(true);
        try {
            const res = await fetch("/api/ingest/pdf/refine", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ items, instruction: reprompt, mode: "refine" }),
            });

            if (!res.ok) throw new Error("Failed to refine items");

            const data = await res.json();
            if (Array.isArray(data.items)) setItems(data.items);
            setReprompt(""); // Clear after success
        } catch (e: unknown) {
            console.error("Refine failed", e);
            setError("Failed to refine items.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadJson = () => {
        const jsonString = JSON.stringify(items, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${bundleName || "bundle"}_raw.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleDownloadPdf = () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const orange = [249, 115, 22]; // Tailored colors if needed, but sticking to branding
        const blue: [number, number, number] = [37, 99, 235]; // Blue-600

        // Header and Footer Function
        const addHaF = (data: any) => {
            // Header
            doc.setFontSize(18);
            doc.setTextColor(blue[0], blue[1], blue[2]);
            doc.text("Knowledge Engine", 15, 15);

            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Bundle: ${bundleName || "Unnamed"}`, 15, 22);
            doc.text(new Date().toLocaleDateString(), pageWidth - 45, 15);

            doc.setDrawColor(230);
            doc.line(15, 25, pageWidth - 15, 25);

            // Footer
            const str = "Page " + doc.internal.pages.length.toString();
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text("Generated by Knowledge Engine", 15, pageHeight - 10);
            doc.text(str, pageWidth - 25, pageHeight - 10);
        };

        autoTable(doc, {
            head: [['Prompt', 'Answer', 'Notes']],
            body: items.map(item => [item.prompt, item.answer, item.notes || '']),
            startY: 30,
            margin: { top: 30, bottom: 20 },
            styles: { fontSize: 9, cellPadding: 5 },
            headStyles: { fillColor: blue, textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [248, 250, 252] as [number, number, number] },
            didDrawPage: (data) => {
                // Header & Footer on each page
                doc.setFontSize(18);
                doc.setTextColor(blue[0], blue[1], blue[2]);
                doc.text("Knowledge Engine", 15, 15);

                doc.setFontSize(10);
                doc.setTextColor(100);
                doc.setFont("helvetica", "normal");
                doc.text(`Bundle: ${bundleName || "Unnamed"}`, 15, 22);
                doc.text(new Date().toLocaleDateString(), pageWidth - 40, 15);

                doc.setDrawColor(226, 232, 240); // Slate-200
                doc.line(15, 25, pageWidth - 15, 25);

                const pageCount = doc.internal.pages.length - 1;
                doc.setFontSize(8);
                doc.setTextColor(148, 163, 184); // Slate-400
                doc.text("Generated by Knowledge Engine • Advanced Learning System", 15, pageHeight - 10);
                doc.text(`Page ${data.pageNumber}`, pageWidth - 25, pageHeight - 10);
            }
        });

        doc.save(`${bundleName || "bundle"}.pdf`);
    };

    const handleSave = async () => {
        if (items.length === 0 || !bundleName) return;

        setIsLoading(true);
        try {
            // 1. Create Source
            const newSourceId = crypto.randomUUID();
            await db.sources.add({
                id: newSourceId,
                name: bundleName,
                type: 'custom',
                originalData: null,
                metadata: {
                    isFrozen: false,
                    mapping: { promptField: 'prompt', answerField: ['answer'] }
                },
                isSystemSource: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            // 2. Add Entries
            const entries = items.map(item => ({
                id: crypto.randomUUID(),
                sourceId: newSourceId,
                prompt: item.prompt,
                answer: item.answer,
                customLayers: { notes: item.notes },
                stats: {
                    interval: 0,
                    repetition: 0,
                    efactor: 2.5,
                    nextReview: new Date(),
                    history: [],
                    isReflexVerified: false,
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                createdAt: new Date(),
                updatedAt: new Date()
            }));

            await db.customEntries.bulkAdd(entries as unknown as CustomEntry[]);

            onSuccess();
            onClose();

        } catch (e: unknown) {
            console.error("Save failed", e);
            setError("Failed to save bundle.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveItem = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800"
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-500" />
                            Import from PDF (AI)
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">Extract quiz items instantly from your documents.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Stepper */}
                        <div className="modalPagination hidden sm:flex items-center gap-2 mr-4">
                            <button onClick={() => step !== 'upload' && setStep('upload')} disabled={step === 'upload'} className={cn("h-2 w-8 rounded-full transition-all", step === 'upload' ? "bg-blue-500" : "bg-slate-200 dark:bg-slate-800 hover:bg-blue-200 dark:hover:bg-blue-900")} />
                            <button onClick={() => rawText && setStep('raw')} disabled={!rawText || step === 'raw'} className={cn("h-2 w-8 rounded-full transition-all", step === 'raw' ? "bg-blue-500" : "bg-slate-200 dark:bg-slate-800 hover:bg-blue-200 dark:hover:bg-blue-900")} />
                            <button onClick={() => items.length > 0 && setStep('preview')} disabled={items.length === 0 || step === 'preview'} className={cn("h-2 w-8 rounded-full transition-all", step === 'preview' ? "bg-blue-500" : "bg-slate-200 dark:bg-slate-800 hover:bg-blue-200 dark:hover:bg-blue-900")} />
                            <p className="text-xs text-slate-400 italic">Navigate here without redoing anything.</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                            <X className="h-5 w-5 text-slate-500" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <AnimatePresence mode='wait'>
                        {/* Step 1: Upload */}
                        {step === 'upload' && (
                            <motion.div
                                key="upload"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="flex flex-col items-center justify-center h-full min-h-[300px] gap-6"
                            >
                                <div className="w-full max-w-md">
                                    <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl cursor-pointer bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <div className="p-4 rounded-full bg-blue-50 dark:bg-blue-900/20 mb-4 group-hover:scale-110 transition-transform">
                                                <Upload className="w-8 h-8 text-blue-500" />
                                            </div>
                                            <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
                                                <span className="font-semibold">Click to upload</span> or drag and drop
                                            </p>
                                            <p className="text-xs text-slate-400 dark:text-slate-500">PDF (MAX. 10MB)</p>
                                        </div>
                                        <input type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
                                    </label>
                                </div>

                                {file && (
                                    <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm border border-blue-100 dark:border-blue-900">
                                        <FileText className="h-4 w-4" />
                                        <span className="font-medium">{file.name}</span>
                                        <span className="text-xs opacity-70">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                                    </div>
                                )}

                                {error && (
                                    <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 dark:bg-red-900/10 p-3 rounded-lg">
                                        <AlertCircle className="h-4 w-4" />
                                        {error}
                                    </div>
                                )}

                                <button
                                    onClick={handleExtract}
                                    disabled={!file || isLoading}
                                    className={cn(
                                        "px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2",
                                        (!file || isLoading) && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            Extracting text locally...
                                        </>
                                    ) : (
                                        <>
                                            Start Ingestion local
                                            <Check className="h-5 w-5" />
                                        </>
                                    )}
                                </button>
                            </motion.div>
                        )}

                        {/* Step 2: Raw Text Review */}
                        {step === 'raw' && (
                            <motion.div
                                key="raw"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6 flex flex-col h-full"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Target Language (Optional)</label>
                                        <input
                                            value={targetLanguage}
                                            onChange={(e) => setTargetLanguage(e.target.value)}
                                            className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                                            placeholder="e.g. French, Spanish..."
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Custom Instructions (Optional)</label>
                                        <textarea
                                            value={customPrompt}
                                            onChange={(e) => setCustomPrompt(e.target.value)}
                                            className="w-full p-2 h-[42px] min-h-[42px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 resize-none"
                                            placeholder="e.g. Focus on vocabulary..."
                                        />
                                        <p className="text-xs text-slate-400 italic">You should be aware the number of raw the AI ingestion should extract for preventing loosing data, define it explicitly here.</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                        <FileText className="h-3 w-3" />
                                        Raw Extracted Text
                                    </label>
                                    <p className="text-xs text-slate-400 italic">Review the text below. Gemini will use this to generate your quiz items.</p>
                                </div>

                                <textarea
                                    value={rawText}
                                    onChange={(e) => setRawText(e.target.value)}
                                    className="flex-1 min-h-[300px] w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono leading-relaxed text-slate-700 dark:text-slate-300 resize-none"
                                    placeholder="Extracted text will appear here..."
                                />

                                {error && (
                                    <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 dark:bg-red-900/10 p-3 rounded-lg">
                                        <AlertCircle className="h-4 w-4" />
                                        {error}
                                    </div>
                                )}

                                <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <button
                                        onClick={() => setStep('upload')}
                                        className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors font-medium"
                                    >
                                        Re-upload
                                    </button>
                                    <button
                                        onClick={handleGenerate}
                                        disabled={!rawText || isLoading}
                                        className={cn(
                                            "px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2",
                                            (!rawText || isLoading) && "opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                                Generating with AI...
                                            </>
                                        ) : (
                                            <>
                                                Start AI Ingestion
                                                <Check className="h-5 w-5" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 3: Items Preview */}
                        {step === 'preview' && (
                            <motion.div
                                key="preview"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="importPDF space-y-6"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                                    <div className="importPDF_bundleDetails space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bundle Name</label>
                                        <input
                                            value={bundleName}
                                            onChange={(e) => setBundleName(e.target.value)}
                                            className="importPDF_bundleDetails_name w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 dark:text-slate-100"
                                            placeholder="Enter bundle name..."
                                        />
                                    </div>
                                    <div className="flex items-center justify-end h-full pt-6 gap-2">
                                        <button onClick={handleDownloadJson} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-800" title="Download JSON">
                                            <Save className="h-4 w-4" />
                                        </button>
                                        <button onClick={handleDownloadPdf} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-800" title="Download Branded PDF">
                                            <FileDown className="h-4 w-4" />
                                        </button>
                                        <div className="ml-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-500">
                                            {items.length} items
                                        </div>
                                    </div>
                                </div>

                                {/* Global Reprompt Bar */}
                                <div className="flex gap-2 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <button onClick={handleQuickSwap} className="px-3 py-2 text-xs font-bold text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors" title="Quick Swap Columns">
                                        Quick Swap
                                    </button>
                                    <button onClick={handleSmartSwap} disabled={isLoading} className="px-3 py-2 text-xs font-bold text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 transition-colors" title="Smart Swap with AI">
                                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Smart Swap"}
                                    </button>
                                    <input
                                        value={reprompt}
                                        onChange={(e) => setReprompt(e.target.value)}
                                        placeholder="Refine all items (e.g. 'Make answers shorter', 'Translate to Spanish')..."
                                        className="refineInegstion flex-1 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    />
                                    <button
                                        onClick={handleRefine}
                                        disabled={!reprompt || isLoading}
                                        className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg font-bold text-sm disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refine"}
                                    </button>
                                </div>

                                <p className='text-xs text-slate-500 mt-1s'>You can, in the below table, edit any case you wish...</p>

                                <div className="importPDF_bundleDatas border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/50 max-h-[50vh] overflow-y-auto shadow-sm">
                                    <table className="w-full text-sm">
                                        <thead className="importPDF_bundleTitle bg-slate-100 dark:bg-slate-900 text-slate-500 font-medium sticky top-0 z-10">
                                            <tr>
                                                <th className="importPDF_bundleTitle_prompt p-3 text-left w-1/3">Prompt</th>
                                                <th className="importPDF_bundleTitle_answer p-3 text-left w-1/3">Answer</th>
                                                <th className="importPDF_bundleTitle_notes p-3 text-left">Notes</th>
                                                <th className="p-3 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-950/20">
                                            {items.map((item, idx) => (
                                                <tr key={idx} className="group hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors">
                                                    <td className="importPDF_bundleDatas_prompt p-3 align-top">
                                                        <textarea
                                                            value={item.prompt}
                                                            onChange={(e) => {
                                                                const newItems = [...items];
                                                                newItems[idx].prompt = e.target.value;
                                                                setItems(newItems);
                                                            }}
                                                            className="w-full bg-transparent outline-none resize-none field-sizing-content min-w-[50px] text-slate-800 dark:text-slate-200 font-medium"
                                                            rows={1}
                                                        />
                                                    </td>
                                                    <td className="importPDF_bundleDatas_answer p-3 align-top">
                                                        <textarea
                                                            value={item.answer}
                                                            onChange={(e) => {
                                                                const newItems = [...items];
                                                                newItems[idx].answer = e.target.value;
                                                                setItems(newItems);
                                                            }}
                                                            className="w-full bg-transparent outline-none resize-none field-sizing-content min-w-[50px] text-slate-600 dark:text-slate-400"
                                                            rows={1}
                                                        />
                                                    </td>
                                                    <td className="importPDF_bundleDatas_notes p-3 align-top">
                                                        <textarea
                                                            value={item.notes || ""}
                                                            onChange={(e) => {
                                                                const newItems = [...items];
                                                                newItems[idx].notes = e.target.value;
                                                                setItems(newItems);
                                                            }}
                                                            className="w-full bg-transparent outline-none resize-none field-sizing-content text-xs italic text-slate-500 min-w-[50px]"
                                                            rows={1}
                                                        />
                                                    </td>
                                                    <td className="p-3 align-top">
                                                        <button
                                                            onClick={() => handleRemoveItem(idx)}
                                                            className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 rounded transition-colors opacity-0 group-hover:opacity-100"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800 gap-3">
                                    <button
                                        onClick={() => setStep('raw')}
                                        className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors font-medium border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                                    >
                                        Back to Raw Text
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={isLoading || !bundleName || items.length === 0}
                                        className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:shadow-none"
                                    >
                                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                        Create bundle
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}
