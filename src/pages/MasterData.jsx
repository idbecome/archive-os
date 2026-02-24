import React, { useState, useMemo } from 'react';
import { Plus, Edit3, Trash2, Building2, GitCommit, ShieldCheck, ChevronRight, Users, User, Shield } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { useUserStore } from '../store/useUserStore';
import { useDocStore } from '../store/useDocStore';

export default function MasterData({
    handleCreateUser, handleEditUser,
    handleCreateDept, handleEditDept,
    handleCreateRole,
    handleCreateFlow, handleEditFlow, handleDeleteFlow,
    setIsModalOpen, setModalTab,
    hasPermission
}) {
    const { users, roles, departments, deleteUser, deleteRole, deleteDepartment } = useUserStore();
    const { flows } = useDocStore();
    const [masterTab, setMasterTab] = useState('users');
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [expandedDepts, setExpandedDepts] = useState({});

    const toggleDept = (deptName) => {
        setExpandedDepts(prev => ({
            ...prev,
            [deptName]: !prev[deptName]
        }));
    };

    const groupedUsers = useMemo(() => {
        const filtered = users.filter(u =>
            u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
            (u.department || '').toLowerCase().includes(userSearchQuery.toLowerCase())
        );
        return filtered.reduce((acc, user) => {
            const dept = user.department || 'Tanpa Departemen';
            if (!acc[dept]) acc[dept] = [];
            acc[dept].push(user);
            return acc;
        }, {});
    }, [users, userSearchQuery]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex gap-4 mb-4">
                {['users', 'roles', 'departments', 'flows'].map(tab => (
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
                            {hasPermission('master', 'create') && (
                                <button
                                    onClick={handleCreateUser}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm flex items-center gap-2 hover:bg-indigo-700 transition-colors"
                                >
                                    <Plus size={16} /> User Baru
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="space-y-4">
                        {Object.keys(groupedUsers).length === 0 ? (
                            <div className="text-center py-10 text-slate-400 italic">User tidak ditemukan.</div>
                        ) : (
                            Object.entries(groupedUsers).map(([deptName, deptUsers]) => (
                                <div key={deptName} className="space-y-2">
                                    <button
                                        onClick={() => toggleDept(deptName)}
                                        className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl hover:shadow-md transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600">
                                                <Building2 size={18} />
                                            </div>
                                            <div className="text-left">
                                                <h4 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-wider">{deptName}</h4>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{deptUsers.length} Anggota Terdaftar</p>
                                            </div>
                                        </div>
                                        <div className={`p-2 rounded-xl transition-all ${expandedDepts[deptName] ? 'bg-indigo-600 text-white rotate-90' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:text-indigo-600'}`}>
                                            <ChevronRight size={18} />
                                        </div>
                                    </button>

                                    {expandedDepts[deptName] && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-4 animate-in slide-in-from-top-2 duration-300">
                                            {deptUsers.map(u => (
                                                <div key={u.id} className="flex items-center justify-between p-4 bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-white/60 dark:border-white/5 hover:border-indigo-300 transition-all group/user">
                                                    <div className="flex items-center gap-4">
                                                        <div className="relative">
                                                            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black text-lg shadow-lg">
                                                                {u.name.charAt(0)}
                                                            </div>
                                                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center border border-slate-100 dark:border-slate-800 shadow-sm">
                                                                <Shield size={10} className="text-indigo-500" />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="font-black text-slate-800 dark:text-white text-sm tracking-tight">{u.name}</div>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-md">{u.role}</span>
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase">@{u.username}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1 opacity-0 group-hover/user:opacity-100 transition-all">
                                                        {hasPermission('master', 'edit') && (
                                                            <button onClick={() => handleEditUser(u)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"><Edit3 size={16} /></button>
                                                        )}
                                                        {hasPermission('master', 'delete') && (
                                                            <button onClick={() => deleteUser(u.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"><Trash2 size={16} /></button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </Card>
            )}

            {masterTab === 'roles' && (
                <Card>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg dark:text-white">Manajemen Role & Hak Akses</h3>
                        {hasPermission('master', 'create') && (
                            <button
                                onClick={handleCreateRole}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm flex items-center gap-2 hover:bg-indigo-700 transition-colors"
                            >
                                <Plus size={16} /> Role Baru
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {roles.map(r => {
                            let perms = r.permissions || r.access || {};
                            if (typeof perms === 'string') {
                                try { perms = JSON.parse(perms); } catch { perms = {}; }
                            }
                            return (
                                <div key={r.id} className="p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="font-bold text-lg dark:text-white">{r.label || r.name}</div>
                                            <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider">Hak Akses Modul</div>
                                        </div>
                                        <div className="flex gap-1">
                                            {hasPermission('master', 'edit') && (
                                                <button onClick={() => handleEditRole(r)} className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"><Edit3 size={16} /></button>
                                            )}
                                            {hasPermission('master', 'delete') && (
                                                <button onClick={() => deleteRole(r.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={16} /></button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(perms).map(([mod, actions]) => (
                                            <div key={mod} className="px-2 py-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded text-[10px] flex flex-col">
                                                <span className="font-bold text-indigo-500 uppercase">{mod}</span>
                                                <span className="text-gray-400">{Array.isArray(actions) ? actions.join(', ') : ''}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </Card>
            )}

            {masterTab === 'flows' && (
                <Card>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg dark:text-white">Master Alur Persetujuan</h3>
                        {hasPermission('master', 'create') && (
                            <button onClick={() => handleCreateFlow()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm flex items-center gap-2 hover:bg-indigo-700 transition-colors">
                                <Plus size={16} /> Flow Baru
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {flows.map(f => (
                            <div key={f.id} className="p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-indigo-300 transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="font-bold text-lg dark:text-white">{f.name}</div>
                                        <div className="text-xs text-gray-500 mt-1">{f.description}</div>
                                    </div>
                                    <div className="flex gap-1">
                                        {hasPermission('master', 'edit') && (
                                            <button onClick={() => handleEditFlow(f)} className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg" title="Edit Flow"><Edit3 size={16} /></button>
                                        )}
                                        {hasPermission('master', 'delete') && (
                                            <button onClick={() => handleDeleteFlow(f.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title="Hapus Flow"><Trash2 size={16} /></button>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {(f.steps || []).map((s, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-xs">
                                            <div className="w-5 h-5 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">{idx + 1}</div>
                                            <span className="dark:text-slate-300 font-medium flex items-center gap-1"><ShieldCheck size={12} /> {s.name}</span>
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
                        {hasPermission('master', 'create') && (
                            <button onClick={handleCreateDept} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm flex items-center gap-2 hover:bg-indigo-700 transition-colors"><Plus size={16} /> Departemen Baru</button>
                        )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {departments.map(d => (
                            <div key={d.id} className="p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 flex flex-col items-center justify-center text-center group relative">
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {hasPermission('master', 'edit') && (
                                        <button onClick={() => handleEditDept(d)} className="p-1 text-gray-400 hover:text-blue-500"><Edit3 size={14} /></button>
                                    )}
                                </div>
                                <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 mb-2">
                                    <Building2 size={20} />
                                </div>
                                <div className="font-bold dark:text-white text-sm">{d.name}</div>
                                <div className="text-[10px] text-gray-400 mt-1 uppercase">ID: {d.id}</div>
                                {hasPermission('master', 'delete') && (
                                    <button onClick={() => deleteDepartment(d.id)} className="mt-2 text-red-500 hover:text-red-700 text-xs"><Trash2 size={14} /></button>
                                )}
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
}
