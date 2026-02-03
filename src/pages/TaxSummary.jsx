import React from 'react';
import { Percent, FileBarChart, Trash2, Plus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card } from '../components/ui/Card';

export default function TaxSummary({ taxSummaries, hasPermission, setTaxForm, setModalTab, setIsModalOpen }) {
    const pphData = taxSummaries.map(t => ({ name: `${t.month}`, pph23: t.pph23, pph42: t.pph42 }));
    const ppnData = taxSummaries.map(t => ({ name: `${t.month}`, in: typeof t.ppnIn === 'object' ? t.ppnIn.total || 0 : 0, out: typeof t.ppnOut === 'object' ? t.ppnOut.total || 0 : 0 }));

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <h3 className="font-bold text-lg mb-4 dark:text-white flex items-center gap-2">
                        <Percent size={20} className="text-indigo-500" /> PPH Summary (YTD)
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={pphData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                                <YAxis stroke="#9ca3af" fontSize={12} />
                                <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Legend />
                                <Line type="monotone" dataKey="pph23" stroke="#8884d8" name="PPH 23" strokeWidth={2} />
                                <Line type="monotone" dataKey="pph42" stroke="#82ca9d" name="PPH 4(2)" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
                <Card>
                    <h3 className="font-bold text-lg mb-4 dark:text-white flex items-center gap-2">
                        <FileBarChart size={20} className="text-emerald-500" /> PPN Summary (In/Out)
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={ppnData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                                <YAxis stroke="#9ca3af" fontSize={12} />
                                <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Legend />
                                <Line type="monotone" dataKey="in" stroke="#10b981" name="Masukan" strokeWidth={2} />
                                <Line type="monotone" dataKey="out" stroke="#f59e0b" name="Keluaran" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            <Card>
                <h3 className="font-bold text-lg mb-4 dark:text-white">Detail Bulanan</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-slate-800 dark:text-slate-300">
                            <tr>
                                <th className="px-6 py-3">Periode</th>
                                <th className="px-6 py-3">PPH 23</th>
                                <th className="px-6 py-3">PPH 4(2)</th>
                                <th className="px-6 py-3">PPN Masukan</th>
                                <th className="px-6 py-3">PPN Keluaran</th>
                                {hasPermission('tax-summary', 'delete') && <th className="px-6 py-3">Aksi</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {taxSummaries.map((row, idx) => (
                                <tr key={idx} className="bg-white border-b dark:bg-slate-900 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                                    <td className="px-6 py-4 font-medium dark:text-white">{row.month} {row.year}</td>
                                    <td className="px-6 py-4">Rp {row.pph23.toLocaleString()}</td>
                                    <td className="px-6 py-4">Rp {row.pph42.toLocaleString()}</td>
                                    <td className="px-6 py-4">Rp {row.ppnIn?.total?.toLocaleString() || 0}</td>
                                    <td className="px-6 py-4">Rp {row.ppnOut?.total?.toLocaleString() || 0}</td>
                                    {hasPermission('tax-summary', 'delete') && (
                                        <td className="px-6 py-4"><button className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button></td>
                                    )}
                                </tr>
                            ))}
                            {taxSummaries.length === 0 && (
                                <tr><td colSpan="6" className="px-6 py-4 text-center text-gray-500 italic">Belum ada data pajak.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <div className="flex justify-center pt-6">
                <button
                    onClick={() => { setTaxForm({ month: 'Januari', year: 2024, pph23: 0, pph42: 0, ppnIn: { total: 0 }, ppnOut: { total: 0 } }); setModalTab('tax-form'); setIsModalOpen(true); }}
                    className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 hover:scale-105 transition-all flex items-center gap-3"
                >
                    <Plus size={20} /> Update Data Pajak Bulanan
                </button>
            </div>
        </div>
    );
}
