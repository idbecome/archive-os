import React from 'react';
import { Grid3X3, Package, Clock, AlertCircle, Download, FileSpreadsheet, Plus, Search, FileText, Truck } from 'lucide-react';
import { SummaryCard } from '../components/ui/Card';

export default function Inventory({
    inventory, stats, TOTAL_SLOTS, getStatusStyle,
    handleSlotClick, handleExcelImport, downloadTemplate, excelInputRef,
    handleExportInventory, inventorySearchQuery, setInventorySearchQuery,
    hasPermission, activeInvTab, setActiveInvTab, externalItems,
    onRestoreExternal, onViewExternal
}) {

    // Helper to check if a slot matches the search query
    const isMatch = (slot) => {
        if (!inventorySearchQuery) return true;
        const q = inventorySearchQuery.toLowerCase();

        // Check Slot ID
        if (slot.id && slot.id.toString().includes(q)) return true;

        // Check Box ID
        if (slot.boxData?.id?.toLowerCase().includes(q)) return true;

        // Check Ordners & Invoices
        if (slot.boxData?.ordners) {
            return slot.boxData.ordners.some(ord => {
                const noOrdner = (ord.noOrdner || '').toLowerCase();
                if (noOrdner.includes(q)) return true;
                return ord.invoices?.some(inv =>
                    (inv.invoiceNo || '').toLowerCase().includes(q) ||
                    (inv.vendor || '').toLowerCase().includes(q) ||
                    (inv.ocrContent || '').toLowerCase().includes(q)
                );
            });
        }
        return false;
    };

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
                            </button>
                            <button
                                onClick={() => setActiveInvTab('external')}
                                className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all duration-300 ${activeInvTab === 'external' ? 'bg-white dark:bg-slate-700 shadow-lg text-indigo-600 dark:text-white scale-105 ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700 dark:hover:text-slate-300 hover:bg-white/50'}`}
                            >
                                <Truck size={18} /> Indoarsip
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
                                    className={`aspect-square rounded-2xl flex flex-col items-center justify-center relative group transition-all duration-300 
                                    ${status === 'EMPTY'
                                            ? 'bg-white/30 dark:bg-slate-800/20 backdrop-blur-sm border-2 border-dashed border-slate-300/60 dark:border-slate-600/60 hover:border-indigo-400 hover:bg-white/60 dark:hover:bg-slate-800/40 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] hover:scale-105 z-0 hover:z-10'
                                            : `border ${statusStyle.color} shadow-lg hover:shadow-xl hover:scale-105 z-0 hover:z-10 ring-1 ring-white/10 opacity-100`
                                        }
                                    ${!matched && inventorySearchQuery ? 'opacity-20 grayscale cursor-not-allowed scale-90' : 'opacity-100'}
                                `}
                                >
                                    <span className="text-[10px] font-mono font-bold mb-1 text-slate-400/70 absolute top-1.5 right-2 z-10 mix-blend-multiply dark:mix-blend-screen">#{String(slotId).padStart(3, '0')}</span>

                                    {status !== 'EMPTY' ? (
                                        <div className="flex flex-col items-center gap-1.5 w-full px-1 relative z-10 -mt-1">
                                            <div className="p-1.5 rounded-full bg-white/40 dark:bg-black/20 backdrop-blur-md shadow-sm">
                                                <Package size={18} className="text-current opacity-80" />
                                            </div>
                                            {slot.boxData?.id && (
                                                <p className="text-[9px] md:text-[10px] font-black truncate w-full text-center bg-white/60 dark:bg-black/40 backdrop-blur-md rounded-md px-1.5 py-0.5 shadow-sm text-current">
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
                                        externalItems.filter(item =>
                                            !inventorySearchQuery ||
                                            item.boxId.toLowerCase().includes(inventorySearchQuery.toLowerCase()) ||
                                            item.destination.toLowerCase().includes(inventorySearchQuery.toLowerCase())
                                        ).map(item => (
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
                                                            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 rounded-xl text-slate-500 hover:text-indigo-600 transition-all shadow-sm hover:shadow-md hover:scale-110"
                                                            title="Lihat Detail"
                                                        >
                                                            <FileText size={16} />
                                                        </button>
                                                        {hasPermission('inventory', 'edit') && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); onRestoreExternal(item); }}
                                                                className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 rounded-xl text-slate-500 hover:text-emerald-600 transition-all shadow-sm hover:shadow-md hover:scale-110"
                                                                title="Restore ke Gudang"
                                                            >
                                                                <Truck size={16} className="transform rotate-180" />
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
