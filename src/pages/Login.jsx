import React, { useState } from 'react';
import { User, FileKey, AlertCircle } from 'lucide-react';

export default function Login({ onLogin }) {
    const [loginForm, setLoginForm] = useState({ username: '', password: '', error: '' });

    const handleSubmit = (e) => {
        e.preventDefault();
        onLogin(loginForm.username, loginForm.password, (errorMsg) => {
            setLoginForm(prev => ({ ...prev, error: errorMsg }));
        });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-transparent transition-colors duration-300 p-4">
            <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-8 rounded-3xl shadow-2xl w-full max-w-md border border-white/40 dark:border-white/10 animate-in fade-in zoom-in-95 duration-300 ring-1 ring-black/5 dark:ring-white/5 mx-auto">
                <div className="flex justify-center mb-8">
                    <img src="/vite.svg" alt="Logo" className="w-20 h-20 drop-shadow-2xl" />
                </div>
                <h2 className="text-3xl font-extrabold text-center text-gray-900 dark:text-white mb-2 tracking-tight">Archive Os</h2>
                <p className="text-center text-gray-500 dark:text-slate-400 mb-8 font-medium">Sistem Manajemen Arsip Terpadu</p>

                {loginForm.error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2 animate-in slide-in-from-top-2">
                        <AlertCircle size={16} /> {loginForm.error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Username</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                value={loginForm.username}
                                onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                                className="w-full pl-10 pr-4 py-2 border rounded-lg bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:text-white transition-all"
                                placeholder="Masukkan username"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Password</label>
                        <div className="relative">
                            <FileKey className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="password"
                                value={loginForm.password}
                                onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                                className="w-full pl-10 pr-4 py-2 border rounded-lg bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:text-white transition-all"
                                placeholder="Masukkan password"
                            />
                        </div>
                    </div>
                    <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
                        Masuk Sistem
                    </button>
                </form>
                <p className="text-center text-xs text-gray-400 mt-8">© 2024 ArchiveOS Enterprise Edition</p>
            </div>
        </div>
    );
}
