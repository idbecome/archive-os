import React from 'react';
import { Grid3X3, Package, Clock, AlertCircle, Download, FileSpreadsheet, Plus } from 'lucide-react';
import { SummaryCard } from '../components/ui/Card';

export default function Inventory({
    inventory, stats, TOTAL_SLOTS, getStatusStyle,
    handleSlotClick, handleExcelImport, downloadTemplate, excelInputRef
}) {
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

            <div className="flex flex-col md:flex-row justify-between items-center mb-6 bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm gap-4">
                <h2 className="text-lg font-bold dark:text-white flex items-center gap-2">
                    <Grid3X3 className="text-indigo-500" /> Layout Rak Utama
                </h2>
                <div className="flex gap-2">
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
                        title="Download Template Excel/CSV"
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
                </div>
            </div>
            <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
                {inventory.map((slot) => {
                    const statusStyle = getStatusStyle(slot.status);
                    return (
                        <button
                            key={slot.id}
                            onClick={() => handleSlotClick(slot)}
                            className={`aspect-square rounded-xl flex flex-col items-center justify-center relative group transition-all duration-300 ${slot.status === 'EMPTY' ? 'bg-gray-50 dark:bg-slate-800/40 border-2 border-dashed border-gray-300 dark:border-slate-700 hover:border-indigo-500' : `border ${statusStyle.color.split(' ')[1].replace('border-', 'border-')} ${statusStyle.color.split(' ')[0]} shadow-sm`}`}
                        >
                            <span className="text-xs font-mono font-bold mb-1 text-gray-400">#{String(slot.id).padStart(3, '0')}</span>
                            {slot.status !== 'EMPTY' ? <Package size={24} className={statusStyle.color.split(' ')[2]} /> : <Plus size={20} className="text-gray-300" />}
                        </button>
                    )
                })}
            </div>
        </div>
    );
}
