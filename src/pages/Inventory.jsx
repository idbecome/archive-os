import React from 'react';
import { Grid3X3, Package, Clock, AlertCircle, Download, FileSpreadsheet, Plus, Search, FileText, Truck, Sparkles, TrendingUp, ShieldAlert } from 'lucide-react';
import { SummaryCard } from '../components/ui/Card';

export default function Inventory({
    inventory, stats, TOTAL_SLOTS, getStatusStyle,
    handleSlotClick, handleExcelImport, downloadTemplate, excelInputRef,
    handleExportInventory, inventorySearchQuery, setInventorySearchQuery,
    hasPermission, activeInvTab, setActiveInvTab, externalItems,
    onRestoreExternal, onViewExternal, inventoryIssues = []
}) {

    // Unified match helper for both Internal Slot and External Item
    const isMatch = (item) => {
        if (!inventorySearchQuery) return true;
        const q = inventorySearchQuery.toLowerCase();

        // 1. Check ID-like fields (Slot ID or Box ID)
        if (item.id && String(item.id).toLowerCase().includes(q)) return true;
        if (item.boxId && String(item.boxId).toLowerCase().includes(q)) return true;

        // 2. Check boxData (could be item.boxData directly or slot.boxData)
        const data = item.boxData || item;

        // Safety check for data object
        if (!data) return false;

        if (data.id && String(data.id).toLowerCase().includes(q)) return true;
        if (data.destination && String(data.destination).toLowerCase().includes(q)) return true;
        if (data.sender && String(data.sender).toLowerCase().includes(q)) return true;

        // 3. Check Ordners & Invoices
        if (data.ordners && Array.isArray(data.ordners)) {
            return data.ordners.some(ord => {
                const noOrdner = String(ord.noOrdner || '').toLowerCase();
                const period = String(ord.period || '').toLowerCase();
                if (noOrdner.includes(q) || period.includes(q)) return true;

                return ord.invoices?.some(inv =>
                    String(inv.invoiceNo || '').toLowerCase().includes(q) ||
                    String(inv.vendor || '').toLowerCase().includes(q) ||
                    String(inv.ocrContent || '').toLowerCase().includes(q)
                );
            });
        }
        return false;
    };

    // Calculate match counts for tabs
    const internalMatchCount = inventory.filter(s => s.status !== 'EMPTY' && isMatch(s)).length;
    const externalMatchCount = externalItems.filter(isMatch).length;

    const getSmartInsight = () => {
        // 1. Konteks Pencarian (Prioritas Utama jika user sedang mencari)
        if (inventorySearchQuery) {
            const totalMatches = internalMatchCount + externalMatchCount;
            return {
                text: `Analisis Pencarian: Ditemukan ${totalMatches} item yang relevan. Klik pada box untuk melihat detail invoice atau lampiran OCR yang cocok.`,
                icon: <Search className="text-indigo-500" size={20} />,
                color: "border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/50 dark:bg-indigo-900/10 text-indigo-800 dark:text-indigo-200"
            };
        }

        // 2. Analisis Kapasitas Kritis
        if (stats.occupancy > 90) {
            return {
                text: `Kapasitas Kritis (${stats.occupancy.toFixed(0)}%)! Gudang hampir penuh. Segera jadwalkan pemindahan box dengan periode tahun lama ke Indoarsip.`,
                icon: <AlertCircle className="text-red-500" size={20} />,
                color: "border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-900/10 text-red-800 dark:text-red-200"
            };
        }

        // 3. Analisis Retensi (Mencari data lama > 5 tahun)
        const currentYear = new Date().getFullYear();
        const oldBoxes = inventory.filter(s => {
            if (!s.boxData?.ordners) return false;
            return s.boxData.ordners.some(o => {
                const periodYear = parseInt(o.period);
                return !isNaN(periodYear) && (currentYear - periodYear) >= 5;
            });
        });

        if (oldBoxes.length > 0) {
            return {
                text: `Saran Retensi: Terdapat ${oldBoxes.length} box dengan dokumen berusia di atas 5 tahun. Pertimbangkan untuk melakukan pemusnahan atau pengarsipan eksternal.`,
                icon: <AlertCircle className="text-amber-500" size={20} />,
                color: "border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-900/10 text-amber-800 dark:text-amber-200"
            };
        }

        // 4. Analisis Aktivitas Terkini
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentUpdates = inventory.filter(s => s.lastUpdated && new Date(s.lastUpdated) > oneDayAgo).length;
        if (recentUpdates > 3) {
            return {
                text: `Aktivitas Tinggi: Terdeteksi ${recentUpdates} perubahan data dalam 24 jam terakhir. Pastikan label fisik pada box sudah sesuai dengan sistem.`,
                icon: <TrendingUp className="text-blue-500" size={20} />,
                color: "border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-900/10 text-blue-800 dark:text-blue-200"
            };
        }

        // 5. Analisis Kepadatan Data
        const totalInvoices = inventory.reduce((acc, s) => {
            if (!s.boxData?.ordners) return acc;
            return acc + s.boxData.ordners.reduce((sum, o) => sum + (o.invoices?.length || 0), 0);
        }, 0);
        
        if (totalInvoices > 0 && stats.stored > 0 && (totalInvoices / stats.stored) > 15) {
            return {
                text: `Optimasi Data: Rata-rata invoice per box cukup tinggi. Gunakan fitur 'Laporan' untuk memverifikasi kelengkapan nomor invoice secara berkala.`,
                icon: <FileText className="text-emerald-500" size={20} />,
                color: "border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-800 dark:text-emerald-200"
            };
        }

        // 6. Default Tips (Rotasi berdasarkan jam agar tidak membosankan)
        const tips = [
            "Sistem Optimal: Gunakan fitur 'Import Excel' untuk mempercepat input data box dalam jumlah besar.",
            "Tips : Box yang dipindahkan ke Indoarsip tetap dapat dicari melalui kolom pencarian global.",
            "Info: Anda dapat melampirkan file PDF pada setiap invoice untuk ekstraksi teks otomatis (OCR).",
            "Saran: Lakukan audit fisik rak setiap 6 bulan sekali untuk memastikan sinkronisasi data."
        ];
        return {
            text: tips[new Date().getHours() % tips.length],
            icon: <Sparkles className="text-emerald-500" size={20} />,
            color: "border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-800 dark:text-emerald-200"
        };
    };

    const insight = getSmartInsight();

    return (
        <div className="animate-in fade-in zoom-in-95 duration-300">
            {/* SUMMARY CARDS FOR INVENTORY */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <SummaryCard
                    title="Total Slot"
                    value={TOTAL_SLOTS}
                    icon={Grid3X3}
                    colorClass="bg-slate-500/10 text-slate-600 dark:text-slate-300 backdrop-blur-md ring-1 ring-slate-500/20"
                />
                <SummaryCard
                    title="Slot Kosong"
                    value={stats.empty}
                    icon={Package}
                    colorClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 backdrop-blur-md ring-1 ring-emerald-500/30"
                />
                <SummaryCard
                    title="Dipinjam"
                    value={stats.borrowed}
                    icon={Clock}
                    colorClass="bg-amber-500/10 text-amber-600 dark:text-amber-400 backdrop-blur-md ring-1 ring-amber-500/30"
                />
                <SummaryCard
                    title="Audit"
                    value={stats.audit}
                    icon={AlertCircle}
                    colorClass="bg-purple-500/10 text-purple-600 dark:text-purple-400 backdrop-blur-md ring-1 ring-purple-500/30"
                />
            </div>

            {/* INCONSISTENCY WARNING (STUCK BOXES) */}
            {inventoryIssues.length > 0 && (
                <div className="mb-6 p-5 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-[2rem] animate-in slide-in-from-top-4 duration-500">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-2xl text-red-600 dark:text-red-400 shadow-sm">
                            <ShieldAlert size={24} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-black text-red-800 dark:text-red-200 uppercase tracking-widest mb-2">Terdeteksi Masalah Data (Box Nyangkut)</h3>
                            <div className="space-y-2">
                                {inventoryIssues.map((issue, idx) => (
                                    <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white/50 dark:bg-black/20 p-3 rounded-xl border border-red-100 dark:border-red-900/30">
                                        <div className="flex-1">
                                            <p className="text-xs font-bold text-red-700 dark:text-red-300">{issue.message}</p>
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                            {issue.type === 'CORRUPT' && (
                                                <button 
                                                    onClick={() => handleSlotClick(inventory.find(s => Number(s.id) === Number(issue.slotId)))}
                                                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black rounded-lg transition-all shadow-sm active:scale-95"
                                                >
                                                    PERBAIKI SLOT #{issue.slotId}
                                                </button>
                                            )}
                                            {issue.type === 'DUPLICATE' && issue.slots.map(sid => (
                                                <button 
                                                    key={sid}
                                                    onClick={() => handleSlotClick(inventory.find(s => Number(s.id) === Number(sid)))}
                                                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black rounded-lg transition-all shadow-sm active:scale-95"
                                                >
                                                    CEK SLOT #{sid}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <p className="mt-4 text-[10px] text-red-600/70 dark:text-red-400/70 font-medium italic">
                                * Masalah ini biasanya terjadi jika proses pindah rak terputus sebelum perbaikan kode dilakukan.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* AI SMART INSIGHT BANNER */}
            <div className={`mb-6 p-4 rounded-2xl border backdrop-blur-md flex items-center gap-4 animate-in slide-in-from-top-4 duration-700 ${insight.color}`}>
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl shadow-sm shrink-0">
                    {insight.icon}
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Smart Assistant</span>
                        <div className="w-1 h-1 rounded-full bg-current opacity-40"></div>
                        <span className="text-[10px] font-bold opacity-60">Real-time Analysis</span>
                    </div>
                    <p className="text-sm font-bold leading-relaxed">{insight.text}</p>
                </div>
            </div>

            {/* CONTROL BAR */}
            <div className="flex flex-col gap-6 mb-8 bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl p-6 rounded-[2rem] border border-white/50 dark:border-white/10 shadow-2xl shadow-indigo-500/10 group hover:shadow-indigo-500/20 transition-all duration-500">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 w-full md:w-auto">
                        <div className="flex items-center gap-2 bg-slate-200/50 dark:bg-slate-800/50 p-1.5 rounded-2xl backdrop-blur-sm border border-white/20">
                            <button
                                onClick={() => setActiveInvTab('internal')}
                                className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all duration-300 ${activeInvTab === 'internal' ? 'bg-white dark:bg-slate-700 shadow-lg text-indigo-600 dark:text-white scale-105 ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700 dark:hover:text-slate-300 hover:bg-white/50'}`}
                            >
                                <Grid3X3 size={18} /> Gudang
                                {inventorySearchQuery && internalMatchCount > 0 && (
                                    <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-bounce">{internalMatchCount}</span>
                                )}
                            </button>
                            <button
                                onClick={() => setActiveInvTab('external')}
                                className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all duration-300 ${activeInvTab === 'external' ? 'bg-white dark:bg-slate-700 shadow-lg text-indigo-600 dark:text-white scale-105 ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700 dark:hover:text-slate-300 hover:bg-white/50'}`}
                            >
                                <Truck size={18} /> Indoarsip
                                {inventorySearchQuery && externalMatchCount > 0 && (
                                    <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-bounce">{externalMatchCount}</span>
                                )}
                            </button>
                        </div>

                        {/* SEARCH BAR */}
                        <div className="relative w-full md:w-96 group/search">
                            <div className="absolute inset-0 bg-indigo-500/20 blur-xl opacity-0 group-hover/search:opacity-100 transition-opacity duration-500 rounded-full"></div>
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500/70" size={20} />
                            <input
                                type="text"
                                value={inventorySearchQuery}
                                onChange={(e) => setInventorySearchQuery(e.target.value)}
                                placeholder="Cari Box, Vendor, Ordner, Invoice..."
                                className="w-full pl-12 pr-4 py-3 border border-white/40 dark:border-white/10 rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-md focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/50 dark:text-white transition-all text-sm font-medium shadow-inner placeholder:text-slate-400"
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap justify-end gap-3 w-full md:w-auto">
                        {hasPermission('inventory', 'create') && (
                            <>
                                <input
                                    type="file"
                                    ref={excelInputRef}
                                    onChange={handleExcelImport}
                                    accept=".xlsx, .xls, .csv"
                                    className="hidden"
                                />
                                <button
                                    onClick={downloadTemplate}
                                    className="px-4 py-2 bg-white/50 hover:bg-white/80 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all border border-white/40 shadow-sm hover:shadow-md backdrop-blur-sm"
                                    title="Download Template Excel"
                                >
                                    <Download size={18} /> Template
                                </button>
                                <button
                                    onClick={() => excelInputRef.current.click()}
                                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:-translate-y-0.5"
                                    title="Import Data dari Excel"
                                >
                                    <FileSpreadsheet size={18} /> Import Excel
                                </button>
                            </>
                        )}
                        <button
                            onClick={handleExportInventory}
                            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5"
                            title="Export Laporan Detail"
                        >
                            <FileText size={18} /> Laporan
                        </button>
                    </div>
                </div>

                {/* GRID */}
                {activeInvTab === 'internal' && (
                    <div className="grid grid-cols-5 md:grid-cols-10 gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {Array.from({ length: TOTAL_SLOTS }).map((_, idx) => {
                            const slotId = idx + 1;
                            const slot = inventory.find(s => Number(s.id) === slotId) || { id: slotId, status: 'EMPTY' };
                            const status = (slot.status || 'EMPTY').toUpperCase();
                            const statusStyle = getStatusStyle(status);
                            const matched = isMatch(slot);

                            return (
                                <button
                                    key={slotId}
                                    onClick={() => handleSlotClick(slot)}
                                    disabled={!matched && inventorySearchQuery}
                                    style={{ animationDelay: `${idx * 10}ms` }}
                                    className={`aspect-square rounded-2xl flex flex-col items-center justify-center relative group transition-all duration-500 animate-in zoom-in-90 fade-in fill-mode-both 
                                    ${status === 'EMPTY'
                                            ? 'bg-white/30 dark:bg-slate-800/20 backdrop-blur-sm border-2 border-dashed border-slate-300/60 dark:border-slate-600/60 hover:border-indigo-400 hover:bg-white/60 dark:hover:bg-slate-800/40 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] hover:scale-110 z-0 hover:z-10'
                                            : `border ${statusStyle.color} shadow-lg hover:shadow-2xl hover:scale-110 hover:-rotate-1 z-0 hover:z-10 ring-1 ring-white/10 opacity-100`
                                        }
                                    ${!matched && inventorySearchQuery ? 'opacity-20 grayscale cursor-not-allowed scale-90' : 'opacity-100'}
                                `}
                                >
                                    <span className="text-[10px] font-mono font-bold mb-1 text-slate-400/70 absolute top-1.5 right-2 z-10 mix-blend-multiply dark:mix-blend-screen">#{String(slotId).padStart(3, '0')}</span>

                                    {status !== 'EMPTY' ? (
                                        <div className="flex flex-col items-center gap-1.5 w-full px-1 relative z-10 -mt-1 transition-transform duration-500 group-hover:scale-105">
                                            <div className="p-1.5 rounded-full bg-white/40 dark:bg-black/20 backdrop-blur-md shadow-sm group-hover:shadow-indigo-500/50 transition-all">
                                                <Package size={18} className="text-current opacity-80 group-hover:scale-125 transition-transform duration-500" />
                                            </div>
                                            {slot.boxData?.id && (
                                                <p className="text-[9px] md:text-[10px] font-black truncate w-full text-center bg-white/60 dark:bg-black/40 backdrop-blur-md rounded-md px-1.5 py-0.5 shadow-sm text-current group-hover:bg-white dark:group-hover:bg-black transition-colors">
                                                    {slot.boxData.id}
                                                </p>
                                            )}
                                            {/* Matches & Snippets */}
                                            {isMatch(slot) && inventorySearchQuery && (
                                                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-yellow-300 text-yellow-900 text-[9px] px-1.5 rounded-full font-bold shadow-lg animate-bounce pointer-events-none whitespace-nowrap z-20">MATCH</div>
                                            )}
                                        </div>
                                    ) : (
                                        <Plus size={24} className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-400 transition-colors duration-300" />
                                    )}
                                </button>
                            )
                        })}
                    </div>
                )}

                {/* EXTERNAL / INDOARSIP TAB CONTENT */}
                {activeInvTab === 'external' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead className="bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 backdrop-blur-xl border-b border-white/30 dark:border-white/5">
                                    <tr>
                                        <th className="px-6 py-5 font-bold uppercase tracking-wider text-xs">Box ID</th>
                                        <th className="px-6 py-5 font-bold uppercase tracking-wider text-xs">Tujuan</th>
                                        <th className="px-6 py-5 font-bold uppercase tracking-wider text-xs">Tanggal Kirim</th>
                                        <th className="px-6 py-5 font-bold uppercase tracking-wider text-xs">Pengirim</th>
                                        <th className="px-6 py-5 font-bold uppercase tracking-wider text-xs">Isi</th>
                                        <th className="px-6 py-5 font-bold uppercase tracking-wider text-xs">Status</th>
                                        <th className="px-6 py-5 font-bold uppercase tracking-wider text-xs text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {externalItems.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-slate-400">
                                                Belum ada data barang keluar.
                                            </td>
                                        </tr>
                                    ) : (
                                        externalItems.filter(isMatch).map(item => (
                                            <tr key={item.id} className="hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors group border-b border-indigo-50 dark:border-slate-800/50">
                                                <td className="px-6 py-4 font-bold text-slate-800 dark:text-white flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                                        <Package size={20} />
                                                    </div>
                                                    {item.boxId}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-3 py-1 bg-indigo-100/50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold border border-indigo-200 dark:border-indigo-500/30 backdrop-blur-sm shadow-sm">{item.destination}</span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                                                    <div className="flex items-center gap-2">
                                                        <Clock size={14} className="text-indigo-400" />
                                                        {new Date(item.sentDate).toLocaleDateString()}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-[10px] font-bold shadow-inner">
                                                            {item.sender?.charAt(0) || '?'}
                                                        </div>
                                                        <span className="font-medium text-xs">{item.sender}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                                                        {(item.boxData?.ordners?.length || 0)} Ord • {(item.boxData?.ordners?.reduce((acc, o) => acc + (o.invoices?.length || 0), 0) || 0)} Inv
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                                                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981] animate-pulse"></div>
                                                        Archived
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex gap-2 justify-end transition-opacity">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onViewExternal(item); }}
                                                            className="group/btn relative p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-300"
                                                            title="Lihat Detail"
                                                        >
                                                            <div className="absolute inset-0 bg-indigo-500/5 rounded-xl opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                                                            <FileText size={18} className="text-slate-400 group-hover/btn:text-indigo-600 transition-colors duration-300 relative z-10" />
                                                        </button>
                                                        {hasPermission('inventory', 'edit') && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); onRestoreExternal(item); }}
                                                                className="group/btn relative p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300"
                                                                title="Restore ke Gudang"
                                                            >
                                                                <div className="absolute inset-0 bg-emerald-500/5 rounded-xl opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                                                                <Truck size={18} className="text-slate-400 group-hover/btn:text-emerald-600 transition-colors duration-300 relative z-10 transform rotate-180" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {activeInvTab === 'internal' && inventory.filter(isMatch).length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    <p>Tidak ditemukan data yang cocok dengan pencarian "{inventorySearchQuery}".</p>
                </div>
            )}
        </div >
    );
}
