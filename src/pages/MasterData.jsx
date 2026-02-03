import React, { useState } from 'react';
import { Plus, Edit3, Trash2, Building2 } from 'lucide-react';
import { Card } from '../components/ui/Card';

export default function MasterData({
    users, roles, departments,
    handleDeleteUser, handleEditRole, handleDeleteRole,
    handleSaveDept, handleDeleteDept,
    handleCreateUser, // Must be passed from App
    setRoles, setDepartments, // For local updates if needed, or handle exclusively in App
    setIsModalOpen, setModalTab
}) {
    const [masterTab, setMasterTab] = useState('users');
    const [userSearchQuery, setUserSearchQuery] = useState('');

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex gap-4 mb-4">
                {['users', 'roles', 'departments'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setMasterTab(tab)}
                        className={`px-4 py-2 rounded-lg capitalize transition-colors ${masterTab === tab ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {masterTab === 'users' && (
                <Card>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg dark:text-white">Manajemen User</h3>
                        <div className="flex gap-2">
                            <input
                                type="text" placeholder="Cari user..." className="px-3 py-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700 dark:text-white text-sm"
                                value={userSearchQuery} onChange={(e) => setUserSearchQuery(e.target.value)}
                            />
                            <button
                                onClick={() => { setModalTab('user-create'); setIsModalOpen(true); }} // Assuming a modal for user creation exists or will be handled
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm flex items-center gap-2 hover:bg-indigo-700 transition-colors"
                            >
                                <Plus size={16} /> User Baru
                            </button>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {users.filter(u => u.name.toLowerCase().includes(userSearchQuery.toLowerCase())).map(u => (
                            <div key={u.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-indigo-300 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 font-bold text-lg">
                                        {u.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-bold dark:text-white">{u.name}</div>
                                        <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                                            <span className="bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded">{u.role}</span>
                                            <span>•</span>
                                            <span>{u.department}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button className="text-gray-400 hover:text-blue-600 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"><Edit3 size={18} /></button>
                                    <button onClick={() => handleDeleteUser(u.id)} className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={18} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {masterTab === 'roles' && (
                <Card>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg dark:text-white">Manajemen Role & Hak Akses</h3>
                        <button
                            onClick={() => { setModalTab('role-create'); setIsModalOpen(true); }}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm flex items-center gap-2 hover:bg-indigo-700 transition-colors"
                        >
                            <Plus size={16} /> Role Baru
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {roles.map(r => (
                            <div key={r.id} className="p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="font-bold text-lg dark:text-white">{r.name}</div>
                                        <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider">Hak Akses Modul</div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => handleEditRole(r)} className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"><Edit3 size={16} /></button>
                                        <button onClick={() => handleDeleteRole(r.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(r.permissions || {}).map(([mod, perms]) => (
                                        <div key={mod} className="px-2 py-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded text-[10px] flex flex-col">
                                            <span className="font-bold text-indigo-500 uppercase">{mod}</span>
                                            <span className="text-gray-400">{perms.join(', ')}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {masterTab === 'departments' && (
                <Card>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg dark:text-white">Daftar Departemen</h3>
                        <button onClick={() => { const name = prompt("Nama Dept Baru:"); if (name) handleSaveDept(name); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm flex items-center gap-2 hover:bg-indigo-700 transition-colors"><Plus size={16} /> Departemen Baru</button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {departments.map(d => (
                            <div key={d.id} className="p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 flex flex-col items-center justify-center text-center">
                                <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 mb-2">
                                    <Building2 size={20} />
                                </div>
                                <div className="font-bold dark:text-white text-sm">{d.name}</div>
                                <div className="text-[10px] text-gray-400 mt-1 uppercase">ID: {d.id}</div>
                                <button onClick={() => handleDeleteDept(d.id)} className="mt-2 text-red-500 hover:text-red-700 text-xs"><Trash2 size={14} /></button>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
}
