import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageCircle, X, Send, FileText, FileSpreadsheet,
    Package, Sparkles, Search, ArrowRight, Loader2,
    ChevronDown, Bot, User
} from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

// Format currency for Indonesian Rupiah
const formatRupiah = (amount) => {
    if (!amount && amount !== 0) return '-';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

// Result card component
const ResultCard = ({ result, isDarkMode, onNavigate, onLocationClick }) => {
    const typeConfig = {
        document: { icon: FileText, color: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50 dark:bg-blue-900/20', label: 'Dokumen' },
        invoice: { icon: FileSpreadsheet, color: 'from-emerald-500 to-green-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', label: 'Invoice' },
        external: { icon: Package, color: 'from-amber-500 to-orange-600', bg: 'bg-amber-50 dark:bg-amber-900/20', label: 'Eksternal' },
    };
    const config = typeConfig[result.type] || typeConfig.document;
    const Icon = config.icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-3 rounded-xl border transition-all group hover:scale-[1.02] ${isDarkMode
                ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-indigo-300 shadow-sm'
                }`}
        >
            <div className="flex flex-col gap-3">
                <div
                    className="flex-1 flex items-start gap-3 cursor-pointer"
                    onClick={() => onNavigate?.(result)}
                >
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                        <Icon size={14} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${config.bg} ${isDarkMode ? 'text-white/70' : 'text-slate-600'
                                }`}>{config.label}</span>
                            {result.semantic && <Sparkles size={10} className="text-amber-400" />}
                        </div>
                        <p className={`text-sm font-semibold truncate ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                            {result.title}
                        </p>
                        {result.vendor && (
                            <p className={`text-xs ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>
                                {result.vendor} {result.amount ? `• ${formatRupiah(result.amount)}` : ''}
                            </p>
                        )}
                        {result.snippet && (
                            <p className={`text-xs mt-1 line-clamp-2 ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>
                                {result.snippet}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex gap-2 justify-end pt-2 border-t border-slate-100 dark:border-white/5">
                    <button
                        onClick={() => onNavigate?.(result)}
                        className={`px-3 py-1.5 rounded-lg transition-all font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5 ${isDarkMode
                            ? 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/40'
                            : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100'}`}
                    >
                        Detail <ArrowRight size={12} />
                    </button>
                    {onLocationClick && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onLocationClick(result); }}
                            className={`px-3 py-1.5 rounded-lg transition-all font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5 ${isDarkMode
                                ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/40'
                                : 'bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-100'}`}
                        >
                            Lokasi <Search size={12} />
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

// Typing indicator
const TypingIndicator = ({ isDarkMode }) => (
    <div className="flex items-center gap-2 px-4 py-3">
        <div className={`w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg text-xs`}>
            🤖
        </div>
        <div className="flex gap-1">
            {[0, 1, 2].map(i => (
                <motion.div
                    key={i}
                    className={`w-2 h-2 rounded-full ${isDarkMode ? 'bg-white/40' : 'bg-slate-400'}`}
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                />
            ))}
        </div>
    </div>
);

// Simple Markdown component to handle basic formatting, alerts, and tables
const MarkdownRenderer = ({ content, isDarkMode }) => {
    if (!content) return null;

    const lines = content.split('\n');
    let inTable = false;
    let tableRows = [];

    const renderLine = (line, index) => {
        // Handle Alerts
        if (line.startsWith('> [!')) {
            const match = line.match(/> \[!(\w+)\]/);
            const type = match ? match[1] : 'NOTE';
            const colors = {
                NOTE: 'blue',
                TIP: 'emerald',
                IMPORTANT: 'indigo',
                WARNING: 'amber',
                CAUTION: 'red'
            };
            const color = colors[type] || 'blue';
            return (
                <div key={index} className={`my-2 p-2 rounded-lg border-l-4 text-[11px] ${isDarkMode
                    ? `bg-${color}-500/10 border-${color}-500 text-${color}-300`
                    : `bg-${color}-50 border-${color}-500 text-${color}-700`
                    }`}>
                    <span className="font-bold uppercase tracking-tight mr-1">{type}:</span>
                    {line.replace(/> \[!\w+\]\s*/, '').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')}
                </div>
            );
        }

        // Handle Headers
        if (line.startsWith('### ')) {
            return <h3 key={index} className="text-sm font-bold mt-3 mb-1 text-indigo-500">{line.replace('### ', '')}</h3>;
        }

        // Handle Bold
        let formattedLine = line.split('**').map((part, i) => i % 2 === 1 ? <b key={i} className="font-bold text-indigo-400">{part}</b> : part);

        // Handle Lists
        if (line.trim().startsWith('- ')) {
            return <div key={index} className="flex gap-2 pl-1 my-0.5"><span className="text-indigo-500">•</span><div>{formattedLine}</div></div>;
        }

        // Handle Tables (Minimalist)
        if (line.includes('|')) {
            const cells = line.split('|').filter(c => c.trim() !== '').map(c => c.trim());
            if (cells.length > 0 && !line.includes('---')) {
                return (
                    <div key={index} className={`grid grid-cols-${cells.length} gap-2 py-1 px-2 text-[10px] border-b ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
                        {cells.map((c, i) => <div key={i} className={index === 0 ? "font-bold text-indigo-400" : ""}>{c}</div>)}
                    </div>
                );
            }
            return null;
        }

        return <p key={index} className="mb-1">{formattedLine}</p>;
    };

    return <div className="markdown-content">{lines.map((line, i) => renderLine(line, i))}</div>;
};

// Quick action suggestions
const quickActions = [
    "Bandingkan PPH Jan vs Feb 2024",
    "Analisa trend PPN depan",
    "Status pemeriksaan pajak",
    "Cari invoice > 5jt",
];

export default function AiChatAssistant({
    isDarkMode,
    onNavigateToDoc,
    onNavigateToInvoice,
    handleNavigateToFolder,
    setActiveTab,
    setActiveInvTab
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            text: 'Halo! 👋 Saya asisten AI Archive-OS. Tanyakan apa saja tentang dokumen, invoice, atau arsip Anda.',
            results: []
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    const handleSend = async (text = input) => {
        const msg = text.trim();
        if (!msg || isLoading) return;

        // Add user message
        setMessages(prev => [...prev, { role: 'user', text: msg }]);
        setInput('');
        setIsLoading(true);

        try {
            const res = await fetch(`${API_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: msg })
            });
            const data = await res.json();

            setMessages(prev => [...prev, {
                role: 'assistant',
                text: data.reply || 'Maaf, tidak ada respons.',
                results: data.results || [],
                intent: data.intent
            }]);
        } catch (error) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                text: 'Maaf, koneksi ke server gagal. Pastikan server berjalan.',
                results: []
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleResultClick = (result) => {
        if (result.type === 'document' && onNavigateToDoc) {
            onNavigateToDoc(result);
        } else if (result.type === 'invoice' && onNavigateToInvoice) {
            onNavigateToInvoice(result);
        }
    };

    const handleLocationClick = (result) => {
        console.log("Navigating to location for result:", result);

        if (result.type === 'invoice' || result.slotId) {
            setActiveTab('inventory');
            setActiveInvTab('internal');
            // Logic can be added here to auto-select the box in Inventory page
            setIsOpen(false);
        } else if (result.type === 'external') {
            setActiveTab('inventory');
            setActiveInvTab('external');
            setIsOpen(false);
        } else if (result.folderId && handleNavigateToFolder) {
            console.log("Targeting folderId:", result.folderId);
            handleNavigateToFolder(result.folderId);
            setIsOpen(false);
        } else {
            console.warn("No valid location found for result:", result);
        }
    };

    const clearChat = () => {
        setMessages([{
            role: 'assistant',
            text: 'Chat direset. Ada yang bisa saya bantu?',
            results: []
        }]);
    };

    return (
        <>
            {/* Floating Button */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setIsOpen(true)}
                        className="fixed bottom-6 right-6 z-[200] w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-2xl shadow-indigo-500/40 flex items-center justify-center group"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                        <span className="text-2xl group-hover:scale-110 transition-transform">🤖</span>
                        {/* Pulse ring */}
                        <span className="absolute inset-0 rounded-full bg-indigo-500 animate-ping opacity-20" />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Chat Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 40, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 40, scale: 0.9 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className={`fixed bottom-6 right-6 z-[200] w-[400px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-3rem)] rounded-3xl overflow-hidden flex flex-col shadow-2xl ${isDarkMode
                            ? 'bg-[#0d1230]/95 border border-white/10 shadow-black/50'
                            : 'bg-white/95 border border-slate-200 shadow-slate-300/50'
                            }`}
                        style={{ backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}
                    >
                        {/* Header */}
                        <div className={`p-4 flex items-center gap-3 border-b flex-shrink-0 ${isDarkMode ? 'border-white/10' : 'border-slate-100'
                            }`}>
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center shadow-lg shadow-indigo-500/30 text-lg">
                                🤖
                            </div>
                            <div className="flex-1">
                                <h3 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                    AI Assistant
                                </h3>
                                <p className={`text-[10px] ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} font-semibold flex items-center gap-1`}>
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                    Online • Hybrid Search
                                </p>
                            </div>
                            <button
                                onClick={clearChat}
                                className={`p-2 rounded-xl transition-all text-xs font-semibold ${isDarkMode ? 'hover:bg-white/10 text-white/50 hover:text-white/80' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
                                    }`}
                                title="Reset Chat"
                            >
                                Reset
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className={`p-2 rounded-xl transition-all ${isDarkMode ? 'hover:bg-white/10 text-white/50 hover:text-red-400' : 'hover:bg-red-50 text-slate-400 hover:text-red-500'
                                    }`}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 custom-scrollbar">
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {msg.role === 'assistant' && (
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg mt-0.5 text-xs">
                                            🤖
                                        </div>
                                    )}
                                    <div className={`max-w-[85%] space-y-2`}>
                                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words overflow-hidden ${msg.role === 'user'
                                            ? 'bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-br-lg shadow-lg shadow-indigo-500/20'
                                            : isDarkMode
                                                ? 'bg-white/8 text-white/90 rounded-bl-lg border border-white/5'
                                                : 'bg-slate-100 text-slate-700 rounded-bl-lg'
                                            }`}>
                                            <MarkdownRenderer content={msg.text} isDarkMode={isDarkMode} />
                                        </div>

                                        {/* Intent badges */}
                                        {msg.intent && (msg.intent.vendor || msg.intent.minAmount || msg.intent.maxAmount) && (
                                            <div className="flex flex-wrap gap-1 px-1">
                                                {msg.intent.vendor && (
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${isDarkMode ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>
                                                        🏢 {msg.intent.vendor}
                                                    </span>
                                                )}
                                                {msg.intent.minAmount && (
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${isDarkMode ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}`}>
                                                        💰 ≥ {formatRupiah(msg.intent.minAmount)}
                                                    </span>
                                                )}
                                                {msg.intent.maxAmount && (
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${isDarkMode ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700'}`}>
                                                        💰 ≤ {formatRupiah(msg.intent.maxAmount)}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Result cards */}
                                        {msg.results && msg.results.length > 0 && (
                                            <div className="space-y-2 mt-1">
                                                {msg.results.slice(0, 5).map((result, j) => (
                                                    <ResultCard
                                                        key={j}
                                                        result={result}
                                                        isDarkMode={isDarkMode}
                                                        onNavigate={handleResultClick}
                                                        onLocationClick={handleLocationClick}
                                                    />
                                                ))}
                                                {msg.results.length > 5 && (
                                                    <p className={`text-xs text-center py-1 ${isDarkMode ? 'text-white/30' : 'text-slate-400'}`}>
                                                        +{msg.results.length - 5} hasil lainnya
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {msg.role === 'user' && (
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'
                                            }`}>
                                            <User size={14} className={isDarkMode ? 'text-white/70' : 'text-slate-500'} />
                                        </div>
                                    )}
                                </div>
                            ))}

                            {isLoading && <TypingIndicator isDarkMode={isDarkMode} />}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Quick Actions (only show if few messages) */}
                        {messages.length <= 2 && !isLoading && (
                            <div className={`px-4 pb-2 flex flex-wrap gap-1.5 border-t pt-2 ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
                                {quickActions.map((qa, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleSend(qa)}
                                        className={`text-[11px] px-3 py-1.5 rounded-full font-medium transition-all ${isDarkMode
                                            ? 'bg-white/5 text-white/60 hover:bg-indigo-500/20 hover:text-indigo-300 border border-white/5'
                                            : 'bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-700'
                                            }`}
                                    >
                                        {qa}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Input */}
                        <div className={`p-3 border-t flex-shrink-0 ${isDarkMode ? 'border-white/10' : 'border-slate-100'}`}>
                            <div className={`flex items-center gap-2 rounded-2xl px-4 py-2 ${isDarkMode
                                ? 'bg-white/5 border border-white/10 focus-within:border-indigo-500/50'
                                : 'bg-slate-100 border border-transparent focus-within:border-indigo-300 focus-within:bg-white'
                                } transition-all`}>
                                <Search size={16} className={`flex-shrink-0 ${isDarkMode ? 'text-white/30' : 'text-slate-400'}`} />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Tanya sesuatu..."
                                    disabled={isLoading}
                                    className={`flex-1 bg-transparent text-sm outline-none placeholder-opacity-50 ${isDarkMode
                                        ? 'text-white placeholder-white/30'
                                        : 'text-slate-800 placeholder-slate-400'
                                        }`}
                                />
                                <button
                                    onClick={() => handleSend()}
                                    disabled={!input.trim() || isLoading}
                                    className={`p-2 rounded-xl transition-all ${input.trim() && !isLoading
                                        ? 'bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95'
                                        : isDarkMode ? 'text-white/20' : 'text-slate-300'
                                        }`}
                                >
                                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                </button>
                            </div>
                            <p className={`text-[9px] text-center mt-1.5 ${isDarkMode ? 'text-white/20' : 'text-slate-300'}`}>
                                Hybrid Search • Semantic + Keyword • parseIntent NLP
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
