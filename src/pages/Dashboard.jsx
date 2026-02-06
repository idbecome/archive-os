import React, { useState } from 'react';
import { Grid3X3, ScanLine, History, PieChart, FileText, FileDigit, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { Card, SummaryCard } from '../components/ui/Card';

export default function Dashboard({ stats, docList, logs, docStats, TOTAL_SLOTS, handleViewDoc }) {
    const [expandedLogId, setExpandedLogId] = useState(null);

    const toggleLog = (id) => {
        setExpandedLogId(expandedLogId === id ? null : id);
    };
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
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
