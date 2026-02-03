import React, { useState } from 'react';
import { HardDrive, ChevronRight, ChevronLeft, Search, Plus, UploadCloud, FolderOpen, Trash2, Edit3, FileDigit, FileText, Highlighter, History, PenLine, User, Clock } from 'lucide-react';
import { SummaryCard } from '../components/ui/Card';

export default function Documents({
    docList, folders, currentFolderId, setCurrentFolderId,
    searchQuery, setSearchQuery,
    handleCreateFolder, handleDeleteFolder, handleRenameFolder,
    handleViewDoc, handleEditDoc, handleDeleteDoc, handleRenameDoc,
    setUploadForm, setModalTab, setIsModalOpen,
    hasPermission, docStats,
    getSearchSnippet, logs,
    navigateFolder, navigateBack, navigateForward, folderHistory, historyIndex
}) {
    const [showHistory, setShowHistory] = useState(false);

    // Filter logs for document activities
    const docLogs = logs?.filter(l =>
        ['Upload', 'Delete', 'Rename', 'Folder', 'Revisi', 'Download'].some(k => l.action.includes(k))
    ) || [];

    return (
        <div className="animate-in slide-in-from-right duration-300 space-y-6">
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

            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
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
                    <button onClick={() => setShowHistory(!showHistory)} className={`px-3 py-2 rounded-lg border flex items-center gap-2 ${showHistory ? 'bg-indigo-100 text-indigo-600 border-indigo-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                        <History size={18} />
                    </button>
                    {hasPermission('documents', 'create') && (
                        <>
                            <button onClick={handleCreateFolder} className="px-4 py-2 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg font-medium flex items-center justify-center gap-2 transition-all">
                                <Plus size={18} /> Folder
                            </button>
                            <button
                                onClick={() => { setUploadForm(prev => ({ ...prev, id: '', title: '', editMode: false })); setModalTab('upload'); setIsModalOpen(true); }}
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
                    {(folders || []).filter(f => (String(f.parentId) === String(currentFolderId) || (!f.parentId && currentFolderId === null)) && f.name.toLowerCase().includes(searchQuery.toLowerCase())).map(folder => (
                        <div key={folder.id}
                            onClick={() => navigateFolder(folder.id)}
                            className="group relative flex flex-col items-center p-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/10 hover:border-indigo-200 dark:hover:border-indigo-800 cursor-pointer transition-all shadow-sm aspect-[1/1.1]"
                        >
                            <div className="flex-1 flex items-center justify-center w-full">
                                <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <FolderOpen size={36} fill="currentColor" className="opacity-80" />
                                </div>
                            </div>
                            <span className="font-medium text-gray-700 dark:text-gray-200 text-sm mt-3 text-center line-clamp-2 w-full break-words leading-tight px-1">
                                {folder.name}
                            </span>

                            {/* Actions Overlay */}
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {hasPermission('documents', 'edit') && (
                                    <button
                                        onClick={(e) => handleRenameFolder(e, folder)}
                                        className="p-1.5 bg-white dark:bg-slate-700 text-gray-500 hover:text-blue-600 rounded-md shadow-sm border border-gray-100 dark:border-slate-600"
                                        title="Rename"
                                    >
                                        <PenLine size={14} />
                                    </button>
                                )}
                                {hasPermission('documents', 'delete') && (
                                    <button
                                        onClick={(e) => handleDeleteFolder(e, folder.id)}
                                        className="p-1.5 bg-white dark:bg-slate-700 text-gray-500 hover:text-red-600 rounded-md shadow-sm border border-gray-100 dark:border-slate-600"
                                        title="Delete"
                                    >
                                        <Trash2 size={14} />
                                    </button>
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
                            <div key={doc.id} onClick={() => handleViewDoc(doc)} className="group relative flex flex-col p-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md cursor-pointer transition-all h-full">
                                {/* Actions Overlay */}
                                <div className="absolute top-2 right-2 flex flex-col gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-slate-900/90 rounded-lg p-1 shadow-sm backdrop-blur-sm">
                                    <button onClick={(e) => handleRenameDoc(e, doc)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-slate-800 rounded" title="Ganti Nama File (Rename)"><PenLine size={14} /></button>
                                    <button onClick={(e) => handleEditDoc(e, doc)} className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-gray-100 dark:hover:bg-slate-800 rounded" title="Update / Upload Ulang File"><UploadCloud size={14} /></button>
                                    <button onClick={(e) => handleDeleteDoc(e, doc.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-slate-800 rounded" title="Hapus File"><Trash2 size={14} /></button>
                                </div>

                                <div className="flex items-center justify-center py-4 mb-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                                    {doc.type && doc.type.includes('pdf') ?
                                        <FileDigit size={40} className="text-red-500 drop-shadow-sm" strokeWidth={1.5} /> :
                                        <FileText size={40} className="text-blue-500 drop-shadow-sm" strokeWidth={1.5} />
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
        </div>
    );
}

