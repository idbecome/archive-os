import React, { useState, useMemo } from 'react';
import {
    Percent, FileBarChart, Trash2, Plus, ArrowUpRight, ArrowDownRight,
    TrendingUp, TrendingDown, LayoutGrid, List, SlidersHorizontal, Settings,
    ChevronDown, ArrowRight, Download, Calendar, Edit3
} from 'lucide-react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ComposedChart, PieChart, Pie, Cell
} from 'recharts';
import { Card, SummaryCard } from '../components/ui/Card';

export default function TaxSummary({ taxSummaries, hasPermission, setTaxForm, setModalTab, setIsModalOpen, config, saveConfig, handleDeleteRecord, handleRenameTaxType }) {
    const [activeTab, setActiveTab] = useState('pph'); // pph, ppn, comparison
    const [viewMode, setViewMode] = useState('chart'); // chart, table

    // --- DYNAMIC CONFIGURATION (Now passed from App.jsx) ---
    // config and saveConfig are now props


    const handleAddType = (category) => {
        const name = prompt("Masukkan nama tipe pajak baru:");
        if (name && !config[category].includes(name)) {
            saveConfig({
                ...config,
                [category]: [...config[category], name]
            });
        }
    };

    const handleDeleteType = (category, typeId) => {
        if (window.confirm(`Apakah Anda yakin ingin menghapus kolom "${typeId}"? Data historis mungkin tidak akan terlihat.`)) {
            const newTypes = config[category].filter(t => t !== typeId);
            saveConfig({
                ...config,
                [category]: newTypes
            });
        }
    };

    const handleEditRow = (record, type = 'all') => {
        // Construct form data from record
        const formData = {
            id: record.id,
            month: record.month,
            year: record.year,
            data: {
                pph: {},
                ppnIn: {},
                ppnOut: {}
            }
        };

        // Populate PPh
        config.pphTypes.forEach(t => { formData.data.pph[t] = getSafeValue(record, t, 'pph'); });
        // Populate PPN In
        config.ppnInTypes.forEach(t => { formData.data.ppnIn[t] = getSafeValue(record, t, 'ppnIn'); });
        // Populate PPN Out
        config.ppnOutTypes.forEach(t => { formData.data.ppnOut[t] = getSafeValue(record, t, 'ppnOut'); });

        setTaxForm(formData);
        // Determine modal tab based on active tab or passed type
        if (type === 'pph') setModalTab('tax-form-pph');
        else if (type === 'ppn') setModalTab('tax-form-ppn');
        else setModalTab(activeTab === 'pph' ? 'tax-form-pph' : 'tax-form-ppn'); // Default fallback
        setIsModalOpen(true);
    };

    // --- COMPUTED DATA HELPERS ---
    const getSafeValue = (record, type, category) => {
        // Handle legacy vs new structure
        if (!record) return 0;
        // Check dynamic data object first
        if (record.data && record.data[category] && record.data[category][type] !== undefined) {
            return record.data[category][type];
        }
        // Fallback for legacy PPh23/42/etc if needed, or return 0
        if (type === 'PPh 23') return record.pph23 || 0;
        if (type === 'PPh 4(2)') return record.pph42 || 0;
        return 0;
    };

    const sortedSummaries = useMemo(() => {
        const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        return [...taxSummaries].sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return months.indexOf(a.month) - months.indexOf(b.month);
        });
    }, [taxSummaries]);

    // --- TAB: PPH RENDERER ---
    const renderPPhTab = () => {
        // Transform data for charts
        const chartData = sortedSummaries.map(s => {
            const item = { name: `${s.month} ${s.year}` };
            config.pphTypes.forEach(type => {
                item[type] = getSafeValue(s, type, 'pph');
            });
            return item;
        });

        const totalPerType = config.pphTypes.reduce((acc, type) => {
            acc[type] = sortedSummaries.reduce((sum, s) => sum + getSafeValue(s, type, 'pph'), 0);
            return acc;
        }, {});

        return (
            <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
                {/* 1. Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {config.pphTypes.map(type => (
                        <div key={type} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-indigo-100 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                            <div className="absolute right-0 top-0 w-16 h-16 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-bl-3xl -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                            <h4 className="text-xs text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wider mb-1">{type}</h4>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                                Rp {(totalPerType[type] / 1000000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} Jt
                            </p>
                        </div>
                    ))}
                    <button onClick={() => handleAddType('pphTypes')} className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-2xl text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors">
                        <Plus size={20} />
                        <span className="text-xs font-medium mt-1">Tambah Tipe Pajak</span>
                    </button>
                </div>

                {/* 2. Main Chart */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 2. Main Chart */}
                    <Card className="lg:col-span-2">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                                    <Percent size={20} className="text-indigo-500" /> Tren PPh (Year to Date)
                                </h3>
                                <p className="text-sm text-gray-500">Akumulasi pembayaran pajak penghasilan per bulan.</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setTaxForm({
                                            month: 'Januari',
                                            year: new Date().getFullYear(),
                                            data: {
                                                pph: config.pphTypes.reduce((acc, t) => ({ ...acc, [t]: 0 }), {}),
                                                ppnIn: {},
                                                ppnOut: {}
                                            }
                                        });
                                        setModalTab('tax-form-pph');
                                        setIsModalOpen(true);
                                    }}
                                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
                                >
                                    <Plus size={14} /> Input PPh
                                </button>
                                <button className="p-2 hover:bg-gray-100 rounded-lg dark:hover:bg-slate-700"><Download size={16} className="text-gray-500" /></button>
                            </div>
                        </div>
                        <div className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorPh" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} tickFormatter={(val) => `${val / 1000000}M`} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                        formatter={(value) => `Rp ${value.toLocaleString()}`}
                                    />
                                    <Legend iconType="circle" />
                                    {config.pphTypes.map((type, idx) => (
                                        <Area
                                            key={type}
                                            type="monotone"
                                            dataKey={type}
                                            stackId="1"
                                            stroke={['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'][idx % 5]}
                                            fill={['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'][idx % 5]}
                                            fillOpacity={0.6}
                                        />
                                    ))}
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    {/* 2b. Distribution Pie Chart */}
                    <Card>
                        <h3 className="font-bold text-lg dark:text-white mb-6">Distribusi PPh (YTD)</h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={config.pphTypes.map(t => ({ name: t, value: totalPerType[t] })).filter(d => d.value > 0)}
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {config.pphTypes.map((t, index) => (
                                            <Cell key={`cell-${index}`} fill={['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'][index % 5]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => `Rp ${value.toLocaleString()}`} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>

                {/* 3. Detailed Table */}
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-900 dark:text-white">Rincian Data PPh</h3>
                        <div className="flex gap-2">
                            <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white transition-colors">
                                <Calendar size={14} /> Filter Periode
                            </button>
                            <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white transition-colors">
                                <Download size={14} /> Export CSV
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-right border-b border-gray-200 dark:border-slate-700">Periode</th>
                                    {config.pphTypes.map(t => (
                                        <th key={t} className="px-6 py-4 font-semibold text-right border-b border-gray-200 dark:border-slate-700 group/th relative">
                                            <div className="flex items-center justify-end gap-1">
                                                {t}
                                                <div className="flex opacity-0 group-hover/th:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleRenameTaxType('pphTypes', t); }}
                                                        className="p-1 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                        title="Ubah Nama"
                                                    >
                                                        <Edit3 size={12} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteType('pphTypes', t); }}
                                                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                        title="Hapus Kolom"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        </th>
                                    ))}
                                    <th className="px-6 py-4 font-semibold text-right border-b border-gray-200 dark:border-slate-700">Total</th>
                                    <th className="px-6 py-4 font-semibold text-center border-b border-gray-200 dark:border-slate-700">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                {sortedSummaries.map((s, idx) => {
                                    let rowTotal = 0;
                                    return (
                                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group" onClick={() => handleEditRow(s)}>
                                            <td className="px-6 py-4 font-medium dark:text-white">{s.month} {s.year}</td>
                                            {config.pphTypes.map(t => {
                                                const val = getSafeValue(s, t, 'pph');
                                                rowTotal += val;
                                                return <td key={t} className="px-6 py-4 text-right">Rp {val.toLocaleString()}</td>
                                            })}
                                            <td className="px-6 py-4 text-right font-bold text-indigo-600 dark:text-indigo-400">Rp {rowTotal.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={(e) => { e.stopPropagation(); handleEditRow(s, 'pph') }} className="p-1 text-blue-500 hover:bg-blue-50 rounded" title="Edit Data"><Settings size={16} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteRecord(s.id) }} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Hapus Data"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        );
    };

    // --- TAB: PPN RENDERER ---
    const renderPPNTab = () => {
        // Prepare Data
        const chartData = sortedSummaries.map(s => {
            const inTotal = config.ppnInTypes.reduce((sum, t) => sum + getSafeValue(s, t, 'ppnIn'), 0);
            const outTotal = config.ppnOutTypes.reduce((sum, t) => sum + getSafeValue(s, t, 'ppnOut'), 0);
            return {
                name: `${s.month} ${s.year}`,
                inTotal,
                outTotal,
                net: outTotal - inTotal // Out - In = Kurang Bayar (Positive) / Lebih Bayar (Negative)
            };
        });

        const totalInPerType = config.ppnInTypes.reduce((acc, type) => {
            acc[type] = sortedSummaries.reduce((sum, s) => sum + getSafeValue(s, type, 'ppnIn'), 0);
            return acc;
        }, {});

        const totalOutPerType = config.ppnOutTypes.reduce((acc, type) => {
            acc[type] = sortedSummaries.reduce((sum, s) => sum + getSafeValue(s, type, 'ppnOut'), 0);
            return acc;
        }, {});

        // Current Month Status (Latest)
        const latest = chartData[chartData.length - 1] || { inTotal: 0, outTotal: 0, net: 0 };
        const statusKB = latest.net > 0; // Kurang Bayar
        const statusLB = latest.net < 0; // Lebih Bayar

        return (
            <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
                {/* 1. Insight Card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-900/10 border-emerald-200 dark:border-emerald-800">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg text-emerald-600">
                                <ArrowDownRight size={20} />
                            </div>
                            <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-400">Total Masukan (Input)</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">Rp {latest.inTotal.toLocaleString()}</p>
                        <p className="text-xs text-gray-500 mt-1">Bulan Terakhir</p>
                    </Card>

                    <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-900/10 border-amber-200 dark:border-amber-800">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg text-amber-600">
                                <ArrowUpRight size={20} />
                            </div>
                            <span className="text-sm font-semibold text-amber-800 dark:text-amber-400">Total Keluaran (Output)</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">Rp {latest.outTotal.toLocaleString()}</p>
                        <p className="text-xs text-gray-500 mt-1">Bulan Terakhir</p>
                    </Card>

                    <Card className="relative overflow-hidden">
                        <div className={`absolute top-0 right-0 p-3 rounded-bl-xl text-xs font-bold ${statusKB ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {statusKB ? 'KURANG BAYAR' : 'LEBIH BAYAR'}
                        </div>
                        <div className="mt-2">
                            <h4 className="text-sm text-gray-500 font-medium">Status PPN (Net)</h4>
                            <p className={`text-3xl font-bold mt-1 ${statusKB ? 'text-red-600' : 'text-green-600'}`}>
                                Rp {Math.abs(latest.net).toLocaleString()}
                            </p>
                            <div className="mt-3 text-xs text-gray-400">
                                {statusKB
                                    ? "PPN Keluaran > Masukan. Segera setorkan selisihnya."
                                    : "PPN Masukan > Keluaran. Dapat dikompensasikan."}
                            </div>
                        </div>
                    </Card>
                </div>

                {/* 2. Composed Chart */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 2. Composed Chart */}
                    <Card className="lg:col-span-2">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                                <FileBarChart size={20} className="text-orange-500" /> Analisis PPN (In vs Out)
                            </h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setTaxForm({
                                            month: 'Januari',
                                            year: new Date().getFullYear(),
                                            data: {
                                                pph: {},
                                                ppnIn: config.ppnInTypes.reduce((acc, t) => ({ ...acc, [t]: 0 }), {}),
                                                ppnOut: config.ppnOutTypes.reduce((acc, t) => ({ ...acc, [t]: 0 }), {})
                                            }
                                        });
                                        setModalTab('tax-form-ppn');
                                        setIsModalOpen(true);
                                    }}
                                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
                                >
                                    <Plus size={14} /> Input PPN
                                </button>
                            </div>
                        </div>
                        <div className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} tickFormatter={(val) => `${val / 1000000}M`} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                        formatter={(value) => `Rp ${value.toLocaleString()}`}
                                    />
                                    <Legend />
                                    <Bar dataKey="inTotal" name="Masukan" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                                    <Bar dataKey="outTotal" name="Keluaran" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={20} />
                                    <Line type="monotone" dataKey="net" name="Net Balance" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    {/* 2b. Composition Charts */}
                    <div className="flex flex-col gap-6">
                        <Card className="flex-1">
                            <h4 className="text-sm font-bold text-gray-500 mb-2">Komposisi PPN Masukan (In)</h4>
                            <div className="h-[150px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={config.ppnInTypes.map(t => ({ name: t, value: totalInPerType[t] })).filter(d => d.value > 0)}
                                            innerRadius={30}
                                            outerRadius={50}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {config.ppnInTypes.map((t, index) => (
                                                <Cell key={`cell-${index}`} fill={['#10b981', '#34d399', '#6ee7b7', '#a7f3d0'][index % 4]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => `Rp ${value.toLocaleString()}`} />
                                        <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} layout="vertical" align="right" verticalAlign="middle" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                        <Card className="flex-1">
                            <h4 className="text-sm font-bold text-gray-500 mb-2">Komposisi PPN Keluaran (Out)</h4>
                            <div className="h-[150px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={config.ppnOutTypes.map(t => ({ name: t, value: totalOutPerType[t] })).filter(d => d.value > 0)}
                                            innerRadius={30}
                                            outerRadius={50}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {config.ppnOutTypes.map((t, index) => (
                                                <Cell key={`cell-${index}`} fill={['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a'][index % 4]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => `Rp ${value.toLocaleString()}`} />
                                        <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} layout="vertical" align="right" verticalAlign="middle" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </div>
                </div>

                {/* 3. Detailed Data Grid */}
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-900 dark:text-white">Rincian Komponen PPN</h3>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300">
                                <tr className="border-b border-gray-200 dark:border-slate-700">
                                    <th className="px-6 py-4 font-semibold" rowSpan="2">Periode</th>
                                    <th className="px-6 py-2 font-semibold text-center bg-emerald-50/50 dark:bg-emerald-900/20 cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/30" colSpan={config.ppnInTypes.length} onClick={() => handleAddType('ppnInTypes')}>
                                        PPN Masukan (In) <Plus size={12} className="inline ml-1 opacity-50" />
                                    </th>
                                    <th className="px-6 py-2 font-semibold text-center bg-amber-50/50 dark:bg-amber-900/20 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/30" colSpan={config.ppnOutTypes.length} onClick={() => handleAddType('ppnOutTypes')}>
                                        PPN Keluaran (Out) <Plus size={12} className="inline ml-1 opacity-50" />
                                    </th>
                                    <th className="px-4 py-4 font-semibold" rowSpan="2">Aksi</th>
                                </tr>
                                <tr>
                                    {config.ppnInTypes.map(t => (
                                        <th key={t} className="px-4 py-2 text-xs font-medium text-right text-emerald-700 border-b border-gray-100 dark:border-slate-800 group/th">
                                            <div className="flex items-center justify-end gap-1">
                                                {t}
                                                <div className="flex opacity-0 group-hover/th:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleRenameTaxType('ppnInTypes', t); }}
                                                        className="p-0.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                    >
                                                        <Edit3 size={10} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteType('ppnInTypes', t); }}
                                                        className="p-0.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                    >
                                                        <Trash2 size={10} />
                                                    </button>
                                                </div>
                                            </div>
                                        </th>
                                    ))}
                                    {config.ppnOutTypes.map(t => (
                                        <th key={t} className="px-4 py-2 text-xs font-medium text-right text-amber-700 border-b border-gray-100 dark:border-slate-800 group/th">
                                            <div className="flex items-center justify-end gap-1">
                                                {t}
                                                <div className="flex opacity-0 group-hover/th:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleRenameTaxType('ppnOutTypes', t); }}
                                                        className="p-0.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                    >
                                                        <Edit3 size={10} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteType('ppnOutTypes', t); }}
                                                        className="p-0.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                    >
                                                        <Trash2 size={10} />
                                                    </button>
                                                </div>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                {sortedSummaries.map((s, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer group" onClick={() => handleEditRow(s, 'ppn')}>
                                        <td className="px-6 py-4 font-medium dark:text-white">{s.month} {s.year}</td>
                                        {config.ppnInTypes.map(t => <td key={t} className="px-4 py-4 text-right">Rp {getSafeValue(s, t, 'ppnIn').toLocaleString()}</td>)}
                                        {config.ppnOutTypes.map(t => <td key={t} className="px-4 py-4 text-right">Rp {getSafeValue(s, t, 'ppnOut').toLocaleString()}</td>)}
                                        <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={(e) => { e.stopPropagation(); handleEditRow(s, 'ppn') }} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><Settings size={16} /></button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteRecord(s.id) }} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Hapus Data"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        );
    };

    // --- TAB: COMPARISON ---
    // Moved to separate component below to avoid Hook Rule violations
    const ComparisonTab = ({ sortedSummaries, config }) => {
        const [periodA, setPeriodA] = useState(sortedSummaries.length > 1 ? sortedSummaries[sortedSummaries.length - 2].id : '');
        const [periodB, setPeriodB] = useState(sortedSummaries.length > 0 ? sortedSummaries[sortedSummaries.length - 1].id : '');

        const dataA = sortedSummaries.find(s => s.id === periodA) || {};
        const dataB = sortedSummaries.find(s => s.id === periodB) || {};

        if (sortedSummaries.length === 0) return <div className="p-8 text-center text-gray-500">Belum ada data untuk dibandingkan.</div>;

        // Helper to calc delta
        const renderDelta = (valA, valB) => {
            const diff = valB - valA;
            const percent = valA === 0 ? 0 : (diff / valA) * 100;
            const isPos = diff > 0;
            const isZero = diff === 0;

            return (
                <div className={`flex items-center gap-1 text-xs font-bold ${isZero ? 'text-gray-400' : isPos ? 'text-green-600' : 'text-red-600'}`}>
                    {isZero ? '-' : isPos ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {isZero ? '0%' : `${Math.abs(percent).toFixed(1)}%`}
                    <span className="text-[10px] font-normal text-gray-500 ml-1">({diff > 0 ? '+' : ''}Rp {(diff / 1000).toFixed(0)}k)</span>
                </div>
            )
        };

        return (
            <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
                <Card className="bg-slate-50 dark:bg-slate-900 border-none">
                    <div className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="text-xs font-bold text-gray-500 mb-1 block">Periode Dasar (A)</label>
                            <select className="w-full p-2 rounded-lg border text-sm" value={periodA} onChange={e => setPeriodA(e.target.value)}>
                                {sortedSummaries.map(s => <option key={s.id} value={s.id}>{s.month} {s.year}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center pb-2 text-gray-400"><ArrowRight size={20} /></div>
                        <div className="flex-1">
                            <label className="text-xs font-bold text-gray-500 mb-1 block">Periode Banding (B)</label>
                            <select className="w-full p-2 rounded-lg border text-sm" value={periodB} onChange={e => setPeriodB(e.target.value)}>
                                {sortedSummaries.map(s => <option key={s.id} value={s.id}>{s.month} {s.year}</option>)}
                            </select>
                        </div>
                    </div>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* PPh Comparison */}
                    <Card>
                        <h3 className="font-bold text-gray-900 dark:text-white mb-4">Perbandingan PPh</h3>
                        <div className="space-y-3">
                            {config.pphTypes.map(t => {
                                const valA = getSafeValue(dataA, t, 'pph');
                                const valB = getSafeValue(dataB, t, 'pph');
                                return (
                                    <div key={t} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                                        <div className="text-sm font-medium">{t}</div>
                                        <div className="text-right">
                                            <div className="text-sm font-bold dark:text-white">Rp {valB.toLocaleString()}</div>
                                            {renderDelta(valA, valB)}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </Card>

                    {/* PPN Comparison */}
                    <Card>
                        <h3 className="font-bold text-gray-900 dark:text-white mb-4">Perbandingan PPN</h3>
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-xs uppercase text-gray-500 font-bold mb-2">PPN Masukan</h4>
                                {config.ppnInTypes.map(t => {
                                    const valA = getSafeValue(dataA, t, 'ppnIn');
                                    const valB = getSafeValue(dataB, t, 'ppnIn');
                                    return (
                                        <div key={t} className="flex justify-between items-center mb-1 text-sm border-b border-dashed border-gray-100 pb-1 last:border-0">
                                            <span className="text-gray-600 dark:text-slate-400">{t}</span>
                                            <div className="text-right flex items-center gap-3">
                                                <span>Rp {valB.toLocaleString()}</span>
                                                {renderDelta(valA, valB)}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                            <div>
                                <h4 className="text-xs uppercase text-gray-500 font-bold mb-2">PPN Keluaran</h4>
                                {config.ppnOutTypes.map(t => {
                                    const valA = getSafeValue(dataA, t, 'ppnOut');
                                    const valB = getSafeValue(dataB, t, 'ppnOut');
                                    return (
                                        <div key={t} className="flex justify-between items-center mb-1 text-sm border-b border-dashed border-gray-100 pb-1 last:border-0">
                                            <span className="text-gray-600 dark:text-slate-400">{t}</span>
                                            <div className="text-right flex items-center gap-3">
                                                <span>Rp {valB.toLocaleString()}</span>
                                                {renderDelta(valA, valB)}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header & Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
                    <button
                        onClick={() => setActiveTab('pph')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'pph' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        PPh (Pajak Penghasilan)
                    </button>
                    <button
                        onClick={() => setActiveTab('ppn')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'ppn' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        PPN (Pajak Pertambahan Nilai)
                    </button>
                    <button
                        onClick={() => setActiveTab('comparison')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'comparison' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <SlidersHorizontal size={14} className="inline mr-1" /> Perbandingan
                    </button>
                </div>

            </div>

            {/* Global Update Button Removed - replaced by specific buttons in tabs */}
            {/* Global Update Button Removed - replaced by specific buttons in tabs */}

            {/* Content Renderers */}
            {activeTab === 'pph' && renderPPhTab()}
            {activeTab === 'ppn' && renderPPNTab()}
            {activeTab === 'comparison' && <ComparisonTab sortedSummaries={sortedSummaries} config={config} />}
        </div >
    );
}
