import React from 'react';
import { Package, Plus } from 'lucide-react';

export default function InventoryGrid({
    TOTAL_SLOTS,
    inventory,
    handleSlotClick,
    getStatusStyle,
    isMatch,
    inventorySearchQuery
}) {
    return (
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
    );
}
