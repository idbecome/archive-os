import React from 'react';
import { ClipboardCheck, CheckCircle2, AlertCircle, Plus } from 'lucide-react';
import { Card, SummaryCard } from '../components/ui/Card';

export default function TaxMonitoring({ taxAudits, hasPermission }) {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SummaryCard title="Pemeriksaan Aktif" value={taxAudits.filter(t => t.status === 'On Progress').length} icon={ClipboardCheck} colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" />
                <SummaryCard title="Selesai (YTD)" value={taxAudits.filter(t => t.status === 'Done').length} icon={CheckCircle2} colorClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" />
                <SummaryCard title="Potensi Sengketa" value={taxAudits.filter(t => t.status === 'Dispute').length} icon={AlertCircle} colorClass="bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400" />
            </div>

            <Card>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg dark:text-white">Daftar Pemeriksaan Pajak</h3>
                    {hasPermission('tax-monitoring', 'create') && (
                        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm flex items-center gap-2 hover:bg-indigo-700 transition-colors">
                            <Plus size={16} /> Pemeriksaan Baru
                        </button>
                    )}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-slate-800 dark:text-slate-300">
                            <tr>
                                <th className="px-6 py-3">Judul Pemeriksaan</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Progress</th>
                                <th className="px-6 py-3">Tindakan</th>
                            </tr>
                        </thead>
                        <tbody>
                            {taxAudits.map(audit => (
                                <tr key={audit.id} className="bg-white border-b dark:bg-slate-900 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4 font-medium dark:text-white">{audit.title}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${audit.status === 'On Progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' : audit.status === 'Done' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300'}`}>
                                            {audit.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                                            <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: '45%' }}></div>
                                        </div>
                                        <span className="text-xs text-gray-500 mt-1 block">Tahap: {audit.currentStep}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button className="text-indigo-600 hover:underline dark:text-indigo-400">Detail</button>
                                    </td>
                                </tr>
                            ))}
                            {taxAudits.length === 0 && (
                                <tr><td colSpan="4" className="px-6 py-4 text-center text-gray-500 italic">Belum ada data pemeriksaan.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
