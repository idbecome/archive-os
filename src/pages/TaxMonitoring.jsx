import React, { useState, useEffect } from 'react';
import { ClipboardCheck, CheckCircle2, AlertCircle, Plus, ChevronRight, FileText, UploadCloud, User, Trash2, CheckSquare, Square, File, Search, Calendar, Clock, Paperclip, Edit, MoreVertical, Download, Folder, RotateCcw, Save, X } from 'lucide-react';
import { Card, SummaryCard } from '../components/ui/Card';
import { api } from '../api';

const AUDIT_STEPS = [
    { id: 1, title: "Persiapan", description: "Pemeriksaan & Penerbitan SP2" },
    { id: 2, title: "Pemberitahuan & Pertemuan", description: "Penyampaian Surat & Pertemuan Awal" },
    { id: 3, title: "Pelaksanaan", description: "Peminjaman Dokumen & Pengujian " },
    { id: 4, title: "Penyampaian Hasil (SPHP)", description: "Penerbitan SPHP & Tanggapan" },
    { id: 5, title: "Pembahasan Akhir", description: "Closing Conference & Quality Assurance" },
    { id: 6, title: "Penetapan & Penagihan", description: "LHP & Penerbitan SKP (KB/LB/Nihil)" },
    { id: 7, title: "Jalur Sengketa", description: "Keberatan, Banding, Peninjauan Kembali" }
];

