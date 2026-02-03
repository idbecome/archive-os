import React from 'react';
import { HardDrive, ChevronRight, Search, Plus, UploadCloud, FolderOpen, Trash2, Edit3, FileDigit, FileText, Highlighter, History } from 'lucide-react';
import { SummaryCard } from '../components/ui/Card';

export default function Documents({
    docList, folders, currentFolderId, setCurrentFolderId,
    searchQuery, setSearchQuery,
    handleCreateFolder, handleDeleteFolder,
    handleViewDoc, handleEditDoc, handleDeleteDoc,
    setUploadForm, setModalTab, setIsModalOpen,
    hasPermission, docStats,
    // Helper for search snippet - better to move here or utility
    getSearchSnippet
}) {
    return (
        <div className="animate-in slide-in-from-right duration-300 space-y-6">
            {/* SUMMARY CARDS FOR DOCUMENTS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                <SummaryCard
                    title="Total Dokumen"
                    value={docList.length}
                    icon={FileText}
                    colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                />
                <SummaryCard
                    title="Total Folder"
                    value={folders.length}
                    icon={FolderOpen}
                    colorClass="bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
                />
                <SummaryCard
                    title="Total Revisi"
                    value={docStats.totalRevisions}
                    icon={History} // Make sure History is imported if used, wait, it's not imported. Fixed below.
                    colorClass="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400"
                />
            </div>

            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto">
                    <button onClick={() => setCurrentFolderId(null)} className={`p-2 rounded-lg ${currentFolderId === null ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100 text-gray-500'}`}>
                        <HardDrive size={20} />
                    </button>
                    {currentFolderId && (
                        <>
                            <ChevronRight size={16} className="text-gray-400" />
                            <span className="font-bold text-gray-700 dark:text-white">{folders.find(f => f.id === currentFolderId)?.name || 'Unknown'}</span>
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

            <div className="grid grid-cols-1 gap-4">
                {/* FOLDERS GRID */}
                {folders.filter(f => (f.parent_id === currentFolderId) && f.name.toLowerCase().includes(searchQuery.toLowerCase())).map(folder => (
                    <div key={folder.id}
                        onClick={() => setCurrentFolderId(folder.id)}
                        className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:border-indigo-500 cursor-pointer transition-all shadow-sm"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center text-amber-600">
                                <FolderOpen size={24} />
                            </div>
                            <span className="font-bold text-gray-700 dark:text-white">{folder.name}</span>
                        </div>
                        {hasPermission('documents', 'delete') && (
                            <button onClick={(e) => handleDeleteFolder(e, folder.id)} className="text-gray-400 hover:text-red-500 p-2"><Trash2 size={16} /></button>
                        )}
                    </div>
                ))}

                {/* DOCUMENTS LIST */}
                {docList.filter(d => (d.folder_id === currentFolderId || (!d.folder_id && currentFolderId === null)) && (d.title.toLowerCase().includes(searchQuery.toLowerCase()) || d.ocrContent.toLowerCase().includes(searchQuery.toLowerCase()))).map((doc) => {
                    const isContentMatch = doc.ocrContent.toLowerCase().includes(searchQuery.toLowerCase()) && searchQuery.length > 0;

                    return (
                        <div key={doc.id} onClick={() => handleViewDoc(doc)} className="group relative bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all shadow-sm cursor-pointer hover:shadow-md">
                            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                                <button onClick={(e) => handleEditDoc(e, doc)} className="p-2 bg-white dark:bg-slate-800 text-gray-400 hover:text-blue-500 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm transition-colors"><Edit3 size={16} /></button>
                                <button onClick={(e) => handleDeleteDoc(e, doc.id)} className="p-2 bg-white dark:bg-slate-800 text-gray-400 hover:text-red-500 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm transition-colors"><Trash2 size={16} /></button>
                            </div>
                            <div className="flex gap-4 items-start">
                                <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 text-slate-500 dark:text-slate-400">
                                    {doc.type && doc.type.includes('pdf') ? <FileDigit size={24} className="text-red-500" /> : <FileText size={24} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate pr-28 hover:text-blue-500">{doc.title}</h3>
                                    <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-slate-400 mt-1">
                                        <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{doc.size}</span>
                                        <span>•</span>
                                        <span>{doc.uploader}</span>
                                        <span>•</span>
                                        <span className="text-indigo-500 font-bold">v{doc.version}</span>
                                    </div>
                                    {isContentMatch ? (
                                        <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800 text-xs text-gray-600 dark:text-slate-300 font-mono flex items-start gap-2">
                                            <Highlighter size={14} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <span className="font-bold text-yellow-700 dark:text-yellow-500 block mb-1">Ditemukan di isi file:</span>
                                                "{getSearchSnippet(doc.ocrContent, searchQuery)}"
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-2 text-xs text-gray-400 line-clamp-1 italic">
                                            {doc.ocrContent.length > 50 ? doc.ocrContent.substring(0, 100) + "..." : "Konten file belum di-scan atau kosong."}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
}

