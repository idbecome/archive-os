
import React, { useState, useEffect, useRef } from 'react';
import { Grid3X3, ScanLine, History, PieChart, FileText, FileDigit, ChevronDown, ChevronUp, ArrowRight, Package, Truck, FileBarChart, Download, X, CheckCircle2, FileSearch, FolderOpen, Users } from 'lucide-react';
import { Card, SummaryCard } from '../components/ui/Card';

export default function Dashboard({
    stats: propStats,
    docList: propDocList,
    logs: propLogs,
    docStats: propDocStats,
    TOTAL_SLOTS,
    handleViewDoc,
    handleNavigateToFolder,
    setActiveTab,
    setActiveInvTab,
    handleDownload,
    handleDownloadInvoice,
    ocrStats = { counts: { active: 0, waiting: 0, completed: 0, failed: 0 }, activeJobs: [] },
    taxSummaries = [],
    taxAudits = [],
    users = [],
    departments = [],
    externalItems = [],
    folders = []
}) {
    // Defensive Defaults
    const stats = propStats || { occupancy: 0, stored: 0, borrowed: 0, audit: 0, empty: 0 };
    const docList = Array.isArray(propDocList) ? propDocList : [];
    const logs = Array.isArray(propLogs) ? propLogs : [];
    const docStats = propDocStats || { totalSizeMB: 0, totalDocs: 0, totalRevisions: 0 };

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

    // --- OCR NOTIFICATION (Local, based on prop updates) ---
    const [ocrNotification, setOcrNotification] = useState(null);
    const lastCompletedRef = useRef(ocrStats?.counts?.completed || 0);

    useEffect(() => {
        const newCompleted = ocrStats?.counts?.completed || 0;
        if (lastCompletedRef.current > 0 && newCompleted > lastCompletedRef.current) {
            const diff = newCompleted - lastCompletedRef.current;
            setOcrNotification(`🎉 ${diff} Dokumen selesai diproses OCR!`);
            setTimeout(() => setOcrNotification(null), 5000);
        }
        lastCompletedRef.current = newCompleted;
    }, [ocrStats?.counts?.completed]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* OCR NOTIFICATION BANNER */}
            {ocrNotification && (
                <div className="bg-emerald-100 border border-emerald-400 text-emerald-700 px-4 py-3 rounded-xl relative shadow-lg animate-in slide-in-from-top-2 flex items-center gap-3" role="alert">
                    <CheckCircle2 size={24} />
                    <div>
                        <strong className="font-bold">Selesai!</strong>
                        <span className="block sm:inline"> {ocrNotification}</span>
                    </div>
                    <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setOcrNotification(null)}>
                        <X size={20} className="cursor-pointer" />
                    </span>
                </div>
            )}

            {/* OCR STATUS WIDGET */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden transition-all duration-500">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <ScanLine size={120} />
                </div>

                <div className="relative z-10">
                    {/* IDLE STATE */}
                    {((ocrStats?.counts?.active || 0) === 0 && (ocrStats?.counts?.waiting || 0) === 0) ? (
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <CheckCircle2 size={24} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">Sistem OCR Siap</h3>
                                <p className="text-blue-100 text-sm">Tidak ada antrian dokumen saat ini.</p>
                            </div>
                        </div>
                    ) : (
                        /* ACTIVE STATE */
                        <>
                            <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
                                <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
                                Sedang Memproses OCR...
                            </h3>

                            {/* PROGRESS BAR SECTION */}
                            {(ocrStats?.activeJobs || []).length > 0 && (
                                <div className="mb-6 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                                    <div className="flex justify-between items-end mb-2">
                                        <div>
                                            <p className="text-xs text-blue-100 font-bold uppercase tracking-wider mb-1">Sedang Dikerjakan</p>
                                            <p className="font-medium truncate max-w-[200px] sm:max-w-md">{ocrStats.activeJobs[0].filename}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-3xl font-bold">{ocrStats.activeJobs[0].progress || 0}<span className="text-base font-normal opacity-70">%</span></p>
                                        </div>
                                    </div>

                                    {/* Progress Bar Track */}
                                    <div className="w-full bg-black/20 rounded-full h-3 overflow-hidden mb-2">
                                        <div
                                            className="bg-white h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                                            style={{ width: `${ocrStats.activeJobs[0].progress || 0}%` }}
                                        ></div>
                                    </div>

                                    {/* ETA & Info */}
                                    <div className="flex justify-between text-xs text-blue-100">
                                        <span>Estimasi: {Math.max(1, Math.round((100 - (ocrStats.activeJobs[0].progress || 0)) * 0.5))} detik lagi</span>
                                        <span>{(ocrStats.activeJobs[0].progress || 0) < 30 ? 'Memulai ekstraksi...' : (ocrStats.activeJobs[0].progress || 0) < 80 ? 'Analisis Teks...' : 'Finishing...'}</span>
                                    </div>
                                </div>
                            )}

                            {/* STATS GRID */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 text-center">
                                    <p className="text-[10px] text-blue-100 uppercase font-bold tracking-wider mb-1">Antrian</p>
                                    <p className="text-xl font-bold">{ocrStats?.counts?.waiting || 0}</p>
                                </div>
                                <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 text-center">
                                    <p className="text-[10px] text-blue-100 uppercase font-bold tracking-wider mb-1">Sukses</p>
                                    <p className="text-xl font-bold">{ocrStats?.counts?.completed || 0}</p>
                                </div>
                                <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 text-center">
                                    <p className="text-[10px] text-blue-100 uppercase font-bold tracking-wider mb-1">Gagal</p>
                                    <p className="text-xl font-bold">{ocrStats?.counts?.failed || 0}</p>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

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
                                        <div className={`p-2 rounded-lg 
                                            ${doc.matchType === 'invoice' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' :
                                                doc.matchType === 'external_item' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' :
                                                    doc.matchType === 'tax_summary' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' :
                                                        'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'}`}>
                                            {doc.matchType === 'invoice' ? <Package size={20} /> :
                                                doc.matchType === 'external_item' ? <Truck size={20} /> :
                                                    doc.matchType === 'tax_summary' ? <FileBarChart size={20} /> :
                                                        (doc.type?.includes('pdf') ? <FileDigit size={20} /> : <FileText size={20} />)}
                                        </div>
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${doc.score > 0.3 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                                            {(doc.score * 100).toFixed(0)}% Match
                                        </span>
                                    </div>

                                    <h4 className="font-bold text-slate-800 dark:text-white mb-1 line-clamp-1 group-hover/card:text-indigo-600 dark:group-hover/card:text-indigo-400 transition-colors relative z-10 cursor-pointer" onClick={() => handleViewDoc(doc)}>
                                        {doc.title}
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 relative z-10 mb-3 block truncate">
                                        {new Date(doc.uploadDate).toLocaleDateString()} • {doc.size}
                                    </p>

                                    {/* OCR Snippet Result */}
                                    {doc.ocrContent && (
                                        <div className="relative z-10 mb-3 text-[10px] text-slate-500 bg-slate-50 dark:bg-slate-900/50 p-2 rounded border border-slate-100 dark:border-slate-800 line-clamp-2 italic">
                                            "{doc.ocrContent.substring(0, 100).replace(/\n/g, ' ')}..."
                                        </div>
                                    )}

                                    <div className="relative z-10">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (doc.matchType === 'invoice') {
                                                    handleDownloadInvoice(doc.data || doc);
                                                } else {
                                                    handleDownload(doc.data || doc);
                                                }
                                            }}
                                            className="w-full text-xs bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg transition-all font-medium flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                                        >
                                            <Download size={14} /> Download File
                                        </button>
                                    </div>
                                    <div className="mt-2 relative z-10">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (doc.matchType === 'invoice') {
                                                    setActiveTab('inventory');
                                                    setActiveInvTab('internal');
                                                } else if (doc.matchType === 'external_item') {
                                                    setActiveTab('inventory');
                                                    setActiveInvTab('external');
                                                } else if (doc.matchType === 'tax_summary') {
                                                    setActiveTab('tax-summary');
                                                } else {
                                                    handleNavigateToFolder(doc.folderId);
                                                }
                                            }}
                                            className={`w-full text-[10px] py-1 rounded-lg transition-colors font-bold flex items-center justify-center gap-1 uppercase tracking-wider
                                                ${doc.matchType === 'invoice' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 hover:bg-amber-100' :
                                                    doc.matchType === 'external_item' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 hover:bg-emerald-100' :
                                                        doc.matchType === 'tax_summary' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 hover:bg-purple-100' :
                                                            'bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'}`}
                                        >
                                            {doc.matchType === 'invoice' ? `📦 ${doc.folderName}` :
                                                doc.matchType === 'external_item' ? `🚚 ${doc.folderName}` :
                                                    doc.matchType === 'tax_summary' ? `📊 ${doc.folderName}` :
                                                        `📂 ${doc.folderName || 'General'}`}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <SummaryCard
                    title="Gudang Internal"
                    value={`${(stats?.occupancy || 0).toFixed(0)}%`}
                    subtext={`${stats?.empty || 0} Slot Tersedia`}
                    icon={Grid3X3}
                    colorClass="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400"
                />
                <SummaryCard
                    title="Gudang Eksternal"
                    value={externalItems?.length || 0}
                    subtext="Box di Indoarsip"
                    icon={Truck}
                    colorClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
                />
                <SummaryCard
                    title="Audit Pajak"
                    value={(taxAudits?.filter(a => a.status !== 'Selesai') || []).length}
                    subtext={`${taxAudits?.length || 0} Total Pemeriksaan`}
                    icon={FileSearch}
                    colorClass="bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
                />
                <SummaryCard
                    title="Kepatuhan SPT"
                    value={taxSummaries?.length || 0}
                    subtext="Laporan Tersimpan"
                    icon={FileBarChart}
                    colorClass="bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <SummaryCard
                    title="Dokumen Digital"
                    value={docList.length}
                    subtext={`${docStats?.totalSizeMB || '0'} MB Data`}
                    icon={ScanLine}
                    colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                />
                <SummaryCard
                    title="Struktur Folder"
                    value={folders?.length || 0}
                    subtext="Folder Direktori"
                    icon={FolderOpen}
                    colorClass="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400"
                />
                <SummaryCard
                    title="Pengguna Sistem"
                    value={users?.length || 0}
                    subtext={`${departments?.length || 0} Departemen`}
                    icon={Users}
                    colorClass="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <h3 className="font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                        <PieChart size={20} className="text-indigo-500" /> Distribusi Penyimpanan
                    </h3>
                    <div className="space-y-4">
                        <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-6 overflow-hidden flex shadow-inner">
                            <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${((stats?.stored || 0) / (TOTAL_SLOTS || 1)) * 100}%` }} title={`Tersimpan: ${stats?.stored || 0}`}></div>
                            <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${((stats?.borrowed || 0) / (TOTAL_SLOTS || 1)) * 100}%` }} title={`Dipinjam: ${stats?.borrowed || 0}`}></div>
                            <div className="bg-purple-500 h-full transition-all duration-500" style={{ width: `${((stats?.audit || 0) / (TOTAL_SLOTS || 1)) * 100}%` }} title={`Audit: ${stats?.audit || 0}`}></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div><span className="text-gray-600 dark:text-slate-400">Tersimpan ({stats?.stored || 0})</span></div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500"></div><span className="text-gray-600 dark:text-slate-400">Dipinjam ({stats?.borrowed || 0})</span></div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-500"></div><span className="text-gray-600 dark:text-slate-400">Audit ({stats?.audit || 0})</span></div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gray-200 dark:bg-slate-700"></div><span className="text-gray-600 dark:text-slate-400">Kosong ({stats?.empty || 0})</span></div>
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
            <Card className="max-h-[400px] overflow-y-auto relative p-0">
                <div className="sticky top-0 bg-white dark:bg-slate-900 z-10 p-6 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <History size={20} className="text-purple-500" /> Log Aktivitas (Audit Trail)
                    </h3>
                </div>
                <div className="p-6 pt-2 space-y-3">
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
