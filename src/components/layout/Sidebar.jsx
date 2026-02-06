import React from 'react';
import {
    LayoutDashboard,
    Grid3X3,
    FileStack,
    ShieldCheck,
    PieChart,
    Settings,
    ChevronRight,
    ChevronLeft,
    User,
    Sun,
    Moon,
    LogOut
} from 'lucide-react';

const Sidebar = ({
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    activeTab,
    setActiveTab,
    hasPermission,
    currentUser,
    isDarkMode,
    setIsDarkMode,
    handleLogout
}) => {
    return (
        <aside
            className={`
        fixed inset-y-0 left-0 z-50 md:static md:z-0 transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)]
        ${isSidebarCollapsed ? 'w-24' : 'w-72'}
        bg-white/80 dark:bg-[#111C44]/80 backdrop-blur-2xl border-r border-white/20 dark:border-white/5 
        rounded-r-[2.5rem] shadow-2xl shadow-indigo-500/10 flex flex-col justify-between
        ${!isSidebarCollapsed && 'md:w-72'}
        transform ${!isSidebarCollapsed ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}
        >
            {/* Logo Section */}
            <div className={`flex items-center ${isSidebarCollapsed ? 'flex-col justify-center gap-4' : 'justify-between'} p-8 transition-all duration-300`}>
                <div className={`flex items-center gap-3 transition-all duration-300 ${isSidebarCollapsed ? 'scale-90' : ''}`}>
                    <div className="relative group cursor-pointer" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
                        <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-30 rounded-full group-hover:opacity-50 transition-opacity duration-300 animate-pulse-slow"></div>
                        <img src="/vite.svg" alt="Logo" className="w-10 h-10 relative z-10 drop-shadow-lg transform group-hover:rotate-12 transition-transform duration-300" />
                    </div>
                    {!isSidebarCollapsed && (
                        <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                            <h1 className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#2B3674] to-[#A3AED0] dark:from-white dark:to-slate-400 font-display">
                                Archive<span className="text-indigo-500">OS</span>
                            </h1>
                        </div>
                    )}
                </div>
                {!isSidebarCollapsed && (
                    <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="hidden md:flex w-8 h-8 items-center justify-center rounded-full bg-indigo-50 dark:bg-slate-800 text-indigo-500 dark:text-slate-400 hover:bg-indigo-100 hover:text-indigo-700 transition-all shadow-sm hover:scale-110">
                        <ChevronLeft size={18} />
                    </button>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-4 space-y-3 overflow-y-auto no-scrollbar">
                {[
                    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                    { id: 'inventory', icon: Grid3X3, label: 'Warehouse' },
                    { id: 'documents', icon: FileStack, label: 'Documents' },
                    { id: 'tax-monitoring', icon: ShieldCheck, label: 'Compliance' },
                    { id: 'tax-summary', icon: PieChart, label: 'Reporting' },
                    { id: 'master', icon: Settings, label: 'Settings' },
                ].filter(item => hasPermission(item.id, 'view')).map(item => (
                    <button
                        key={item.id}
                        onClick={() => {
                            setActiveTab(item.id);
                            if (window.innerWidth < 768) setIsSidebarCollapsed(true);
                        }}
                        className={`
              w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-start'} gap-4 px-4 py-4 
              rounded-3xl transition-all duration-300 relative group active:scale-95
              ${activeTab === item.id
                                ? 'bg-gradient-to-r from-[#4318FF] to-[#868CFF] text-white shadow-xl shadow-indigo-500/30 ring-2 ring-white/20 dark:ring-white/10'
                                : 'text-[#A3AED0] dark:text-slate-400 hover:text-[#2B3674] dark:hover:text-white hover:bg-indigo-50/50 dark:hover:bg-white/5'
                            }
            `}
                    >
                        {/* Glass Shine Effect for Active */}
                        {activeTab === item.id && (
                            <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-white/10 to-transparent pointer-events-none"></div>
                        )}

                        {/* Active Indicator Line (Left) - Only when expanded */}
                        {activeTab === item.id && !isSidebarCollapsed && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white/50 rounded-r-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
                        )}

                        <item.icon
                            size={isSidebarCollapsed ? 26 : 24}
                            strokeWidth={activeTab === item.id ? 2.5 : 2}
                            className={`relative z-10 transition-transform duration-300 ${isSidebarCollapsed && activeTab === item.id ? 'scale-110 drop-shadow-md' : 'group-hover:scale-110'}`}
                        />

                        {!isSidebarCollapsed && (
                            <span className={`relative z-10 font-bold tracking-tight text-sm ${activeTab === item.id ? 'font-bold' : 'font-medium'} transition-colors delay-75`}>
                                {item.label}
                            </span>
                        )}

                        {/* Tooltip for collapsed state with Wave Animation */}
                        {isSidebarCollapsed && (
                            <div className="absolute left-full ml-6 px-4 py-2 bg-[#1B254B] dark:bg-white text-white dark:text-[#1B254B] text-sm font-bold rounded-2xl opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 whitespace-nowrap z-50 shadow-2xl origin-left backdrop-blur-xl">
                                <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 bg-[#1B254B] dark:bg-white rotate-45 rounded"></div>
                                {item.label}
                            </div>
                        )}
                    </button>
                ))}
            </nav>

            {/* User Profile Footer */}
            <div className={`px-4 pb-8 pt-4 transition-all duration-300 ${isSidebarCollapsed ? 'flex flex-col items-center gap-4' : ''}`}>
                <div className={`
                    relative overflow-hidden transition-all duration-500 group
                    ${isSidebarCollapsed
                        ? 'bg-transparent p-0 w-full flex flex-col gap-4 items-center'
                        : 'bg-gradient-to-b from-indigo-50 to-white dark:from-indigo-900/20 dark:to-[#111C44] border border-white/50 dark:border-white/5 shadow-lg rounded-3xl p-1'
                    }
                `}>
                    {/* User Info Row */}
                    <div className={`flex items-center ${isSidebarCollapsed ? 'flex-col gap-1' : 'gap-3 p-3'}`}>
                        <div className={`
                            relative rounded-full bg-gradient-to-tr from-[#4318FF] to-[#868CFF] p-[3px] shadow-lg shadow-indigo-500/30 transition-transform duration-300 group-hover:scale-105
                            ${isSidebarCollapsed ? 'w-12 h-12 cursor-pointer' : 'w-10 h-10'}
                        `} onClick={() => isSidebarCollapsed && setIsSidebarCollapsed(false)}>
                            <div className="w-full h-full rounded-full bg-white dark:bg-[#111C44] flex items-center justify-center overflow-hidden border-2 border-white dark:border-[#0B1437]">
                                <span className="font-extrabold text-xs text-[#4318FF]">{currentUser?.name?.substring(0, 2).toUpperCase()}</span>
                            </div>
                            {/* Online Dot */}
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white dark:border-[#111C44] rounded-full animate-pulse"></div>
                        </div>

                        {!isSidebarCollapsed && (
                            <div className="flex-1 min-w-0 animate-in fade-in duration-300">
                                <h4 className="font-bold text-sm text-[#2B3674] dark:text-white truncate">{currentUser?.name || 'Guest'}</h4>
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold truncate">{currentUser?.role || 'Viewer'}</p>
                            </div>
                        )}
                    </div>

                    {/* Actions: Collapsed vs Expanded */}
                    {isSidebarCollapsed ? (
                        <>
                            {/* Collapsed Actions: Stacked Icons */}
                            <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-10 h-10 flex items-center justify-center rounded-full text-gray-400 hover:text-yellow-500 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-all hover:scale-110" title="Toggle Theme">
                                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                            </button>
                            <button onClick={handleLogout} className="w-10 h-10 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all hover:scale-110" title="Logout">
                                <LogOut size={20} />
                            </button>
                        </>
                    ) : (
                        /* Expanded Actions: Horizontal Row */
                        <div className="flex items-center gap-2 mt-2 px-3 pb-3">
                            <button onClick={() => setIsDarkMode(!isDarkMode)} className="flex-1 flex items-center justify-center p-2.5 rounded-xl text-gray-400 bg-white dark:bg-slate-800 hover:text-yellow-500 shadow-sm hover:shadow-md transition-all border border-transparent hover:border-indigo-100 hover:-translate-y-0.5" title="Toggle Theme">
                                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                            </button>
                            <button onClick={handleLogout} className="flex-1 flex items-center justify-center p-2.5 rounded-xl text-gray-400 bg-white dark:bg-slate-800 hover:text-red-500 shadow-sm hover:shadow-md transition-all border border-transparent hover:border-red-100 hover:-translate-y-0.5" title="Logout">
                                <LogOut size={18} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
};


export default Sidebar;
