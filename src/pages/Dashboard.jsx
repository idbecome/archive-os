import React, { useState } from 'react';
import { Grid3X3, ScanLine, History, PieChart, FileText, FileDigit, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { Card, SummaryCard } from '../components/ui/Card';

export default function Dashboard({ stats, docList, logs, docStats, TOTAL_SLOTS, handleViewDoc, handleNavigateToFolder }) {
    const [expandedLogId, setExpandedLogId] = useState(null);
    const [semanticQuery, setSemanticQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!semanticQuery.trim()) return;

        setIsSearching(true);
        try {
            const res = await fetch(`http://localhost:5000/api/search?q=${encodeURIComponent(semanticQuery)}`);
            const data = await res.json();
            setSearchResults(data);
        } catch (err) {
            console.error("Search failed:", err);
        } finally {
            setIsSearching(false);
        }
    };

    const toggleLog = (id) => {
        setExpandedLogId(expandedLogId === id ? null : id);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* 🔍 SEMANTIC SEARCH BAR */}
            <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-6 rounded-3xl border border-white/20 shadow-xl shadow-indigo-500/5 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 mb-4 flex items-center gap-2">
                    <ScanLine className="text-indigo-500" /> AI Semantic Search
                </h2>

                <form onSubmit={handleSearch} className="relative z-10">
                    <div className="relative">
                        <input
                            type="text"
                            value={semanticQuery}
                            onChange={(e) => setSemanticQuery(e.target.value)}
                            placeholder="Cari dokumen secara natural (contoh: 'Invoice yang masih pending')..."
                            className="w-full pl-5 pr-14 py-4 rounded-2xl bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-700 dark:text-slate-200 shadow-sm"
                        />
                        <button
                            type="submit"
                            disabled={isSearching}
                            className="absolute right-2 top-2 bottom-2 aspect-square bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 active:scale-95"
                        >
                            {isSearching ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <ArrowRight size={20} />
                            )}
                        </button>
                    </div>
                </form>

                {/* SEARCH RESULTS */}
                {(searchResults.length > 0 || isSearching) && (
                    <div className="mt-6 space-y-3 animate-in fade-in slide-in-from-top-4">
                        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            Hasil Pencarian AI
                            <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">Beta</span>
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {searchResults.map(doc => (
                                <div
                                    key={doc.id}
                                    onClick={() => handleViewDoc(doc)}
                                    className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10 cursor-pointer transition-all group/card relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover/card:opacity-20 transition-opacity">
                                        <ScanLine size={100} />
                                    </div>

                                    <div className="flex justify-between items-start mb-2 relative z-10">
                                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                                            {doc.type?.includes('pdf') ? <FileDigit size={20} /> : <FileText size={20} />}
                                        </div>
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${doc.score > 0.25 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                            {(doc.score * 100).toFixed(0)}% Match
                                        </span>
                                    </div>

                                    <h4 className="font-bold text-slate-800 dark:text-white mb-1 line-clamp-1 group-hover/card:text-indigo-600 dark:group-hover/card:text-indigo-400 transition-colors relative z-10 cursor-pointer" onClick={() => handleViewDoc(doc)}>
                                        {doc.title}
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 relative z-10 mb-3">
                                        {new Date(doc.uploadDate).toLocaleDateString()} • {doc.size}
                                    </p>

                                    <div className="flex gap-2 relative z-10">
                                        <button
                                            onClick={() => handleViewDoc(doc)}
                                            className="flex-1 text-xs bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 py-1.5 rounded-lg transition-colors font-medium"
                                        >
                                            Lihat File
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleNavigateToFolder(doc.folderId);
                                            }}
                                            className="flex-1 text-xs bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 py-1.5 rounded-lg transition-colors font-medium flex items-center justify-center gap-1"
                                        >
                                            📂 {doc.folderName || 'General'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SummaryCard
                    title="Kapasitas Rak"
                    value={`${stats.occupancy.toFixed(0)}%`}
                    subtext={`${stats.empty} Slot Kosong`}
                    icon={Grid3X3}
                    colorClass="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400"
                />
                <SummaryCard
                    title="Arsip Digital"
                    value={docList.length}
                    subtext={`${docStats.totalSizeMB} MB Total Data`}
                    icon={ScanLine}
                    colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                />
                <SummaryCard
                    title="Aktivitas"
                    value={logs.length}
                    subtext="Total Log Sistem"
                    icon={History}
                    colorClass="bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <h3 className="font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                        <PieChart size={20} className="text-indigo-500" /> Distribusi Penyimpanan
                    </h3>
                    <div className="space-y-4">
                        <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-6 overflow-hidden flex shadow-inner">
                            <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${(stats.stored / TOTAL_SLOTS) * 100}%` }} title={`Tersimpan: ${stats.stored}`}></div>
                            <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${(stats.borrowed / TOTAL_SLOTS) * 100}%` }} title={`Dipinjam: ${stats.borrowed}`}></div>
                            <div className="bg-purple-500 h-full transition-all duration-500" style={{ width: `${(stats.audit / TOTAL_SLOTS) * 100}%` }} title={`Audit: ${stats.audit}`}></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div><span className="text-gray-600 dark:text-slate-400">Tersimpan ({stats.stored})</span></div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500"></div><span className="text-gray-600 dark:text-slate-400">Dipinjam ({stats.borrowed})</span></div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-500"></div><span className="text-gray-600 dark:text-slate-400">Audit ({stats.audit})</span></div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gray-200 dark:bg-slate-700"></div><span className="text-gray-600 dark:text-slate-400">Kosong ({stats.empty})</span></div>
                        </div>
                    </div>
                </Card>

                <Card>
                    <h3 className="font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                        <FileText size={20} className="text-blue-500" /> Dokumen Terbaru
                    </h3>
                    <div className="space-y-3">
                        {docList.slice(0, 3).map(doc => (
                            <div key={doc.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer" onClick={() => handleViewDoc(doc)}>
                                <div className="w-10 h-10 rounded bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500">
                                    {doc.type?.includes('pdf') ? <FileDigit size={20} /> : <FileText size={20} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-gray-900 dark:text-white truncate text-sm">{doc.title}</div>
                                    <div className="text-xs text-gray-500 dark:text-slate-400">{new Date(doc.uploadDate).toLocaleDateString()} • {doc.size}</div>
                                </div>
                            </div>
                        ))}
                        {docList.length === 0 && <p className="text-sm text-gray-500 italic">Belum ada dokumen.</p>}
                    </div>
                </Card>
            </div>
            <Card className="max-h-[300px] overflow-y-auto">
                <h3 className="font-bold mb-4 sticky top-0 bg-white dark:bg-slate-900/0 backdrop-blur-sm z-10">Log Aktivitas (Audit Trail)</h3>
                <div className="space-y-3">
                    {logs.map(log => (
                        <div key={log.id} className="border-b border-slate-100 dark:border-slate-800 pb-2">
                            <div
                                className="flex justify-between text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 p-2 rounded-lg transition-colors"
                                onClick={() => toggleLog(log.id)}
                            >
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">{log.action}</span>
                                        {log.oldValue && <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded border border-amber-200">AUDIT</span>}
                                    </div>
                                    <p className="text-gray-500">{log.details}</p>
                                    <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-1">
                                        <span>{log.user || 'System'}</span> • <span>{new Date(log.timestamp).toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="text-gray-400 flex items-center">
                                    {expandedLogId === log.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </div>
                            </div>

                            {/* Expanded Audit Details */}
                            {expandedLogId === log.id && (log.oldValue || log.newValue) && (
                                <div className="mt-2 text-xs bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 font-mono animate-in slide-in-from-top-1">
                                    <div className="grid grid-cols-1 gap-2">
                                        {log.oldValue && (
                                            <div className="bg-red-50 dark:bg-red-900/10 p-2 rounded border border-red-100 dark:border-red-900/20 text-red-700 dark:text-red-400 overflow-x-auto">
                                                <div className="font-bold mb-1 border-b border-red-200 dark:border-red-900/30 pb-1">SEBELUM (BEFORE)</div>
                                                <pre className="whitespace-pre-wrap">{log.oldValue.startsWith('{') ? JSON.stringify(JSON.parse(log.oldValue), null, 2) : log.oldValue}</pre>
                                            </div>
                                        )}
                                        {log.newValue && (
                                            <div className="bg-emerald-50 dark:bg-emerald-900/10 p-2 rounded border border-emerald-100 dark:border-emerald-900/20 text-emerald-700 dark:text-emerald-400 overflow-x-auto">
                                                <div className="font-bold mb-1 border-b border-emerald-200 dark:border-emerald-900/30 pb-1">SESUDAH (AFTER)</div>
                                                <pre className="whitespace-pre-wrap">{log.newValue.startsWith('{') ? JSON.stringify(JSON.parse(log.newValue), null, 2) : log.newValue}</pre>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}
