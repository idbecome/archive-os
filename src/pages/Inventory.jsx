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
        if (slot.id.toString().includes(q)) return true;

        // Check Box ID
        if (slot.boxData?.id?.toLowerCase().includes(q)) return true;

        // Check Ordners & Invoices
        if (slot.boxData?.ordners) {
            return slot.boxData.ordners.some(ord => {
                if (ord.noOrdner.toLowerCase().includes(q)) return true;
                return ord.invoices?.some(inv =>
                    inv.invoiceNo.toLowerCase().includes(q) ||
                    inv.vendor.toLowerCase().includes(q)
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
                    colorClass="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                />
                <SummaryCard
                    title="Slot Kosong"
                    value={stats.empty}
                    icon={Package}
                    colorClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
                />
                <SummaryCard
                    title="Dipinjam"
                    value={stats.borrowed}
                    icon={Clock}
                    colorClass="bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
                />
                <SummaryCard
                    title="Audit"
                    value={stats.audit}
                    icon={AlertCircle}
                    colorClass="bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
                />
            </div>

            {/* CONTROL BAR */}
            <div className="flex flex-col gap-4 mb-6 bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-2 bg-gray-100 dark:bg-slate-800 p-1 rounded-lg">
                            <button
                                onClick={() => setActiveInvTab('internal')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeInvTab === 'internal' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-slate-300'}`}
                            >
                                <Grid3X3 size={16} /> Rak Utama
                            </button>
                            <button
                                onClick={() => setActiveInvTab('external')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeInvTab === 'external' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-slate-300'}`}
                            >
                                <Truck size={16} /> Eksternal / Indoarsip
                            </button>
                        </div>

                        {/* SEARCH BAR */}
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                value={inventorySearchQuery}
                                onChange={(e) => setInventorySearchQuery(e.target.value)}
                                placeholder="Cari Box, Vendor, Ordner, Invoice..."
                                className="w-full pl-10 pr-4 py-2 border rounded-lg bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all text-sm"
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 dark:border-slate-800 pt-4">
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
                                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg text-sm flex items-center gap-2 transition-colors"
                                    title="Download Template Excel"
                                >
                                    <Download size={16} /> Template
                                </button>
                                <button
                                    onClick={() => excelInputRef.current.click()}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm flex items-center gap-2 transition-colors"
                                    title="Import Data dari Excel"
                                >
                                    <FileSpreadsheet size={16} /> Import Excel
                                </button>
                            </>
                        )}
                        <button
                            onClick={handleExportInventory}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center gap-2 transition-colors"
                            title="Export Laporan Detail"
                        >
                            <FileText size={16} /> Export Laporan
                        </button>
                    </div>
                </div>

                {/* GRID */}
                {activeInvTab === 'internal' && (
                    <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
                        {inventory.map((slot) => {
                            const statusStyle = getStatusStyle(slot.status);
                            const matched = isMatch(slot);

                            return (
                                <button
                                    key={slot.id}
                                    onClick={() => handleSlotClick(slot)}
                                    disabled={!matched && inventorySearchQuery}
                                    className={`aspect-square rounded-xl flex flex-col items-center justify-center relative group transition-all duration-300 
                                    ${slot.status === 'EMPTY'
                                            ? 'bg-gray-50 dark:bg-slate-800/40 border-2 border-dashed border-gray-300 dark:border-slate-700 hover:border-indigo-500'
                                            : `border ${statusStyle.color.split(' ')[1].replace('border-', 'border-')} ${statusStyle.color.split(' ')[0]} shadow-sm`
                                        }
                                    ${!matched && inventorySearchQuery ? 'opacity-20 grayscale cursor-not-allowed hidden' : 'opacity-100'}
                                `}
                                >
                                    <span className="text-[10px] font-mono font-bold mb-1 text-gray-400 absolute top-1 right-2">#{String(slot.id).padStart(3, '0')}</span>

                                    {slot.status !== 'EMPTY' ? (
                                        <div className="flex flex-col items-center gap-1 w-full px-1">
                                            <Package size={20} className={statusStyle.color.split(' ')[2]} />
                                            {slot.boxData?.id && (
                                                <p className="text-[9px] md:text-[10px] font-bold truncate w-full text-center bg-white/50 dark:bg-black/20 rounded px-1">
                                                    {slot.boxData.id}
                                                </p>
                                            )}
                                            {/* Display Invoice Info if available */}
                                            {slot.boxData?.ordners?.[0]?.invoices?.[0] && (
                                                <div className="flex flex-col items-center w-full mt-0.5">
                                                    {(slot.boxData.ordners[0].noOrdner !== 'Imported' || slot.boxData.ordners[0].period !== 'Imported') && (
                                                        <div className="flex gap-1 text-[8px] text-amber-600 dark:text-amber-500 font-mono bg-amber-50 dark:bg-amber-900/10 px-1 rounded mb-0.5 w-full justify-center">
                                                            <span className="truncate max-w-[45%]">{slot.boxData.ordners[0].noOrdner}</span>
                                                            <span className="truncate max-w-[45%]">{slot.boxData.ordners[0].period}</span>
                                                        </div>
                                                    )}

                                                    {/* Invoice Info */}
                                                    {slot.boxData.ordners[0].invoices?.[0] && (
                                                        <>
                                                            <p className="text-[8px] text-gray-500 dark:text-slate-400 truncate w-full text-center leading-tight">
                                                                {slot.boxData.ordners[0].invoices[0].invoiceNo}
                                                            </p>
                                                            <p className="text-[8px] text-indigo-500 dark:text-indigo-400 truncate w-full text-center leading-tight">
                                                                {slot.boxData.ordners[0].invoices[0].vendor}
                                                            </p>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <Plus size={20} className="text-gray-300" />
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
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-b border-gray-200 dark:border-slate-700">
                                    <tr>
                                        <th className="px-6 py-4">Box ID</th>
                                        <th className="px-6 py-4">Tujuan</th>
                                        <th className="px-6 py-4">Tanggal Kirim</th>
                                        <th className="px-6 py-4">Pengirim</th>
                                        <th className="px-6 py-4">Isi (Snapshot)</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Aksi</th>
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
                                            <tr key={item.id} className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 group">
                                                <td className="px-6 py-4 font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                    <Package size={16} className="text-indigo-500" />
                                                    {item.boxId}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded text-xs font-semibold">{item.destination}</span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-500 dark:text-slate-400">
                                                    <div className="flex items-center gap-1">
                                                        <Clock size={14} />
                                                        {new Date(item.sentDate).toLocaleString()}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-1 text-gray-600 dark:text-slate-300">
                                                        <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold">
                                                            {item.sender?.charAt(0) || '?'}
                                                        </div>
                                                        {item.sender}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-xs text-gray-500 dark:text-slate-400">
                                                        {(item.boxData?.ordners?.length || 0)} Ordner
                                                        <span className="mx-1">•</span>
                                                        {(item.boxData?.ordners?.reduce((acc, o) => acc + (o.invoices?.length || 0), 0) || 0)} Invoice
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                                        Archived
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onViewExternal(item); }}
                                                            className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg text-gray-500 transition-colors"
                                                            title="Lihat Detail"
                                                        >
                                                            <FileText size={16} />
                                                        </button>
                                                        {hasPermission('inventory', 'edit') && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); onRestoreExternal(item); }}
                                                                className="p-1.5 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg transition-colors"
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
