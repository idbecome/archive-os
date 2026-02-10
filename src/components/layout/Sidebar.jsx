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
    LogOut,
    Calculator
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
                                TaxArchi<span className="text-indigo-500">System</span>
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
            <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto no-scrollbar relative">
                {[
                    {
                        category: 'GENERAL',
                        items: [
                            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                        ]
                    },
                    {
                        category: 'WAREHOUSE & ASSETS',
                        items: [
                            { id: 'inventory', icon: Grid3X3, label: 'Inventory' },
                            { id: 'documents', icon: FileStack, label: 'Documents' },
                        ]
                    },
                    {
                        category: 'TAX & COMPLIANCE',
                        items: [
                            { id: 'tax-monitoring', icon: ShieldCheck, label: 'Compliance' },
                            { id: 'tax-calculation', icon: Calculator, label: 'Tax Calc' },
                            { id: 'tax-summary', icon: PieChart, label: 'Reporting' },
                        ]
                    },
                    {
                        category: 'SYSTEM',
                        items: [
                            { id: 'master', icon: Settings, label: 'User Management' },
                        ]
                    }
                ].map((section, sectionIdx) => (
                    <div key={section.category} className="space-y-2">
                        {!isSidebarCollapsed && (
                            <h3 className="px-4 text-[10px] font-bold text-[#A3AED0] dark:text-slate-500 uppercase tracking-[0.2em] mb-2 animate-in fade-in slide-in-from-left-2 duration-500">
                                {section.category}
                            </h3>
                        )}
                        <div className="space-y-1">
                            {section.items.filter(item => hasPermission(item.id, 'view')).map((item) => {
                                const isActive = activeTab === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => {
                                            setActiveTab(item.id);
                                            if (window.innerWidth < 768) setIsSidebarCollapsed(true);
                                        }}
                                        className={`
                                            w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-start'} gap-4 px-4 py-3.5 
                                            rounded-2xl transition-all duration-500 relative group active:scale-95 overflow-hidden
                                            ${isActive
                                                ? 'text-white shadow-lg shadow-indigo-500/25'
                                                : 'text-[#A3AED0] dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white'
                                            }
                                        `}
                                    >
                                        {/* Animated Background Indicator */}
                                        <div className={`
                                            absolute inset-0 bg-gradient-to-r from-[#4318FF] to-[#868CFF]
                                            transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                                            ${isActive ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-full'}
                                        `} />

                                        {/* Hover Glow Effect */}
                                        <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                        <item.icon
                                            size={isSidebarCollapsed ? 24 : 20}
                                            strokeWidth={isActive ? 2.5 : 2}
                                            className={`relative z-10 transition-all duration-500 ${isActive ? 'scale-110' : 'group-hover:scale-110'} ${isActive ? 'text-white' : ''}`}
                                        />

                                        {!isSidebarCollapsed && (
                                            <span className={`relative z-10 font-bold tracking-tight text-sm transition-all duration-500 ${isActive ? 'translate-x-1' : ''}`}>
                                                {item.label}
                                            </span>
                                        )}

                                        {/* Collapsed Tooltip */}
                                        {isSidebarCollapsed && (
                                            <div className="absolute left-full ml-6 px-4 py-2 bg-[#1B254B] dark:bg-white text-white dark:text-[#1B254B] text-sm font-bold rounded-xl opacity-0 scale-90 -translate-x-2 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 transition-all duration-300 whitespace-nowrap z-50 shadow-2xl origin-left pointer-events-none">
                                                <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-[#1B254B] dark:bg-white rotate-45 rounded-sm"></div>
                                                {item.label}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
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
                    <div
                        className={`flex items-center cursor-pointer hover:bg-white/40 dark:hover:bg-indigo-800/20 transition-colors ${isSidebarCollapsed ? 'flex-col gap-1' : 'gap-3 p-3'}`}
                        onClick={() => {
                            setActiveTab('profile');
                            if (window.innerWidth < 768) setIsSidebarCollapsed(true);
                        }}
                    >
                        <div className={`
                            relative rounded-full bg-gradient-to-tr from-[#4318FF] to-[#868CFF] p-[3px] shadow-lg shadow-indigo-500/30 transition-transform duration-300 group-hover:scale-105
                            ${isSidebarCollapsed ? 'w-12 h-12' : 'w-10 h-10'}
                        `}>
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
                        {!isSidebarCollapsed && (
                            <ChevronRight size={14} className="text-[#A3AED0] opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
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
