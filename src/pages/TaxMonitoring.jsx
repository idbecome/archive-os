import React, { useState, useEffect } from 'react';
import { ClipboardCheck, CheckCircle2, AlertCircle, Plus, ChevronRight, FileText, UploadCloud, User, Trash2, CheckSquare, Square, File, Search, Calendar, Clock, Paperclip, Edit, MoreVertical, Download, Folder, RotateCcw, Save, X } from 'lucide-react';
import { Card, SummaryCard } from '../components/ui/Card';
import { api } from '../api';
import Modal from '../components/common/Modal';

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

    const [isUploadingFile, setIsUploadingFile] = useState(false); // New state for upload status
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
        if (selectedAudit) {
            // Auto-select the current active step (or last active)
            // Auto-select the current active step (or last active)
            let stepVal = selectedAudit.currentStep ? parseInt(selectedAudit.currentStep) : 1;
            if (isNaN(stepVal) || stepVal < 1) stepVal = 1;
            if (stepVal > 7) stepVal = 7;
            setActiveStep(stepVal);
            loadFiles(selectedAudit);
        }
    }, [selectedAudit]);

    useEffect(() => {
        if (selectedAudit && activeStep) {
            loadFiles(selectedAudit);
        }
    }, [activeStep]);

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
            // Normalisasi data file agar terbaca dari berbagai format key
            const normalizedFiles = (Array.isArray(files) ? files : []).map(f => ({
                ...f,
                fileData: f.fileData || f.file_data || f.filedata
            }));
            setAuditFiles(normalizedFiles);
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

    const handleSecureDownload = async (file) => {
        try {
            const link = document.createElement('a');
            let downloadUrl;
            let fileName = file.title || 'download';

            // 1. Cek ketersediaan data file (File Data / Base64)
            let base64Content = file.fileData || file.file_data || file.filedata;

            // Jika data file lokal kosong, coba ambil paksa dari server
            if (!base64Content || (typeof base64Content === 'string' && base64Content.length < 50)) {
                console.log("Data file lokal kosong di TaxMonitoring, mencoba fetch ulang...", file.id);
                try {
                    const fullDoc = await api.getDocumentById(file.id);
                    if (fullDoc) {
                        base64Content = fullDoc.fileData || fullDoc.file_data || fullDoc.filedata;
                    }
                } catch (err) {
                    console.error("Gagal fetch ulang di TaxMonitoring:", err);
                }
            }

            if (base64Content && typeof base64Content === 'string' && base64Content.length > 50) {
                try {
                    let mime = file.type || 'application/pdf';

                    // Deteksi dan bersihkan prefix Data URI
                    if (base64Content.includes('base64,')) {
                        const parts = base64Content.split('base64,');
                        if (parts.length > 1) {
                            const header = parts[0];
                            const mimeMatch = header.match(/data:(.*);/);
                            if (mimeMatch) {
                                mime = mimeMatch[1];
                            }
                            base64Content = parts[1];
                        }
                    }

                    // Bersihkan karakter whitespace
                    const cleanBase64 = base64Content.replace(/[\n\r\s]/g, '');

                    const binary = atob(cleanBase64);
                    const len = binary.length;
                    const buffer = new Uint8Array(len);
                    for (let i = 0; i < len; i++) {
                        buffer[i] = binary.charCodeAt(i);
                    }
                    const blob = new Blob([buffer], { type: mime });
                    downloadUrl = URL.createObjectURL(blob);
                } catch (err) {
                    console.error("Gagal decode file tax monitoring", err);
                }
            }

            // 2. Coba URL
            if (!downloadUrl && file.url) {
                downloadUrl = file.url;
                link.target = '_blank';
            }

            if (!downloadUrl) {
                alert("File asli tidak ditemukan di database (Mungkin file terlalu besar saat upload atau data corrupt). Mengunduh hasil OCR/Teks saja.");
                const blob = new Blob([file.ocrContent || file.description || 'File tidak tersedia'], { type: 'text/plain' });
                downloadUrl = URL.createObjectURL(blob);
                fileName += '.txt';
            }

            link.href = downloadUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            if (downloadUrl && downloadUrl.startsWith('blob:')) {
                setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
            }
        } catch (e) {
            console.error("Download error", e);
            alert("Gagal download: " + e.message);
        }
    };

    // --- ACTIONS: AUDIT CRUD ---
    const openCreateModal = () => {
        setEditingAudit(null);
        setNewAuditTitle('');
        setNewAuditLetter('');
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
            let currentAuditId;

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
                currentAuditId = updatedAudit.id;
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
                currentAuditId = auditId;

                if (newAuditFile) {
                    const folderId = await getOrCreateAuditFolder(newAuditTitle);
                    const base64 = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve(e.target.result);
                        reader.onerror = (error) => reject(error);
                        reader.readAsDataURL(newAuditFile);
                    });

                    const doc = {
                        id: String(Date.now() + 1),
                        title: newAuditFile.name,
                        type: newAuditFile.type,
                        size: (newAuditFile.size / 1024).toFixed(1) + ' KB',
                        uploadDate: new Date().toISOString(),
                        auditId: currentAuditId,
                        stepIndex: 0,
                        fileData: base64,
                        file_data: base64, // RESTORED: Pastikan data terkirim ke backend
                        filedata: base64, // RESTORED: Backend mungkin menggunakan lowercase
                        folderId: folderId,
                        department: 'Tax',
                        owner: currentUser?.name || 'Admin',
                        ocrContent: 'Initial attachment'
                    };
                    await api.createDocument(doc);
                }
            }

            setIsCreateModalOpen(false);
            setNewAuditTitle('');
            setNewAuditLetter('');
            setNewAuditFile(null);
            if (onRefresh) onRefresh();
        } catch (e) {
            alert('Gagal menyimpan: ' + e.message);
            console.error("Failed to save audit or upload initial file:", e);
        } finally {
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

        if (file.size > 30 * 1024 * 1024) {
            alert("File terlalu besar! Maksimal ukuran file adalah 30MB.");
            e.target.value = null;
            return;
        }

        setIsUploadingFile(true); // Set uploading state to true
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
                file_data: ev.target.result, // RESTORED: Pastikan data terkirim ke backend
                filedata: ev.target.result, // RESTORED: Backend mungkin menggunakan lowercase
                folderId: folderId,
                department: 'Tax',
                owner: currentUser?.name || 'Tax Team'
            };
            try {
                await api.createDocument(newDoc);
                loadFiles(selectedAudit);
                if (onRefresh) onRefresh();
                alert('File berhasil diunggah!');
            }
            catch (err) { console.error("Failed to upload file:", err); alert('Gagal mengunggah file: ' + err.message); }
            finally { setIsUploadingFile(false); } // Reset uploading state
        };
        reader.readAsDataURL(file);
        e.target.value = null; // Clear the input after selection
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
        <>
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

                        {/* TRAIL FLOW VISUALIZATION */}

                        {/* OVERALL PROGRESS & TRAIL FLOW */}
                        <div className="mb-8 mt-2 space-y-6">
                            {/* 1. Overall Progress Bar (Restored) */}
                            <div>
                                <div className="flex justify-between items-center text-sm mb-2">
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">Overall Progress</span>
                                    <span className="text-indigo-600 font-bold">
                                        {(() => {
                                            try {
                                                const steps = Array.isArray(selectedAudit.steps) ? selectedAudit.steps :
                                                    (typeof selectedAudit.steps === 'string' ? JSON.parse(selectedAudit.steps || '[]') : []);
                                                const done = steps.filter(s => s.status === 'Done').length;
                                                return Math.round((done / 7) * 100);
                                            } catch (e) { return 0; }
                                        })()}%
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700 overflow-hidden">
                                    <div
                                        className="bg-indigo-600 h-3 rounded-full transition-all duration-500 ease-out"
                                        style={{
                                            width: `${(() => {
                                                try {
                                                    const steps = Array.isArray(selectedAudit.steps) ? selectedAudit.steps :
                                                        (typeof selectedAudit.steps === 'string' ? JSON.parse(selectedAudit.steps || '[]') : []);
                                                    const done = steps.filter(s => s.status === 'Done').length;
                                                    return Math.round((done / 7) * 100);
                                                } catch (e) { return 0; }
                                            })()}%`
                                        }}
                                    ></div>
                                </div>
                            </div>

                            {/* 2. Trail Flow Visualization */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Step Tracking</h3>


                                {/* Desktop/Tablet Horizontal Flow */}
                                <div className="hidden md:flex items-center justify-between relative px-4">
                                    {/* Connecting Line Background */}
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 dark:bg-slate-700 -z-10" />

                                    {AUDIT_STEPS.map((step, index) => {
                                        const sData = selectedAudit.steps?.[step.id - 1] || {};
                                        const isDone = sData.status === 'Done';
                                        const isActive = activeStep === step.id;
                                        const isPending = !isDone && !isActive;
                                        const nextStep = selectedAudit.steps?.[step.id] || {};

                                        // Calculate line colored progress
                                        // If this step is done, the line to the next step should be green
                                        const isLineColored = isDone;

                                        return (
                                            <div key={step.id} className="relative flex flex-col items-center group cursor-pointer" onClick={() => setActiveStep(step.id)}>
                                                {/* Connecting Line Colored Overlay (to the right) */}
                                                {index < AUDIT_STEPS.length - 1 && (
                                                    <div
                                                        className={`absolute left-1/2 top-1/2 -translate-y-1/2 h-1 w-full -z-10 transition-all duration-500 ${isDone ? 'bg-emerald-500' : 'bg-transparent'}`}
                                                        style={{ width: 'calc(100% + 2rem)' }}
                                                    />
                                                )}

                                                <div
                                                    className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-300 z-10
                                                ${isDone
                                                            ? 'bg-emerald-500 border-emerald-100 dark:border-emerald-900/50 text-white scale-100 shadow-md shadow-emerald-500/20'
                                                            : isActive
                                                                ? 'bg-indigo-600 border-indigo-100 dark:border-indigo-900/50 text-white scale-110 shadow-lg shadow-indigo-500/30'
                                                                : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-400 dark:text-gray-500'}`}
                                                >
                                                    {isDone ? <CheckCircle2 size={18} /> : <span className="text-sm font-bold">{step.id}</span>}
                                                </div>

                                                <div className="absolute top-12 w-32 text-center transition-all duration-300">
                                                    <p className={`text-xs font-bold mb-0.5 ${isActive ? 'text-indigo-600 scale-105' : isDone ? 'text-emerald-600' : 'text-gray-400'}`}>
                                                        {step.title}
                                                    </p>
                                                    <p className={`text-[10px] ${isActive ? 'text-indigo-400' : 'text-gray-400 hidden group-hover:block'}`}>
                                                        {sData.status || 'Pending'}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Mobile Vertical Flow (Fallback) */}
                                <div className="md:hidden space-y-2 pl-4 border-l-2 border-gray-200 dark:border-slate-800 ml-2">
                                    {AUDIT_STEPS.map((step) => {
                                        const sData = selectedAudit.steps?.[step.id - 1] || {};
                                        const isDone = sData.status === 'Done';
                                        const isActive = activeStep === step.id;
                                        return (
                                            <div key={step.id} onClick={() => setActiveStep(step.id)} className={`flex items-center gap-3 relative cursor-pointer ${isActive ? 'pl-2 transition-all' : ''}`}>
                                                {/* Dot on line */}
                                                <div className={`absolute -left-[21px] w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${isDone ? 'bg-emerald-500' : isActive ? 'bg-indigo-500' : 'bg-gray-300'}`} />

                                                <div className={`flex-1 p-2 rounded-lg border ${isActive ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-100'}`}>
                                                    <div className="flex justify-between items-center">
                                                        <span className={`text-xs font-bold ${isDone ? 'text-emerald-600' : isActive ? 'text-indigo-600' : 'text-gray-500'}`}>{step.title}</span>
                                                        {isDone && <CheckCircle2 size={14} className="text-emerald-500" />}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stepper & Detail Content (Collapsed for brevity but presumed same) */}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="lg:col-span-2">
                            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100 dark:border-slate-800">
                                <div>
                                    <h3 className="font-bold text-lg dark:text-white">{(AUDIT_STEPS[activeStep - 1] || AUDIT_STEPS[0]).title}</h3>
                                    <p className="text-sm text-gray-500">{(AUDIT_STEPS[activeStep - 1] || AUDIT_STEPS[0]).description}</p>
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
                                        <button
                                            onClick={handleFinishStep}
                                            disabled={activeStep > 1 && selectedAudit.steps?.[activeStep - 2]?.status !== 'Done'}
                                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-500 text-white rounded-lg flex items-center gap-2 shadow-sm transition-all text-sm font-semibold"
                                            title={activeStep > 1 && selectedAudit.steps?.[activeStep - 2]?.status !== 'Done' ? "Selesaikan tahap sebelumnya terlebih dahulu" : "Selesaikan tahap ini"}
                                        >
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
                                        <div className="w-full py-6 px-6 bg-white dark:bg-slate-800 border-2 border-dashed border-indigo-300 dark:border-indigo-700 rounded-2xl flex flex-col items-center justify-center text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all shadow-sm group">
                                            {isUploadingFile ? (
                                                <span className="animate-pulse font-bold text-sm">Uploading...</span>
                                            ) : (
                                                <>
                                                    <UploadCloud size={32} className="mb-2 group-hover:scale-110 transition-transform" />
                                                    <span className="text-sm font-bold">Upload File</span>
                                                    <span className="text-xs text-slate-400 mt-1">Klik untuk pilih file</span>
                                                </>
                                            )}
                                        </div>
                                        <input type="file" className="hidden" onChange={handleFileUpload} />
                                    </label>
                                )}
                            </Card>
                        </div>
                    </div>
                </div>
            )
            }
            </div>

            {/* SINGLE MODAL AT THE END */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title={editingAudit ? 'Edit Pemeriksaan' : 'Pemeriksaan Baru'}
                size="max-w-xl"
            >
                <div className="space-y-6">
                    <div className="flex justify-between items-center mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shadow-inner">
                            <ClipboardCheck size={28} />
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Pemeriksaan</p>
                            <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-black uppercase tracking-tight">On Progress</span>
                        </div>
                    </div>

                    <div className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Judul / Nama Wajib Pajak</label>
                            <input
                                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:border-indigo-500 transition-all outline-none dark:text-white font-black text-lg"
                                placeholder="Contoh: PT. Sumber Makmur - PPN 2023"
                                value={newAuditTitle}
                                onChange={e => setNewAuditTitle(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Nomor Surat Perintah (SP2)</label>
                            <input
                                className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-xl focus:border-indigo-500 transition-all outline-none dark:text-white font-bold"
                                placeholder="No. PRIN-000/WPJ.00/KP.0000/2024"
                                value={newAuditLetter}
                                onChange={e => setNewAuditLetter(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Tanggal Mulai</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-xl focus:border-indigo-500 transition-all outline-none dark:text-white font-bold"
                                        value={newAuditDate}
                                        onChange={e => setNewAuditDate(e.target.value)}
                                    />
                                </div>
                            </div>
                            {!editingAudit && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Lampiran SP2 (Opsional)</label>
                                    <label className="flex items-center gap-3 px-5 py-3 bg-white dark:bg-slate-800 border-2 border-dashed border-indigo-300 dark:border-indigo-700 rounded-2xl cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group shadow-sm">
                                        <UploadCloud size={20} className="text-indigo-500 group-hover:scale-110 transition-transform" />
                                        <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 truncate">
                                            {newAuditFile ? newAuditFile.name : 'Pilih File...'}
                                        </span>
                                        <input type="file" className="hidden" onChange={e => setNewAuditFile(e.target.files[0])} />
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-6 mt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                            onClick={() => setIsCreateModalOpen(false)}
                            className="flex-1 py-4 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white text-xs font-black uppercase tracking-widest transition-all"
                        >
                            Batalkan
                        </button>
                        <button
                            onClick={handleSaveAudit}
                            disabled={!newAuditTitle || isSaving}
                            className="flex-[2] py-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isSaving ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-3 h-3 border-2 border-white rounded-full animate-spin border-t-transparent" />
                                    Menyimpan...
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <Save size={16} />
                                    {editingAudit ? 'Simpan Perubahan' : 'Mulai Pemeriksaan'}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