export default function TaxMonitoring({ taxAudits, hasPermission, currentUser, onRefresh }) {
    const [selectedAudit, setSelectedAudit] = useState(null);
    const [activeStep, setActiveStep] = useState(1);
    const [auditFiles, setAuditFiles] = useState([]);
    const [isLoadingFiles, setIsLoadingFiles] = useState(false);

    // Checklist Edit State
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [editingNoteText, setEditingNoteText] = useState('');
    const [editingNotePic, setEditingNotePic] = useState('');

    // Create/Edit Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingAudit, setEditingAudit] = useState(null);
    const [newAuditTitle, setNewAuditTitle] = useState('');
    const [newAuditLetter, setNewAuditLetter] = useState('');
    const [newAuditDate, setNewAuditDate] = useState(new Date().toISOString().split('T')[0]);
    const [newAuditFile, setNewAuditFile] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // List State
    const [searchQuery, setSearchQuery] = useState('');
    const [generalAttachments, setGeneralAttachments] = useState({});

    // --- EFFECT: LOAD GENERAL ATTACHMENTS ---
    useEffect(() => {
        const loadGeneralAttachments = async () => {
            try {
                const docs = await api.getDocuments({ stepIndex: 0 });
                if (Array.isArray(docs)) {
                    const map = {};
                    docs.forEach(d => { if (d.auditId) map[d.auditId] = d; });
                    setGeneralAttachments(map);
                }
            } catch (e) {
                console.error("Failed to load attachments", e);
            }
        };
        loadGeneralAttachments();
    }, [taxAudits]);

    useEffect(() => {
        if (selectedAudit && activeStep) {
            loadFiles(selectedAudit);
        }
    }, [selectedAudit, activeStep]);

    const loadFiles = async (audit) => {
        setIsLoadingFiles(true);
        try {
            let folderId = null;
            try {
                const folders = await api.getFolders();
                const folderName = `Pemeriksaan - ${audit.title}`;
                const target = folders.find(f => f.name.toLowerCase() === folderName.toLowerCase());
                if (target) folderId = target.id;
            } catch (e) { console.error("Folder lookup error", e); }

            const params = { stepIndex: activeStep, auditId: audit.id };
            if (folderId) params.folderId = folderId;

            const files = await api.getDocuments(params);
            setAuditFiles(Array.isArray(files) ? files : []);
        } catch (error) {
            console.error("Failed to load files", error);
            setAuditFiles([]);
        } finally {
            setIsLoadingFiles(false);
        }
    };

    const getOrCreateAuditFolder = async (auditTitle) => {
        const folderName = `Pemeriksaan - ${auditTitle}`;
        try {
            const folders = await api.getFolders();
            const existing = folders.find(f => f.name.trim().toLowerCase() === folderName.trim().toLowerCase());
            if (existing) return existing.id;

            const res = await api.createFolder({
                name: folderName,
                parentId: null,
                privacy: 'public',
                owner: currentUser?.name || 'System'
            });
            if (res && res.id) return res.id;
            const freshFolders = await api.getFolders();
            return freshFolders.find(f => f.name === folderName)?.id || null;
        } catch (e) {
            console.error("Folder creation failed", e);
            return null;
        }
    };

    const handleSecureDownload = (file) => {
        const link = document.createElement('a');
        link.href = file.fileData || file.url;
        link.download = file.title || 'download';
        if (!file.fileData && file.url) {
            link.target = '_blank';
        }
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- ACTIONS: AUDIT CRUD ---
    const openCreateModal = () => {
        setEditingAudit(null);
        setNewAuditTitle('');
        setNewAuditLetter('');
        setNewAuditDate(new Date().toISOString().split('T')[0]);
        setNewAuditFile(null);
        setIsCreateModalOpen(true);
    };

    const openEditModal = (audit) => {
        setEditingAudit(audit);
        setNewAuditTitle(audit.title || '');
        setNewAuditLetter(audit.letterNumber || '');
        setNewAuditDate(audit.startDate ? new Date(audit.startDate).toISOString().split('T')[0] : '');
        setNewAuditFile(null);
        setIsCreateModalOpen(true);
    };

    const handleSaveAudit = async () => {
        if (!newAuditTitle.trim()) { alert("Judul Pemeriksaan wajib diisi!"); return; }
        setIsSaving(true);

        try {
            // Defensive mapping to ensure values are sent
            const payload_letterNumber = String(newAuditLetter || '').trim();
            const payload_startDate = String(newAuditDate || '').trim() || null;

            if (editingAudit) {
                const updatedAudit = {
                    ...editingAudit,
                    title: newAuditTitle,
                    letterNumber: payload_letterNumber,
                    startDate: payload_startDate
                };
                await api.updateTaxAudit(updatedAudit.id, updatedAudit);
                if (selectedAudit && selectedAudit.id === editingAudit.id) {
                    setSelectedAudit({ ...selectedAudit, ...updatedAudit });
                }
            } else {
                const auditId = String(Date.now());
                const newAudit = {
                    id: auditId,
                    title: newAuditTitle,
                    status: 'On Progress',
                    currentStep: 1,
                    letterNumber: payload_letterNumber,
                    startDate: payload_startDate,
                    steps: Array(7).fill({ notes: [], status: 'Pending', startDate: null, endDate: null }).map((s, i) => i === 0 ? { ...s, status: 'On Progress', startDate: payload_startDate } : s)
                };

                await api.createTaxAudit(newAudit);

                if (newAuditFile) {
                    const folderId = await getOrCreateAuditFolder(newAuditTitle);
                    const reader = new FileReader();
                    reader.readAsDataURL(newAuditFile);
                    reader.onload = async (e) => {
                        const base64 = e.target.result;
                        const doc = {
                            id: String(Date.now() + 1),
                            title: newAuditFile.name,
                            type: newAuditFile.type,
                            size: (newAuditFile.size / 1024).toFixed(1) + ' KB',
                            uploadDate: new Date().toISOString(),
                            auditId: auditId,
                            stepIndex: 0,
                            fileData: base64,
                            folderId: folderId,
                            department: 'Tax',
                            owner: currentUser?.name || 'Admin',
                            ocrContent: 'Initial attachment'
                        };
                        try {
                            await api.createDocument(doc);
                        } catch (docErr) {
                            console.error("Failed to upload attachment", docErr);
                        }
                        if (onRefresh) onRefresh();
                    };
                } else {
                    if (onRefresh) onRefresh();
                }
            }

            setIsCreateModalOpen(false);
            setNewAuditTitle('');
            setNewAuditLetter('');
            setNewAuditFile(null);
            setIsSaving(false);
            if (!newAuditFile && onRefresh) onRefresh();
        } catch (e) {
            alert('Gagal menyimpan: ' + e.message);
            setIsSaving(false);
        }
    };

    const handleDeleteAudit = async (id, e) => {
        e.stopPropagation();
        if (!confirm("Hapus pemeriksaan ini beserta seluruh datanya?")) return;
        try {
            await api.deleteTaxAudit(id);
            if (onRefresh) onRefresh();
        } catch (e) {
            alert('Gagal menghapus: ' + e.message);
        }
    };

    const handleFinishStep = async () => {
        if (!selectedAudit) return;
        const updatedSteps = [...selectedAudit.steps];
        const stepData = updatedSteps[activeStep - 1];
        if (stepData.status === 'Done') return;

        stepData.status = 'Done';
        stepData.endDate = new Date().toISOString();

        if (activeStep < 7) {
            updatedSteps[activeStep].status = 'On Progress';
            updatedSteps[activeStep].startDate = new Date().toISOString();
            updatedSteps[activeStep].notes = updatedSteps[activeStep].notes || [];

            const updatedAudit = { ...selectedAudit, steps: updatedSteps, currentStep: activeStep + 1 };
            if (activeStep + 1 === 7 && updatedSteps[6].status === 'Done') updatedAudit.status = 'Done';
            setSelectedAudit(updatedAudit);
            await api.updateTaxAudit(selectedAudit.id, updatedAudit);
            if (onRefresh) onRefresh();
        } else {
            const updatedAudit = { ...selectedAudit, steps: updatedSteps, status: 'Done' };
            setSelectedAudit(updatedAudit);
            await api.updateTaxAudit(selectedAudit.id, updatedAudit);
            if (onRefresh) onRefresh();
        }
    };

    const handleSendbackStep = async () => {
        if (!selectedAudit) return;
        if (!confirm("Batalkan status selesai untuk tahap ini? Tahap berikutnya akan kembali ke status Pending.")) return;

        const updatedSteps = [...selectedAudit.steps];
        const currentData = updatedSteps[activeStep - 1];

        // Revert current step to On Progress
        currentData.status = 'On Progress';
        currentData.endDate = null;

        // Reset all subsequent steps to Pending
        for (let i = activeStep; i < updatedSteps.length; i++) {
            updatedSteps[i].status = 'Pending';
            updatedSteps[i].startDate = null;
            updatedSteps[i].endDate = null;
        }

        const updatedAudit = {
            ...selectedAudit,
            steps: updatedSteps,
            currentStep: activeStep,
            status: 'On Progress' // If it was Done, revert to On Progress
        };

        setSelectedAudit(updatedAudit);
        await api.updateTaxAudit(selectedAudit.id, updatedAudit);
        if (onRefresh) onRefresh();
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !selectedAudit) return;
        const folderId = await getOrCreateAuditFolder(selectedAudit.title);
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const newDoc = {
                id: String(Date.now()),
                title: file.name,
                type: file.type,
                size: (file.size / 1024).toFixed(1) + ' KB',
                uploadDate: new Date().toISOString(),
                auditId: selectedAudit.id,
                stepIndex: activeStep,
                fileData: ev.target.result,
                folderId: folderId,
                department: 'Tax',
                owner: currentUser?.name || 'Tax Team'
            };
            try {
                await api.createDocument(newDoc);
                loadFiles(selectedAudit);
                if (onRefresh) onRefresh();
            }
            catch (err) { alert('Upload failed: ' + err.message); }
        };
        reader.readAsDataURL(file);
    };

    const handleDeleteFile = async (docId) => {
        if (!confirm("Hapus dokumen ini?")) return;
        try {
            await api.deleteDocument(docId);
            loadFiles(selectedAudit);
            if (onRefresh) onRefresh();
        } catch (e) {
            alert("Gagal menghapus file: " + e.message);
        }
    };

    const handleToggleCheck = async (noteId) => {
        const updatedSteps = [...selectedAudit.steps];
        const currentData = updatedSteps[activeStep - 1];
        currentData.notes = currentData.notes.map(n => n.id === noteId ? { ...n, isChecked: !n.isChecked } : n);
        const updatedAudit = { ...selectedAudit, steps: updatedSteps };
        setSelectedAudit(updatedAudit);
        await api.updateTaxAudit(selectedAudit.id, updatedAudit);
    };

    const handleAddNote = async (text, pic) => {
        if (!text) return;
        const updatedSteps = [...selectedAudit.steps];
        if (!updatedSteps[activeStep - 1]) updatedSteps[activeStep - 1] = { notes: [] };
        updatedSteps[activeStep - 1].notes.push({ id: Date.now().toString(), text, pic: pic || 'Unassigned', isChecked: false });
        const updatedAudit = { ...selectedAudit, steps: updatedSteps };
        setSelectedAudit(updatedAudit);
        await api.updateTaxAudit(selectedAudit.id, updatedAudit);
    };

    const handleDeleteNote = async (noteId) => {
        const updatedSteps = [...selectedAudit.steps];
        updatedSteps[activeStep - 1].notes = updatedSteps[activeStep - 1].notes.filter(n => n.id !== noteId);
        const updatedAudit = { ...selectedAudit, steps: updatedSteps };
        setSelectedAudit(updatedAudit);
        await api.updateTaxAudit(selectedAudit.id, updatedAudit);
    };

    const handleUpdateNote = async (noteId) => {
        if (!editingNoteText.trim()) return;
        const updatedSteps = [...selectedAudit.steps];
        const currentData = updatedSteps[activeStep - 1];
        currentData.notes = currentData.notes.map(n =>
            n.id === noteId ? { ...n, text: editingNoteText, pic: editingNotePic } : n
        );
        const updatedAudit = { ...selectedAudit, steps: updatedSteps };
        setSelectedAudit(updatedAudit);
        await api.updateTaxAudit(selectedAudit.id, updatedAudit);
        setEditingNoteId(null);
        setEditingNoteText('');
        setEditingNotePic('');
    };

    const getDuration = (start, end) => {
        if (!start) return '-';
        const s = new Date(start);
        const e = end ? new Date(end) : new Date();
        const diffTime = Math.abs(e - s);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + ' Hari';
    };

    const filteredAudits = (taxAudits || []).filter(t =>
        (t.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.letterNumber || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {!selectedAudit ? (
                <div className="space-y-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                            placeholder="Cari No Surat, Nama WP, atau Judul Pemeriksaan..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <SummaryCard title="Total Pemeriksaan" value={taxAudits.length} icon={ClipboardCheck} colorClass="bg-indigo-100 text-indigo-600" />
                    <Card>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg dark:text-white">Daftar Pemeriksaan</h3>
                            {hasPermission('tax-monitoring', 'create') && (
                                <button onClick={openCreateModal} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm flex items-center gap-2 hover:bg-indigo-700">
                                    <Plus size={16} /> Baru
                                </button>
                            )}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300">
                                    <tr>
                                        <th className="px-6 py-3">No Surat & Tanggal</th>
                                        <th className="px-6 py-3">Judul</th>
                                        <th className="px-6 py-3">Lampiran</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3">Progress</th>
                                        <th className="text-right px-6 py-3">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAudits.map(audit => {
                                        let stepsArray = [];
                                        if (Array.isArray(audit.steps)) {
                                            stepsArray = audit.steps;
                                        } else if (typeof audit.steps === 'string') {
                                            try { stepsArray = JSON.parse(audit.steps); } catch (e) { stepsArray = []; }
                                        }

                                        const doneSteps = stepsArray.filter(s => s.status === 'Done').length;
                                        const percent = Math.round((doneSteps / 7) * 100);
                                        const attachment = generalAttachments[audit.id];
                                        return (
                                            <tr key={audit.id} className="border-b dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-gray-800 dark:text-gray-200">{audit.letterNumber || '-'}</div>
                                                    <div className="text-xs text-gray-400 mt-1 flex items-center gap-1"><Calendar size={10} /> {audit.startDate ? new Date(audit.startDate).toLocaleDateString() : '-'}</div>
                                                </td>
                                                <td className="px-6 py-4 font-medium dark:text-white">{audit.title}</td>
                                                <td className="px-6 py-4">
                                                    {attachment ? (
                                                        <button onClick={() => handleSecureDownload(attachment)} className="flex items-center gap-1 text-blue-600 hover:underline text-xs" title={attachment.title}>
                                                            <Paperclip size={14} /> Lihat
                                                        </button>
                                                    ) : <span className="text-gray-400 text-xs">-</span>}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${audit.status === 'Done' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{audit.status}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="w-24 bg-gray-200 rounded-full h-1.5 dark:bg-gray-700 relative">
                                                        <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${percent}%` }}></div>
                                                    </div>
                                                    <span className="text-[10px] text-gray-500 mt-1 block">{percent}%</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => {
                                                                const auditWithSteps = { ...audit };
                                                                if (typeof audit.steps === 'string') {
                                                                    try { auditWithSteps.steps = JSON.parse(audit.steps); } catch (e) { auditWithSteps.steps = []; }
                                                                }
                                                                setSelectedAudit(auditWithSteps);
                                                            }}
                                                            className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors"
                                                            title="Detail"
                                                        >
                                                            <FileText size={16} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const auditWithSteps = { ...audit };
                                                                if (typeof audit.steps === 'string') {
                                                                    try { auditWithSteps.steps = JSON.parse(audit.steps); } catch (e) { auditWithSteps.steps = []; }
                                                                }
                                                                openEditModal(auditWithSteps);
                                                            }}
                                                            className={`p-1.5 rounded-lg transition-colors ${hasPermission('tax-monitoring', 'edit') ? 'hover:bg-gray-100 text-gray-500' : 'opacity-30 cursor-not-allowed text-gray-300'}`}
                                                            title="Edit"
                                                            disabled={!hasPermission('tax-monitoring', 'edit')}
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                        {hasPermission('tax-monitoring', 'delete') && (
                                                            <button onClick={(e) => handleDeleteAudit(audit.id, e)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors" title="Delete">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            ) : (
                <div className="space-y-6">
                    <button onClick={() => setSelectedAudit(null)} className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 mb-4 transition-colors">
                        &larr; Kembali ke Daftar
                    </button>
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{selectedAudit.title}</h2>
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                    <span className="flex items-center gap-1"><FileText size={14} /> {selectedAudit.letterNumber || 'No Surat -'}</span>
                                    <span className="flex items-center gap-1"><Calendar size={14} /> Mulai: {selectedAudit.startDate ? new Date(selectedAudit.startDate).toLocaleDateString() : '-'}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${selectedAudit.status === 'Done' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{selectedAudit.status}</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <div className="text-right">
                                    <p className="text-xs text-gray-500 mb-1">Durasi Total</p>
                                    <p className="font-bold text-xl text-indigo-600 dark:text-indigo-400">{getDuration(selectedAudit.startDate, selectedAudit.status === 'Done' ? null : new Date())}</p>
                                </div>
                                {hasPermission('tax-monitoring', 'edit') && (
                                    <button onClick={() => openEditModal(selectedAudit)} className="text-xs text-indigo-600 hover:underline flex items-center gap-1"><Edit size={12} /> Edit Detail</button>
                                )}
                            </div>
                        </div>
                        <div className="mb-2">
                            <div className="flex justify-between items-center text-sm mb-1">
                                <span className="font-semibold text-gray-700 dark:text-gray-300">Overall Progress</span>
                                <span className="text-indigo-600 font-bold">
                                    {(() => {
                                        const steps = Array.isArray(selectedAudit.steps) ? selectedAudit.steps :
                                            (typeof selectedAudit.steps === 'string' ? JSON.parse(selectedAudit.steps || '[]') : []);
                                        const done = steps.filter(s => s.status === 'Done').length;
                                        return Math.round((done / 7) * 100);
                                    })()}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700 overflow-hidden">
                                <div
                                    className="bg-indigo-600 h-3 rounded-full transition-all duration-500 ease-out"
                                    style={{
                                        width: `${(() => {
                                            const steps = Array.isArray(selectedAudit.steps) ? selectedAudit.steps :
                                                (typeof selectedAudit.steps === 'string' ? JSON.parse(selectedAudit.steps || '[]') : []);
                                            const done = steps.filter(s => s.status === 'Done').length;
                                            return Math.round((done / 7) * 100);
                                        })()}%`
                                    }}
                                ></div>
                            </div>
                        </div>
                    </div>
                    {/* Stepper & Detail Content (Collapsed for brevity but presumed same) */}
                    <div className="overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
                        <div className="flex gap-2 min-w-max">
                            {AUDIT_STEPS.map((step) => {
                                const sData = selectedAudit.steps?.[step.id - 1] || {};
                                const isActive = activeStep === step.id;
                                const isDone = sData.status === 'Done';
                                return (
                                    <button key={step.id} onClick={() => setActiveStep(step.id)} className={`flex items-center p-3 rounded-xl border min-w-max transition-all relative ${isActive ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500 dark:bg-indigo-900/20 dark:border-indigo-500' : isDone ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10' : 'bg-white border-gray-200 dark:bg-slate-900 dark:border-slate-800'}`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mr-2 ${isDone ? 'bg-emerald-500 text-white' : isActive ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                            {isDone ? <CheckCircle2 size={16} /> : step.id}
                                        </div>
                                        <div className="text-left">
                                            <span className={`text-xs font-bold whitespace-nowrap block ${isActive ? 'text-indigo-700' : isDone ? 'text-emerald-700' : 'text-gray-600'}`}>{step.title}</span>
                                            <span className="text-[10px] text-gray-400 block">{sData.status || 'Pending'}</span>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="lg:col-span-2">
                            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100 dark:border-slate-800">
                                <div>
                                    <h3 className="font-bold text-lg dark:text-white">{AUDIT_STEPS[activeStep - 1].title}</h3>
                                    <p className="text-sm text-gray-500">{AUDIT_STEPS[activeStep - 1].description}</p>
                                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                        <span className="flex items-center gap-1"><Clock size={12} /> Durasi Tahap: {getDuration(selectedAudit.steps?.[activeStep - 1]?.startDate, selectedAudit.steps?.[activeStep - 1]?.endDate)}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {(selectedAudit.steps?.[activeStep - 1]?.status || '') === 'Done' && hasPermission('tax-monitoring', 'edit') && (
                                        <button onClick={handleSendbackStep} className="px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg flex items-center gap-2 hover:bg-amber-200 transition-all text-sm font-semibold">
                                            <RotateCcw size={16} /> Batalkan Selesai
                                        </button>
                                    )}
                                    {(selectedAudit.steps?.[activeStep - 1]?.status || '') !== 'Done' && hasPermission('tax-monitoring', 'edit') && (
                                        <button onClick={handleFinishStep} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 shadow-sm transition-all text-sm font-semibold">
                                            <CheckCircle2 size={16} /> Selesai Tahap Ini
                                        </button>
                                    )}
                                </div>
                            </div>
                            {/* Checklists & Inputs ... same as before */}
                            <div className="space-y-3 mb-6">
                                {(selectedAudit.steps && selectedAudit.steps[activeStep - 1]?.notes || []).map((note) => (
                                    <div key={note.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 group">
                                        <button onClick={() => handleToggleCheck(note.id)} className={`mt-0.5 ${note.isChecked ? 'text-green-500' : 'text-gray-300 hover:text-gray-400'}`}>
                                            {note.isChecked ? <CheckSquare size={20} /> : <Square size={20} />}
                                        </button>
                                        <div className="flex-1">
                                            {editingNoteId === note.id ? (
                                                <div className="space-y-2">
                                                    <input
                                                        className="w-full p-2 text-sm bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-800 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none dark:text-white"
                                                        value={editingNoteText}
                                                        onChange={e => setEditingNoteText(e.target.value)}
                                                        autoFocus
                                                    />
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            className="w-24 p-2 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg dark:text-white"
                                                            value={editingNotePic}
                                                            onChange={e => setEditingNotePic(e.target.value)}
                                                            placeholder="PIC"
                                                        />
                                                        <button onClick={() => handleUpdateNote(note.id)} className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                                                            <Save size={14} />
                                                        </button>
                                                        <button onClick={() => setEditingNoteId(null)} className="p-1.5 bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-300 transition-colors">
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <p className={`text-sm ${note.isChecked ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>{note.text}</p>
                                                    <div className="flex items-center gap-2 mt-1.5">
                                                        <span className="text-[10px] px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded flex items-center gap-1"><User size={10} /> {note.pic}</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {editingNoteId !== note.id && hasPermission('tax-monitoring', 'edit') && (
                                                <button
                                                    onClick={() => {
                                                        setEditingNoteId(note.id);
                                                        setEditingNoteText(note.text);
                                                        setEditingNotePic(note.pic);
                                                    }}
                                                    className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                                                >
                                                    <Edit size={14} />
                                                </button>
                                            )}
                                            {hasPermission('tax-monitoring', 'delete') && (
                                                <button onClick={() => handleDeleteNote(note.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {hasPermission('tax-monitoring', 'edit') && (
                                <div className="flex gap-2 items-start pt-4 border-t border-gray-100 dark:border-slate-800">
                                    <input id={`note-input-${activeStep}`} className="flex-1 p-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-sm" placeholder="Tambah item pekerjaan..." onKeyDown={(e) => { if (e.key === 'Enter') { const pic = document.getElementById(`pic-input-${activeStep}`); handleAddNote(e.target.value, pic.value); e.target.value = ''; } }} />
                                    <input id={`pic-input-${activeStep}`} className="w-24 p-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-sm" placeholder="PIC" />
                                    <button onClick={() => { const val = document.getElementById(`note-input-${activeStep}`); const pic = document.getElementById(`pic-input-${activeStep}`); handleAddNote(val.value, pic.value); val.value = ''; }} className="p-2 bg-indigo-600 text-white rounded-lg"><Plus size={20} /></button>
                                </div>
                            )}
                        </Card>
                        <div className="space-y-4">
                            <Card>
                                <h4 className="font-bold text-sm text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2"><FileText size={16} /> Dokumen Tahap {activeStep}</h4>
                                <div className="space-y-2 max-h-[300px] overflow-y-auto mb-4 custom-scrollbar">
                                    {isLoadingFiles ? <div className="text-center py-4 text-xs text-gray-400">Loading...</div> : auditFiles.length === 0 ? <div className="text-center py-4 text-xs text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">Tidak ada dokumen</div> :
                                        auditFiles.map(file => (
                                            <div key={file.id} className="flex items-center gap-3 p-2 bg-white dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700 shadow-sm text-xs group">
                                                <div className="p-1.5 bg-red-100 text-red-600 rounded"><File size={14} /></div>
                                                <div className="flex-1 truncate">
                                                    <button onClick={() => handleSecureDownload(file)} className="font-medium text-blue-600 hover:underline truncate block text-left">{file.title}</button>
                                                    <span className="text-gray-400">{file.size}</span>
                                                </div>
                                                <button onClick={() => handleSecureDownload(file)} className="text-gray-400 hover:text-blue-500 transition-colors" title="Download"><Download size={14} /></button>
                                                {hasPermission('tax-monitoring', 'delete') && (
                                                    <button onClick={() => handleDeleteFile(file.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                                                )}
                                            </div>
                                        ))
                                    }
                                </div>
                                {hasPermission('tax-monitoring', 'create') && (
                                    <label className="block w-full cursor-pointer">
                                        <div className="w-full py-3 border-2 border-dashed border-indigo-300 dark:border-indigo-800 rounded-lg flex flex-col items-center justify-center text-indigo-500 hover:bg-indigo-50 transition-colors"><UploadCloud size={24} className="mb-1" /><span className="text-xs font-semibold">Upload File</span></div>
                                        <input type="file" className="hidden" onChange={handleFileUpload} />
                                    </label>
                                )}
                            </Card>
                        </div>
                    </div>
                </div>
            )
            }

            {/* SINGLE MODAL AT THE END */}
            {
                isCreateModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-xl w-[500px]">
                            <h3 className="font-bold text-lg mb-4 dark:text-white">{editingAudit ? 'Edit Pemeriksaan' : 'Pemeriksaan Baru'}</h3>
                            <div className="space-y-3">
                                <input className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-slate-800 dark:text-white dark:border-slate-700" placeholder="Judul / Nama WP" value={newAuditTitle} onChange={e => setNewAuditTitle(e.target.value)} />
                                <input className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-slate-800 dark:text-white dark:border-slate-700" placeholder="Nomor Surat Perintah (SP2)" value={newAuditLetter} onChange={e => setNewAuditLetter(e.target.value)} />
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <label className="text-xs text-gray-500 block mb-1">Tanggal Mulai</label>
                                        <input type="date" className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-slate-800 dark:text-white dark:border-slate-700" value={newAuditDate} onChange={e => setNewAuditDate(e.target.value)} />
                                    </div>
                                    {!editingAudit && (
                                        <div className="flex-1">
                                            <label className="text-xs text-gray-500 block mb-1">Upload Surat (Opsional)</label>
                                            <input type="file" className="w-full text-xs" onChange={e => setNewAuditFile(e.target.files[0])} />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">Batal</button>
                                <button onClick={handleSaveAudit} disabled={!newAuditTitle || isSaving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">{isSaving ? 'Menyimpan...' : 'Simpan'}</button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
