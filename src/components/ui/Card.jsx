import React from 'react';

export const Card = ({ children, className = '', onClick }) => (
    <div
        onClick={onClick}
        className={`bg-white/80 dark:bg-slate-900/60 backdrop-blur-md border border-gray-200 dark:border-slate-700/50 rounded-2xl p-6 shadow-sm dark:shadow-none transition-all duration-300 ${onClick ? 'cursor-pointer hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transform hover:-translate-y-1' : ''} ${className}`}
    >
        {children}
    </div>
);

export const SummaryCard = ({ title, value, subtext, icon: Icon, colorClass }) => (
    <Card className="flex items-center gap-4 relative overflow-hidden">
        <div className={`p-3 rounded-xl ${colorClass}`}>
            <Icon size={24} />
        </div>
        <div>
            <div className="text-sm text-gray-500 dark:text-slate-400 font-medium">{title}</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
            {subtext && <div className="text-xs text-gray-400 mt-0.5">{subtext}</div>}
        </div>
    </Card>
);
