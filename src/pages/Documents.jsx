import React, { useState } from 'react';
import {
    HardDrive, ChevronRight, ChevronLeft, Search, Plus, UploadCloud, FolderOpen,
    Trash2, Edit3, FileDigit, FileText, Highlighter, History, PenLine, User, Clock,
    Copy, Move, RefreshCw, X, Lock, Users, Building, Shield, Download, Eye, File, Image, MoreVertical
} from 'lucide-react';
import { SummaryCard } from '../components/ui/Card';
import { api } from '../api';
import Modal from '../components/common/Modal';

export default function Documents({
    docList, folders, currentFolderId, setCurrentFolderId,
    searchQuery, setSearchQuery,
    handleCreateFolder, handleDeleteFolder, handleRenameFolder,
    handleViewDoc, handleEditDoc, handleDeleteDoc, handleRenameDoc,
    setUploadForm, setModalTab, setIsModalOpen,
    hasPermission, docStats,
    getSearchSnippet, logs,
    navigateFolder, navigateBack, navigateForward, folderHistory, historyIndex,
    onRefresh, users, departments, currentUser, handleEditFolder, handleDownload
}) {
    const [showHistory, setShowHistory] = useState(false);
    const [activeMenuId, setActiveMenuId] = useState(null); // ID of the document whose menu is open
    const [activeFolderMenuId, setActiveFolderMenuId] = useState(null); // ID of the folder whose menu is open
    const [menuLocation, setMenuLocation] = useState({ top: null, bottom: null, right: 0 }); // Coordinates for fixed menu positioning

    // --- BULK SELECTION STATE ---
    const [selectedDocIds, setSelectedDocIds] = useState(new Set());
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);

    // --- FOLDER MODAL STATE ---
    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
    const [folderForm, setFolderForm] = useState({ id: '', name: '', privacy: 'public', allowedDepts: [], allowedUsers: [], owner: '' }); // privacy: 'public' | 'private' | 'dept' | 'user'

    // --- MANAGEMENT OPS STATE ---
    const [mgmtOp, setMgmtOp] = useState(null); // { type: 'copy' | 'move', itemType: 'file' | 'folder', item: any }
    const [isMgmtModalOpen, setIsMgmtModalOpen] = useState(false);
    const [opProgress, setOpProgress] = useState(0);
    const [isExecutingOp, setIsExecutingOp] = useState(false);

    const startMgmtOp = (type, itemType, item) => {
        setMgmtOp({ type, itemType, item });
        setIsMgmtModalOpen(true);
    };

    const performCopyMove = async (targetFolderId) => {
        if (!mgmtOp) return;
        setIsExecutingOp(true);
        setOpProgress(10);

        try {
            if (mgmtOp.itemType === 'file') {
                if (mgmtOp.type === 'copy') {
                    await api.copyDocument(mgmtOp.item.id, targetFolderId);
                } else {
                    await api.moveDocument(mgmtOp.item.id, targetFolderId);
                }
            } else {
                if (mgmtOp.type === 'copy') {
                    await api.copyFolder(mgmtOp.item.id, targetFolderId);
                } else {
                    await api.moveFolder(mgmtOp.item.id, targetFolderId);
                }
            }
            setOpProgress(100);
            setTimeout(() => {
                setIsExecutingOp(false);
                setIsMgmtModalOpen(false);
                setMgmtOp(null);
                setOpProgress(0);
                if (onRefresh) onRefresh();
            }, 500);
        } catch (e) {
            alert("Operasi gagal: " + e.message);
            setIsExecutingOp(false);
            setOpProgress(0);
        }
    };

    // --- BULK HANDLERS ---
    const toggleDocSelection = (id) => {
        const newSet = new Set(selectedDocIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedDocIds(newSet);
    };

    const handleBulkDelete = async () => {
        if (selectedDocIds.size === 0) return;
        if (!window.confirm(`Yakin ingin menghapus ${selectedDocIds.size} dokumen terpilih?`)) return;

        setIsBulkDeleting(true);
        try {
            const promises = Array.from(selectedDocIds).map(id => api.deleteDocument(id));
            await Promise.all(promises);
            setSelectedDocIds(new Set());
            if (onRefresh) onRefresh();
        } catch (e) {
            alert("Gagal menghapus beberapa file: " + e.message);
        } finally {
            setIsBulkDeleting(false);
        }
    };

    // Filter logs for document activities
    const docLogs = logs?.filter(l =>
        ['Upload', 'Delete', 'Rename', 'Folder', 'Revisi', 'Download', 'Copy', 'Move', 'Hapus'].some(k => l.action.includes(k))
    ) || [];

    return (
        <div className="animate-in slide-in-from-right duration-300 space-y-6 relative">
            {/* Global Backdrop for Menus - Click anywhere to close */}
            {(activeMenuId || activeFolderMenuId) && (
                <div
                    className="fixed inset-0 z-[100] bg-transparent"
                    onClick={() => {
                        setActiveMenuId(null);
                        setActiveFolderMenuId(null);
                    }}
                />
            )}

            {/* SUMMARY CARDS FOR DOCUMENTS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                <SummaryCard
                    title="Total Dokumen"
                    value={(docList || []).length}
                    icon={FileText}
                    colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                />
                <SummaryCard
                    title="Total Folder"
                    value={(folders || []).length}
                    icon={FolderOpen}
                    colorClass="bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
                />
                <SummaryCard
                    title="Total Revisi"
                    value={docStats?.totalRevisions || 0}
                    icon={History}
                    colorClass="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400"
                />
            </div>

            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/30 dark:bg-slate-900/40 backdrop-blur-xl p-4 rounded-2xl border border-white/40 dark:border-white/10 shadow-xl ring-1 ring-black/5">
                <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto">
                    <div className="flex gap-1 mr-2 bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
                        <button onClick={navigateBack} disabled={historyIndex <= 0} className={`p-1 rounded hover:bg-white dark:hover:bg-slate-700 transition-colors ${historyIndex <= 0 ? 'text-gray-300 dark:text-slate-600' : 'text-gray-600 dark:text-slate-300'}`}>
                            <ChevronLeft size={18} />
                        </button>
                        <button onClick={navigateForward} disabled={!folderHistory || historyIndex >= folderHistory.length - 1} className={`p-1 rounded hover:bg-white dark:hover:bg-slate-700 transition-colors ${!folderHistory || historyIndex >= folderHistory.length - 1 ? 'text-gray-300 dark:text-slate-600' : 'text-gray-600 dark:text-slate-300'}`}>
                            <ChevronRight size={18} />
                        </button>
                    </div>
                    <button onClick={() => navigateFolder(null)} className={`p-2 rounded-lg ${currentFolderId === null ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100 text-gray-500'}`}>
                        <HardDrive size={20} />
                    </button>
                    {currentFolderId && (
                        <>
                            <ChevronRight size={16} className="text-gray-400" />
                            <span className="font-bold text-gray-700 dark:text-white">{folders.find(f => String(f.id) === String(currentFolderId))?.name || 'Unknown'}</span>
                        </>
                    )}
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari dokumen..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white"
                        />
                    </div>
                    <button onClick={onRefresh} className="px-3 py-2 rounded-lg border bg-white text-gray-600 border-gray-200 hover:bg-gray-50 flex items-center gap-2" title="Refresh Data">
                        <RefreshCw size={18} />
                    </button>
                    <button onClick={() => setShowHistory(!showHistory)} className={`px-3 py-2 rounded-lg border flex items-center gap-2 ${showHistory ? 'bg-indigo-100 text-indigo-600 border-indigo-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                        <History size={18} />
                    </button>
                    {hasPermission('documents', 'create') && (
                        <>
                            <button
                                onClick={() => {
                                    setFolderForm({ id: '', name: '', privacy: 'public', allowedDepts: [], allowedUsers: [], owner: '' });
                                    setIsFolderModalOpen(true);
                                }}
                                className="px-4 py-2 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg font-medium flex items-center justify-center gap-2 transition-all">
                                <Plus size={18} /> Folder
                            </button>
                            <button
                                onClick={() => {
                                    // RESET TOTAL: Pastikan tidak ada sisa data dari edit sebelumnya
                                    setUploadForm({
                                        id: '', title: '', ocrContent: '', fileType: '', fileSize: '',
                                        previewUrl: null, fileData: null, fileBase64: null, isProcessing: false,
                                        processingMessage: '', editMode: false, originalDoc: null
                                    });
                                    setModalTab('upload');
                                    setIsModalOpen(true);
                                }}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all hover:scale-105"
                            >
                                <UploadCloud size={18} /> Upload
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* HISTORY PANEL */}
            {showHistory && (
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4 animate-in slide-in-from-top-2">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><History size={18} /> Riwayat Aktivitas Dokumen</h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                        {docLogs.slice(0, 20).map(log => (
                            <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-100 dark:border-slate-800">
                                <div className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm">
                                    <User size={14} className="text-indigo-500" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between">
                                        <span className="font-bold text-sm dark:text-white">{log.user}</span>
                                        <span className="text-xs text-gray-400 flex items-center gap-1"><Clock size={12} /> {new Date(log.timestamp).toLocaleString()}</span>
                                    </div>
                                    <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">{log.action}</p>
                                    <p className="text-sm text-gray-600 dark:text-slate-300">{log.details}</p>
                                </div>
                            </div>
                        ))}
                        {docLogs.length === 0 && <p className="text-center text-gray-400 italic py-4">Belum ada riwayat aktivitas.</p>}
                    </div>
                </div>
            )}

            {/* FOLDERS SECTION */}
            <div>
                {(folders || []).some(f => (String(f.parentId) === String(currentFolderId) || (!f.parentId && currentFolderId === null)) && f.name.toLowerCase().includes(searchQuery.toLowerCase())) && (
                    <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">Folders</h3>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                    {(folders || []).filter(f => {
                        // 1. Structure filter
                        const structureMatch = (String(f.parentId) === String(currentFolderId) || (!f.parentId && currentFolderId === null));
                        // 2. Search filter
                        const searchMatch = f.name.toLowerCase().includes(searchQuery.toLowerCase());

                        // 3. Permission Filter
                        let accessMatch = true;
                        if (currentUser?.role === 'admin') {
                            accessMatch = true;
                        } else if (f.privacy === 'private') {
                            accessMatch = f.owner === currentUser?.name || f.owner === currentUser?.username;
                        } else if (f.privacy === 'dept') {
                            accessMatch = (f.allowedDepts || []).includes(currentUser?.department) || f.owner === currentUser?.name;
                        } else if (f.privacy === 'user') {
                            accessMatch = (f.allowedUsers || []).includes(currentUser?.username) || f.owner === currentUser?.name;
                        }

                        return structureMatch && searchMatch && accessMatch;
                    }).map(folder => (
                        <div key={folder.id}
                            onClick={() => navigateFolder(folder.id)}
                            className={`group relative flex flex-col items-center p-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/10 hover:border-indigo-200 dark:hover:border-indigo-800 cursor-pointer transition-all shadow-sm aspect-[1/1.1] ${activeFolderMenuId === folder.id ? 'z-[120] ring-2 ring-indigo-500 shadow-2xl scale-[1.02]' : 'z-10'}`}
                        >
                            <div className="flex-1 flex items-center justify-center w-full relative">
                                <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <FolderOpen size={36} fill="currentColor" className="opacity-80" />
                                </div>
                                {/* Privacy Indicator Badge */}
                                {folder.privacy !== 'public' && (
                                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center border border-gray-200 dark:border-slate-700 shadow-sm" title={folder.privacy === 'private' ? 'Private' : folder.privacy === 'dept' ? 'Department' : 'Specific Users'}>
                                        {folder.privacy === 'private' && <Lock size={12} className="text-red-500" />}
                                        {folder.privacy === 'dept' && <Building size={12} className="text-blue-500" />}
                                        {folder.privacy === 'user' && <User size={12} className="text-purple-500" />}
                                    </div>
                                )}
                            </div>
                            <div className="w-full text-center mt-3">
                                <span className="font-medium text-gray-700 dark:text-gray-200 text-sm line-clamp-2 break-words leading-tight px-1">
                                    {folder.name}
                                </span>
                                {/* Creator Info Tooltip/Text */}
                                <div className="text-[10px] text-gray-400 mt-1 truncate">
                                    Author: {folder.owner || 'Unknown'}
                                </div>
                            </div>

                            {/* Actions Overlay - Minimalist Dropdown */}
                            <div className="absolute top-2 right-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveFolderMenuId(activeFolderMenuId === folder.id ? null : folder.id);
                                    }}
                                    className="p-1.5 bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700 text-gray-500 hover:text-indigo-600 rounded-full transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <MoreVertical size={16} />
                                </button>

                                {activeFolderMenuId === folder.id && (
                                    <div
                                        className={`absolute left-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 z-[130] overflow-hidden animate-in zoom-in-95 slide-in-from-top-2 duration-200 origin-top-left`}
                                    >
                                        <div className="py-1">
                                            {hasPermission('documents', 'create') && (
                                                <button onClick={(e) => { e.stopPropagation(); startMgmtOp('copy', 'folder', folder); setActiveFolderMenuId(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2">
                                                    <Copy size={14} /> Salin
                                                </button>
                                            )}
                                            {hasPermission('documents', 'edit') && (
                                                <>
                                                    <button onClick={(e) => { e.stopPropagation(); startMgmtOp('move', 'folder', folder); setActiveFolderMenuId(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2">
                                                        <Move size={14} /> Pindah
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setFolderForm({
                                                                id: folder.id,
                                                                name: folder.name,
                                                                privacy: folder.privacy || 'public',
                                                                allowedDepts: folder.allowedDepts || [],
                                                                allowedUsers: folder.allowedUsers || []
                                                            });
                                                            setIsFolderModalOpen(true);
                                                            setActiveFolderMenuId(null);
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                                    >
                                                        <PenLine size={14} /> Edit
                                                    </button>
                                                </>
                                            )}
                                            {hasPermission('documents', 'delete') && (
                                                <>
                                                    <div className="h-px bg-gray-100 dark:bg-slate-800 my-1" />
                                                    <button
                                                        onClick={(e) => { handleDeleteFolder(e, folder.id); setActiveFolderMenuId(null); }}
                                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2"
                                                    >
                                                        <Trash2 size={14} /> Hapus
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* DOCUMENTS LIST */}
            <div>
                {(docList || []).some(d => {
                    const matchesSearch = (d.title.toLowerCase().includes(searchQuery.toLowerCase()) || (d.ocrContent || '').toLowerCase().includes(searchQuery.toLowerCase()));
                    if (searchQuery) return matchesSearch;
                    return (d.folderId === currentFolderId || (!d.folderId && currentFolderId === null));
                }) && (
                        <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider mt-6">Files</h3>
                    )}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {(docList || []).filter(d => {
                        const matchesSearch = (d.title.toLowerCase().includes(searchQuery.toLowerCase()) || (d.ocrContent || '').toLowerCase().includes(searchQuery.toLowerCase()));
                        if (searchQuery) return matchesSearch; // Global search
                        return (String(d.folderId) === String(currentFolderId) || (!d.folderId && currentFolderId === null));
                    }).map((doc) => {
                        const isContentMatch = (doc.ocrContent || '').toLowerCase().includes(searchQuery.toLowerCase()) && searchQuery.length > 0;

                        return (
                            <div key={doc.id} className={`group relative flex flex-col p-4 glass-card rounded-2xl transition-all h-full ${selectedDocIds.has(doc.id) ? 'ring-2 ring-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20' : ''} ${activeMenuId === doc.id ? 'z-[120] ring-2 ring-indigo-500 shadow-2xl scale-[1.02]' : 'z-10'}`}>
                                {/* Selection Checkbox */}
                                {hasPermission('documents', 'delete') && (
                                    <div className={`absolute top-3 left-3 z-30 ${selectedDocIds.has(doc.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                                        <input
                                            type="checkbox"
                                            checked={selectedDocIds.has(doc.id)}
                                            onChange={(e) => { e.stopPropagation(); toggleDocSelection(doc.id); }}
                                            className="w-5 h-5 rounded-md border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shadow-sm"
                                        />
                                    </div>
                                )}
                                {/* Actions Overlay */}
                                { /* Minimalist Action Menu */}
                                <div className="absolute top-2 right-2 z-20">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuId(activeMenuId === doc.id ? null : doc.id);
                                        }}
                                        className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                                    >
                                        <MoreVertical size={16} />
                                    </button>

                                    { /* Dropdown Menu */}
                                    {activeMenuId === doc.id && (
                                        <div
                                            className={`absolute left-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 z-[130] overflow-hidden animate-in zoom-in-95 slide-in-from-top-2 duration-200 origin-top-left`}
                                        >
                                            <div className="py-1">
                                                <button onClick={(e) => { e.stopPropagation(); handleViewDoc(doc); setActiveMenuId(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2">
                                                    <Eye size={14} className="text-blue-500" /> Lihat Detail
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDownload(doc); setActiveMenuId(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2">
                                                    <Download size={14} className="text-green-500" /> Download
                                                </button>
                                                <div className="h-px bg-gray-100 dark:bg-slate-800 my-1" />

                                                {hasPermission('documents', 'create') && (
                                                    <button onClick={(e) => { e.stopPropagation(); startMgmtOp('copy', 'file', doc); setActiveMenuId(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2">
                                                        <Copy size={14} /> Salin
                                                    </button>
                                                )}
                                                {hasPermission('documents', 'edit') && (
                                                    <>
                                                        <button onClick={(e) => { e.stopPropagation(); startMgmtOp('move', 'file', doc); setActiveMenuId(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2">
                                                            <Move size={14} /> Pindah
                                                        </button>
                                                        <button onClick={(e) => { handleRenameDoc(e, doc); setActiveMenuId(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2">
                                                            <PenLine size={14} /> Ganti Nama
                                                        </button>
                                                        <button onClick={(e) => { handleEditDoc(e, doc); setActiveMenuId(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2">
                                                            <UploadCloud size={14} /> Update File
                                                        </button>
                                                    </>
                                                )}
                                                {hasPermission('documents', 'delete') && (
                                                    <>
                                                        <div className="h-px bg-gray-100 dark:bg-slate-800 my-1" />
                                                        <button onClick={(e) => { handleDeleteDoc(e, doc.id); setActiveMenuId(null); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2">
                                                            <Trash2 size={14} /> Hapus
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Quick Actions (Hover Only) */}
                                <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 z-10">
                                    <button onClick={(e) => { e.stopPropagation(); handleViewDoc(doc); }} className="p-2 bg-white dark:bg-slate-800 text-gray-500 hover:text-blue-600 rounded-full shadow-md border border-gray-100 dark:border-slate-700" title="Lihat">
                                        <Eye size={16} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDownload(doc); }} className="p-2 bg-white dark:bg-slate-800 text-gray-500 hover:text-green-600 rounded-full shadow-md border border-gray-100 dark:border-slate-700" title="Download">
                                        <Download size={16} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-center py-4 mb-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                                    {doc.type && doc.type.includes('pdf') ?
                                        <FileDigit size={40} className="text-red-500 drop-shadow-sm" strokeWidth={1.5} /> :
                                        doc.type && doc.type.includes('image') ?
                                            <Image size={40} className="text-purple-500 drop-shadow-sm" strokeWidth={1.5} /> :
                                            <File size={40} className="text-blue-500 drop-shadow-sm" strokeWidth={1.5} />
                                    }
                                </div>

                                <div className="flex-1 w-full">
                                    <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm line-clamp-2 leading-snug mb-2 break-words" title={doc.title}>
                                        {doc.title}
                                    </h3>

                                    <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-slate-500 mt-auto">
                                        <span className="font-mono bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{doc.size}</span>
                                        <span className="font-bold text-indigo-500">v{doc.version}</span>
                                    </div>

                                    {searchQuery && (
                                        <div className="mt-1 text-[10px] text-gray-400 flex items-center gap-1">
                                            <FolderOpen size={10} />
                                            <span className="truncate max-w-[100px]">{(folders || []).find(f => f.id === doc.folderId)?.name || 'Root'}</span>
                                        </div>
                                    )}

                                    {isContentMatch && (
                                        <div className="mt-2 p-1.5 bg-yellow-50 dark:bg-yellow-900/10 rounded border border-yellow-100 dark:border-yellow-900/20 text-[10px] text-gray-600 dark:text-slate-300">
                                            <span className="flex items-center gap-1 font-bold text-yellow-700 dark:text-yellow-500 mb-0.5"><Highlighter size={10} /> Match:</span>
                                            <p className="line-clamp-2 italic leading-tight opacity-90">"{getSearchSnippet(doc.ocrContent, searchQuery)}"</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* MANAGEMENT MODAL (COPY/MOVE) */}
            <Modal
                isOpen={isMgmtModalOpen}
                onClose={() => setIsMgmtModalOpen(false)}
                title={mgmtOp?.type === 'copy' ? 'Salin Dokumen' : 'Pindah Dokumen'}
                size="max-w-md"
            >
                <div className="flex flex-col relative">
                    <div className="mb-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2.5 rounded-2xl ${mgmtOp?.type === 'copy' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                {mgmtOp?.type === 'copy' ? <Copy size={20} /> : <Move size={20} />}
                            </div>
                            <div>
                                <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tight">
                                    {mgmtOp?.type === 'copy' ? 'Salin' : 'Pindah'} <span className="opacity-50">{mgmtOp?.itemType === 'file' ? 'File' : 'Folder'}</span>
                                </h4>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilih Folder Tujuan</p>
                            </div>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <p className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate">
                                "{mgmtOp?.item?.title || mgmtOp?.item?.name}"
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2 mb-6 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
                        <button
                            onClick={() => performCopyMove(null)}
                            className="w-full flex items-center gap-3 px-4 py-3 bg-white/40 dark:bg-slate-800/40 hover:bg-white/80 dark:hover:bg-slate-800 hover:shadow-lg hover:scale-[1.02] border border-transparent hover:border-indigo-200 transition-all rounded-2xl group"
                        >
                            <div className="p-2.5 bg-slate-100 dark:bg-slate-700/50 rounded-xl group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 text-slate-500 group-hover:text-indigo-600 transition-colors">
                                <HardDrive size={20} />
                            </div>
                            <span className="font-bold text-slate-700 dark:text-slate-200">Semua Dokumen (Root)</span>
                        </button>

                        {folders.filter(f => mgmtOp?.item && String(f.id) !== String(mgmtOp.item.id)).map(folder => (
                            <button
                                key={folder.id}
                                onClick={() => performCopyMove(folder.id)}
                                className="w-full flex items-center gap-3 px-4 py-3 bg-white/40 dark:bg-slate-800/40 hover:bg-white/80 dark:hover:bg-slate-800 hover:shadow-lg hover:scale-[1.02] border border-transparent hover:border-amber-200 transition-all rounded-2xl group"
                            >
                                <div className="p-2.5 bg-amber-50 dark:bg-amber-900/10 rounded-xl group-hover:bg-amber-100 dark:group-hover:bg-amber-900/30 text-amber-500/70 group-hover:text-amber-600 transition-colors">
                                    <FolderOpen size={20} fill="currentColor" className="opacity-80" />
                                </div>
                                <div className="text-left">
                                    <span className="font-bold text-slate-700 dark:text-slate-200 block">{folder.name}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">ID: {folder.id}</span>
                                </div>
                            </button>
                        ))}
                    </div>

                    {isExecutingOp && (
                        <div className="pt-4 border-t border-white/20 dark:border-white/5">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2 px-1">
                                <span className="text-indigo-600 animate-pulse">Menghubungkan...</span>
                                <span className="text-slate-500">{opProgress}%</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div
                                    className="bg-indigo-600 h-full transition-all duration-300 ease-out shadow-[0_0_15px_rgba(79,70,229,0.5)]"
                                    style={{ width: `${opProgress}%` }}
                                ></div>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            {/* FOLDER MODAL */}
            <Modal
                isOpen={isFolderModalOpen}
                onClose={() => setIsFolderModalOpen(false)}
                title={folderForm.id ? 'Edit Konfigurasi Folder' : 'Buat Folder Baru'}
                size="max-w-md"
            >
                <div className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-widest ml-1">Nama Folder</label>
                        <input
                            value={folderForm.name}
                            onChange={(e) => setFolderForm({ ...folderForm, name: e.target.value })}
                            className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:border-indigo-500 transition-all outline-none dark:text-white font-black"
                            placeholder="Contoh: Laporan Keuangan"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-widest ml-1">Privasi & Akses Kontrol</label>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { id: 'public', label: 'Umum', icon: Users, desc: 'Akses Publik' },
                                { id: 'private', label: 'Pribadi', icon: Lock, desc: 'Akses Terbatas' },
                                { id: 'dept', label: 'Unit Kerja', icon: Building, desc: 'Departemen' },
                                { id: 'user', label: 'Spesifik', icon: User, desc: 'User Terpilih' }
                            ].map(type => (
                                <button
                                    key={type.id}
                                    onClick={() => setFolderForm({ ...folderForm, privacy: type.id })}
                                    className={`p-4 rounded-3xl border-2 text-left transition-all relative overflow-hidden group/btn ${folderForm.privacy === type.id
                                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 shadow-lg scale-[1.02]'
                                        : 'border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-800/30 hover:border-indigo-300'
                                        }`}
                                >
                                    <div className="flex items-center gap-2 mb-1 relative z-10">
                                        <type.icon size={18} className={folderForm.privacy === type.id ? 'text-indigo-600' : 'text-slate-400'} />
                                        <span className={`text-xs font-black uppercase tracking-tight ${folderForm.privacy === type.id ? 'text-indigo-950 dark:text-indigo-100' : 'text-slate-600 dark:text-slate-300'}`}>{type.label}</span>
                                    </div>
                                    <p className={`text-[9px] font-bold uppercase tracking-widest relative z-10 ${folderForm.privacy === type.id ? 'text-indigo-600/70 dark:text-indigo-400/80' : 'text-slate-400'}`}>{type.desc}</p>

                                    {folderForm.privacy === type.id && (
                                        <div className="absolute top-0 right-0 w-12 h-12 bg-indigo-500/10 rounded-full -mr-6 -mt-6 blur-xl"></div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Conditional Inputs */}
                    {folderForm.privacy === 'dept' && (
                        <div className="p-5 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-[2rem] border border-indigo-100 dark:border-indigo-800/50 animate-in slide-in-from-top-2">
                            <label className="block text-[10px] font-black text-indigo-700 dark:text-indigo-300 mb-3 uppercase tracking-widest">Pilih Departemen Terdaftar</label>
                            <div className="max-h-40 overflow-y-auto pr-2 custom-scrollbar space-y-1.5">
                                {(departments || []).map(dept => (
                                    <label key={dept.id} className="flex items-center gap-3 p-3 bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 rounded-2xl cursor-pointer transition-all border border-transparent hover:border-indigo-200">
                                        <input
                                            type="checkbox"
                                            checked={folderForm.allowedDepts.includes(dept.name)}
                                            onChange={(e) => {
                                                const newDepts = e.target.checked
                                                    ? [...folderForm.allowedDepts, dept.name]
                                                    : folderForm.allowedDepts.filter(d => d !== dept.name);
                                                setFolderForm({ ...folderForm, allowedDepts: newDepts });
                                            }}
                                            className="w-5 h-5 rounded-lg text-indigo-600 focus:ring-indigo-500 border-indigo-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                        />
                                        <span className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">{dept.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {folderForm.privacy === 'user' && (
                        <div className="p-5 bg-purple-50/50 dark:bg-purple-900/20 rounded-[2rem] border border-purple-100 dark:border-purple-800/50 animate-in slide-in-from-top-2">
                            <label className="block text-[10px] font-black text-purple-700 dark:text-purple-300 mb-3 uppercase tracking-widest">Akses Pengguna Spesifik</label>
                            <div className="max-h-40 overflow-y-auto pr-2 custom-scrollbar space-y-1.5">
                                {(users || []).filter(u => u.username !== currentUser?.username).map(user => (
                                    <label key={user.id} className="flex items-center gap-3 p-3 bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 rounded-2xl cursor-pointer transition-all border border-transparent hover:border-purple-200">
                                        <input
                                            type="checkbox"
                                            checked={folderForm.allowedUsers.includes(user.username)}
                                            onChange={(e) => {
                                                const newUsers = e.target.checked
                                                    ? [...folderForm.allowedUsers, user.username]
                                                    : folderForm.allowedUsers.filter(u => u !== user.username);
                                                setFolderForm({ ...folderForm, allowedUsers: newUsers });
                                            }}
                                            className="w-5 h-5 rounded-lg text-purple-600 focus:ring-purple-500 border-purple-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                        />
                                        <div className="text-left leading-tight">
                                            <span className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight block">{user.name}</span>
                                            <span className="text-[10px] text-purple-600/70 font-bold">{user.department}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-6 border-t border-slate-100 dark:border-slate-800 mt-2">
                        <button onClick={() => setIsFolderModalOpen(false)} className="flex-1 py-4 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white text-xs font-black uppercase tracking-widest transition-all">Batalkan</button>
                        <button
                            onClick={() => {
                                if (folderForm.id) {
                                    handleEditFolder(null, { id: folderForm.id }, folderForm);
                                } else {
                                    handleCreateFolder(folderForm);
                                }
                                setIsFolderModalOpen(false);
                            }}
                            disabled={!folderForm.name}
                            className="flex-[2] py-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-black uppercase tracking-widest rounded-[1.25rem] shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {folderForm.id ? 'Simpan Perubahan' : 'Buat Folder Sekarang'}
                        </button>
                    </div>
                </div>
            </Modal>
            {/* FLOATING BULK ACTIONS BAR */}
            {
                selectedDocIds.size > 0 && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/70 dark:bg-slate-900/80 backdrop-blur-3xl shadow-2xl rounded-full px-6 py-3 flex items-center gap-4 z-50 border border-white/40 dark:border-white/10 animate-in slide-in-from-bottom-4 duration-300 ring-1 ring-black/5">
                        <span className="text-sm font-bold text-slate-700 dark:text-gray-200 pl-2 border-r border-slate-200 dark:border-slate-700 pr-5">
                            {selectedDocIds.size} file dipilih
                        </span>

                        <button
                            onClick={() => setSelectedDocIds(new Set())}
                            className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white text-sm font-medium transition-colors"
                        >
                            Batal
                        </button>

                        <button
                            onClick={handleBulkDelete}
                            disabled={isBulkDeleting}
                            className="bg-red-600 hover:bg-red-500 text-white px-5 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-red-500/30 shadow-lg transition-transform active:scale-95"
                        >
                            {isBulkDeleting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent" />
                                    Menghapus...
                                </>
                            ) : (
                                <>
                                    <Trash2 size={16} />
                                    Hapus ({selectedDocIds.size})
                                </>
                            )}
                        </button>
                    </div>
                )
            }

        </div >
    );
}
