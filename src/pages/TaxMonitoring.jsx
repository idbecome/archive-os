import React, { useState, useEffect, useRef } from 'react';
import { ClipboardCheck, CheckCircle2, AlertCircle, Plus, ChevronRight, FileText, UploadCloud, User, Trash2, CheckSquare, Square, File, Search, Calendar, Clock, Paperclip, Edit, MoreVertical, Download, Folder, RotateCcw, Save, X, CloudUpload, Sparkles, TrendingUp, FileDigit, Image as ImageIcon, Edit3, Eye } from 'lucide-react';
import { db as api } from '../services/database';
import { performAdvancedOCR } from '../utils/ocr'; // NEW IMPORT
import { Card, SummaryCard } from '../components/ui/Card';
import Modal from '../components/common/Modal';

// ... (code)

// --- CONSTANTS ---
const AUDIT_STEPS = [
    { id: 1, title: 'Penyampaian SP2', description: 'Surat Perintah Pemeriksaan disampaikan kepada Wajib Pajak.' },
    { id: 2, title: 'Peminjaman Dokumen', description: 'Permintaan peminjaman buku, catatan, dan dokumen pendukung.' },
    { id: 3, title: 'Pengujian Pemeriksaan', description: 'Pelaksanaan pengujian kepatuhan materiil dan formal.' },
    { id: 4, title: 'Penyampaian SPHP', description: 'Surat Pemberitahuan Hasil Pemeriksaan (SPHP) disampaikan.' },
    { id: 5, title: 'Pembahasan Akhir', description: 'Closing Conference / Pembahasan Akhir Hasil Pemeriksaan.' },
    { id: 6, title: 'Risalah Pembahasan', description: 'Penandatanganan Risalah Pembahasan dan Berita Acara.' },
    { id: 7, title: 'LHP & SKP', description: 'Laporan Hasil Pemeriksaan dan Penerbitan Surat Ketetapan Pajak.' }
];

export default function TaxMonitoring({ taxAudits, hasPermission, currentUser, onRefresh, syncAuditFolder }) {
    const [selectedAudit, setSelectedAudit] = useState(null);
    const [activeStep, setActiveStep] = useState(1);
    const [auditFiles, setAuditFiles] = useState([]);
    const [isLoadingFiles, setIsLoadingFiles] = useState(false);

    // Notes with Attachments State
    const [stepNotes, setStepNotes] = useState([]);
    const [newNoteText, setNewNoteText] = useState('');
    const [noteAttachment, setNoteAttachment] = useState(null);
    const [isPostingNote, setIsPostingNote] = useState(false);

    // File Detail State
    const [selectedFileDetail, setSelectedFileDetail] = useState(null);

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

    // --- UPLOAD FORM STATE (Refactor) ---
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [uploadForm, setUploadForm] = useState({
        file: null,
        fileData: null,
        fileName: '',
        fileType: '',
        fileSize: '',
        title: '',
        ocrContent: '',
        isProcessing: false,
        processingMessage: ''
    });

    // List State
    const [searchQuery, setSearchQuery] = useState('');
    const [generalAttachments, setGeneralAttachments] = useState({});

    // Auto-scroll chat history - Moved here to avoid ReferenceError
    const chatEndRef = useRef(null);
    useEffect(() => {
        if (selectedAudit && Array.isArray(stepNotes) && stepNotes.length > 0) {
            setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        }
    }, [stepNotes, selectedAudit]);

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
            loadStepNotes();
        }
    }, [activeStep, selectedAudit]);

    // POLL STATUS for processing files
    useEffect(() => {
        const hasProcessing = Array.isArray(auditFiles) && auditFiles.some(f => f.status === 'processing' || (f.ocrContent === '' && !f.type?.includes('image') && !f.type?.includes('pdf')));
        // Note: Simple check. Better to rely on explicit 'status' field from DB.

        // We'll trust availability of 'status' field from backend now.
        const processingFiles = auditFiles.filter(f => f.status === 'processing');

        if (processingFiles.length > 0) {
            const interval = setInterval(() => {
                console.log("Polling for processing files...", processingFiles.map(f => f.id));
                loadFiles(selectedAudit);
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [auditFiles, selectedAudit]);

    const loadFiles = async (audit) => {
        setIsLoadingFiles(true);
        try {
            const folderId = await syncAuditFolder(audit.title, 'ACTIVE');

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

    const loadStepNotes = async () => {
        if (!selectedAudit) return;
        const notes = await api.getAuditNotes(selectedAudit.id, activeStep);
        setStepNotes(notes);
    };

    const handlePostNote = async () => {
        if (!newNoteText.trim() && !noteAttachment) return;
        setIsPostingNote(true);
        
        const formData = new FormData();
        formData.append('user', currentUser?.name || 'Anonymous');
        formData.append('text', newNoteText);
        if (noteAttachment) formData.append('attachment', noteAttachment);

        const res = await api.addAuditNote(selectedAudit.id, activeStep, formData);
        if (res.success) {
            setNewNoteText('');
            setNoteAttachment(null);
            loadStepNotes();
        } else {
            alert("Gagal mengirim catatan.");
        }
        setIsPostingNote(false);
    };

    const calculateStepProgress = () => {
        if (!selectedAudit || !selectedAudit.steps[activeStep - 1]) return 0;
        const notes = selectedAudit.steps[activeStep - 1].notes || [];
        if (notes.length === 0) return 0;
        const done = notes.filter(n => n.isChecked).length;
        return Math.round((done / notes.length) * 100);
    };

    const handleViewFileDetail = async (file) => {
        setSelectedFileDetail(file);
        // Jangan panggil API jika ini adalah lampiran catatan (ID diawali 'note-')
        if (file.id && String(file.id).startsWith('note-')) return;

        try {
            const fullDoc = await api.getDocumentById(file.id);
            if (fullDoc) {
                setSelectedFileDetail(fullDoc);
            }
        } catch (error) {
            console.error("Failed to fetch full document details:", error);
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

    const getFullUrl = (url) => {
        if (typeof url !== 'string' || !url.startsWith('/uploads/')) return url;
        const isDev = window.location.port === '3000' || window.location.port === '5173' || window.location.hostname === 'localhost';
        return isDev ? `http://${window.location.hostname}:5000${url}` : url;
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

            if (typeof base64Content === 'string' && base64Content.length > 50) {
                if (base64Content.includes('base64,') || !base64Content.startsWith('/')) {
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
            }

            // 2. Coba URL
            if (!downloadUrl && file.url) {
                downloadUrl = getFullUrl(file.url);
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
                    const folderId = await syncAuditFolder(newAuditTitle, 'ACTIVE');

                    let ocrText = ''; // OCR will be handled by background worker

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
                        file_data: base64,
                        filedata: base64,
                        folderId: folderId,
                        department: 'Tax',
                        owner: currentUser?.name || 'Admin',
                        ocrContent: '' // Will be handled by background worker
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
            const audit = taxAudits.find(a => a.id === id);
            if (audit) {
                await syncAuditFolder(audit.title, 'REMOVED');
            }
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

    // --- NEW UPLOAD HANDLERS ---
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 30 * 1024 * 1024) {
            alert("File terlalu besar! Maksimal ukuran file adalah 30MB.");
            e.target.value = null;
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            setUploadForm({
                file: file,
                fileData: ev.target.result,
                fileName: file.name,
                fileType: file.type,
                fileSize: (file.size / 1024).toFixed(1) + ' KB',
                title: file.name,
                ocrContent: '',
                isProcessing: false,
                processingMessage: ''
            });
            setUploadModalOpen(true);
        };
        reader.readAsDataURL(file);
        e.target.value = null;
    };

    const handleConfirmUpload = async () => {
        if (!selectedAudit || !uploadForm.fileData) return;

        // TUTUP MODAL SEGERA: Agar user bisa lanjut memantau audit lainnya
        setUploadModalOpen(false);

        try {
            const folderId = await syncAuditFolder(selectedAudit.title, 'ACTIVE');

            // Backend will handle OCR via Queue
            const newDoc = {
                id: String(Date.now()),
                title: uploadForm.title || uploadForm.fileName,
                type: uploadForm.fileType,
                size: uploadForm.fileSize,
                uploadDate: new Date().toISOString(),
                auditId: selectedAudit.id,
                stepIndex: activeStep,
                fileData: uploadForm.fileData,
                file_data: uploadForm.fileData,
                filedata: uploadForm.fileData,
                folderId: folderId,
                department: 'Tax',
                owner: currentUser?.name || 'Tax Team',
                ocrContent: '' // Biarkan server memproses OCR di antrean latar belakang
            };

            await api.createDocument(newDoc);

            loadFiles(selectedAudit); // Reload list (will show 'processing')
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error("Background upload failed:", err);
            alert('Gagal mengunggah dokumen di latar belakang: ' + err.message);
        }
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

    const getSmartInsight = () => {
        // 1. Konteks Pencarian
        if (searchQuery) {
            return {
                text: `Analisis Pencarian: Menampilkan hasil untuk "${searchQuery}". AI memindai nomor surat, judul, dan konten dokumen terkait.`,
                icon: <Search className="text-indigo-500" size={20} />,
                color: "border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/50 dark:bg-indigo-900/10 text-indigo-800 dark:text-indigo-200"
            };
        }

        // 2. Analisis Pemeriksaan Aktif & Durasi
        const activeAudits = taxAudits.filter(a => a.status !== 'Done');
        const longRunning = activeAudits.filter(a => {
            const days = parseInt(getDuration(a.startDate, new Date()));
            return days > 30;
        });

        if (longRunning.length > 0) {
            return {
                text: `Peringatan Durasi: Terdapat ${longRunning.length} pemeriksaan yang telah berjalan lebih dari 30 hari. Segera tinjau hambatan pada tahap terkait.`,
                icon: <AlertCircle className="text-red-500" size={20} />,
                color: "border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-900/10 text-red-800 dark:text-red-200"
            };
        }

        // 3. Analisis Tahap Kritis (Peminjaman Dokumen)
        const stuckAtBorrowing = activeAudits.filter(a => a.currentStep === 2);
        if (stuckAtBorrowing.length > 0) {
            return {
                text: `Tahap Kritis: ${stuckAtBorrowing.length} pemeriksaan sedang di tahap 'Peminjaman Dokumen'. Pastikan semua bukti fisik telah di-scan dan di-upload ke sistem.`,
                icon: <TrendingUp className="text-amber-500" size={20} />,
                color: "border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-900/10 text-amber-800 dark:text-amber-200"
            };
        }

        // 4. Analisis Kelengkapan (Missing Attachments)
        const missingSP2 = taxAudits.filter(a => !generalAttachments[a.id]);
        if (missingSP2.length > 0) {
            return {
                text: `Kelengkapan Data: Ditemukan ${missingSP2.length} pemeriksaan tanpa lampiran SP2 digital. Unggah dokumen untuk menjaga validitas audit trail.`,
                icon: <FileText className="text-purple-500" size={20} />,
                color: "border-purple-200 dark:border-purple-800/50 bg-purple-50/50 dark:bg-purple-900/10 text-purple-800 dark:text-purple-200"
            };
        }

        // 5. Default Tips
        const tips = [
            "Tips Kepatuhan: Selalu gunakan fitur 'Notes' untuk mencatat setiap interaksi dengan pemeriksa pajak.",
            "Info AI: Dokumen yang di-upload di setiap tahap otomatis terindeks untuk pencarian cepat saat pembahasan akhir.",
            "Saran: Lakukan review mingguan terhadap progress bar pemeriksaan untuk menghindari keterlambatan respon SPHP.",
            "Sistem Optimal: Semua data pemeriksaan tersinkronisasi dengan aman di Digital Vault."
        ];
        return {
            text: tips[new Date().getHours() % tips.length],
            icon: <Sparkles className="text-emerald-500" size={20} />,
            color: "border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-800 dark:text-emerald-200"
        };
    };

    const insight = getSmartInsight();

    const filteredAudits = (taxAudits || []).filter(t =>
        (t.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.letterNumber || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <>
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                {/* AI SMART INSIGHT BANNER */}
                <div className={`p-4 rounded-2xl border backdrop-blur-md flex items-center gap-4 animate-in slide-in-from-top-4 duration-700 ${insight.color}`}>
                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl shadow-sm shrink-0">
                        {insight.icon}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Smart Assistant</span>
                            <div className="w-1 h-1 rounded-full bg-current opacity-40"></div>
                            <span className="text-[10px] font-bold opacity-60">Audit Intelligence</span>
                        </div>
                        <p className="text-sm font-bold leading-relaxed">{insight.text}</p>
                    </div>
                </div>

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
                        <SummaryCard title="Total Pemeriksaan" value={taxAudits?.length || 0} icon={ClipboardCheck} colorClass="bg-indigo-100 text-indigo-600" />
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
                                            <tr key={audit.id} 
                                                style={{ animationDelay: `${(taxAudits.indexOf(audit)) * 50}ms` }}
                                                className="border-b dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 animate-in zoom-in-95 fade-in fill-mode-both duration-500"
                                            >
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
                                                                <Eye size={16} />
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
                                
                                {/* MODERN CHECKLIST SECTION (REQUEST TRACKER) */}
                                <div className="mb-10">
                                    <div className="flex justify-between items-center mb-4 px-1">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <ClipboardCheck size={12} className="text-indigo-500" /> Daftar Permintaan Data & PIC
                                        </h4>
                                        <div className="flex items-center gap-3">
                                            <div className="h-1.5 w-24 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                                                <div 
                                                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-700 ease-out" 
                                                    style={{ width: `${calculateStepProgress()}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-lg border border-emerald-100 dark:border-emerald-800">{calculateStepProgress()}%</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {(selectedAudit.steps[activeStep - 1]?.notes || []).length === 0 && (
                                            <div className="text-center py-8 bg-slate-50/50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-800">
                                                <p className="text-xs text-slate-400 font-medium">Belum ada daftar permintaan data.</p>
                                            </div>
                                        )}
                                        {(selectedAudit.steps[activeStep - 1]?.notes || []).map((note) => (
                                            <div key={note.id} className={`group flex items-center gap-4 p-4 rounded-3xl border transition-all duration-300 ${note.isChecked ? 'bg-emerald-50/30 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-800/50' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 shadow-sm hover:shadow-md'}`}>
                                                <button 
                                                    onClick={() => handleToggleCheck(note.id)}
                                                    className={`shrink-0 w-7 h-7 rounded-xl border-2 flex items-center justify-center transition-all ${note.isChecked ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-500 bg-white dark:bg-slate-800'}`}
                                                >
                                                    {note.isChecked && <CheckSquare size={16} />}
                                                </button>
                                                
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-bold transition-all ${note.isChecked ? 'text-slate-400 line-through opacity-60' : 'text-slate-700 dark:text-slate-200'}`}>
                                                        {note.text}
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-inner">
                                                        <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-[8px] font-black text-white shadow-sm">
                                                            {note.pic?.substring(0, 2).toUpperCase() || '??'}
                                                        </div>
                                                        <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-tight">{note.pic || 'N/A'}</span>
                                                    </div>
                                                    
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                                        <button onClick={() => { setEditingNoteId(note.id); setEditingNoteText(note.text); setEditingNotePic(note.pic); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all"><Edit3 size={14} /></button>
                                                        <button onClick={() => handleDeleteNote(note.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all"><Trash2 size={14} /></button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {/* Add Item Input - Startup Style */}
                                    {hasPermission('tax-monitoring', 'edit') && (
                                        <div className="mt-4 flex gap-3 p-2 bg-slate-50 dark:bg-slate-950 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-inner group/input focus-within:border-indigo-300 transition-all">
                                            <input 
                                                id={`note-input-${activeStep}`}
                                                className="flex-1 bg-transparent border-0 focus:ring-0 text-sm font-bold px-4 dark:text-white placeholder:text-slate-300"
                                                placeholder="Tambah permintaan data baru..."
                                                onKeyDown={(e) => { if (e.key === 'Enter') { const pic = document.getElementById(`pic-input-${activeStep}`); handleAddNote(e.target.value, pic.value); e.target.value = ''; pic.value = ''; } }}
                                            />
                                            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 my-auto"></div>
                                            <input 
                                                id={`pic-input-${activeStep}`}
                                                className="w-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 text-[10px] font-black uppercase focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                placeholder="PIC"
                                            />
                                            <button 
                                                onClick={() => {
                                                    const val = document.getElementById(`note-input-${activeStep}`);
                                                    const pic = document.getElementById(`pic-input-${activeStep}`);
                                                    handleAddNote(val.value, pic.value);
                                                    val.value = '';
                                                    pic.value = '';
                                                }}
                                                className="p-3 bg-indigo-600 text-white rounded-[1.5rem] shadow-lg shadow-indigo-500/30 hover:bg-indigo-500 hover:scale-105 active:scale-95 transition-all"
                                            >
                                                <Plus size={20} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* DISCUSSION HUB (CHAT NOTES) */}
                                <div className="border-t border-slate-100 dark:border-slate-800 pt-8">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2 px-1">
                                        <MoreVertical size={12} className="text-indigo-500" /> Koordinasi & Catatan Pending
                                    </h4>
                                    
                                    <div className="flex-1 min-h-0 max-h-[400px] overflow-y-auto custom-scrollbar mb-8 px-1">
                                        <div className="space-y-4 flex flex-col">
                                            {stepNotes.length === 0 && (
                                                <div className="text-center py-10 text-slate-300 italic text-[10px] uppercase tracking-widest">
                                                    Belum ada diskusi di tahap ini.
                                                </div>
                                            )}
                                            {Array.isArray(stepNotes) && stepNotes.map(note => {
                                                const isMe = note.user === currentUser?.name || note.user === currentUser?.username;
                                                const timestamp = note.timestamp ? new Date(note.timestamp) : null;
                                                const isValidDate = timestamp && !isNaN(timestamp.getTime());

                                                return (
                                                    <div key={note.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} w-full animate-in slide-in-from-bottom-2`}>
                                                        <div className={`max-w-[85%] p-4 rounded-[2rem] shadow-sm ${isMe ? 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-500/10' : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-tl-none shadow-slate-200/50'}`}>
                                                            <div className="flex justify-between items-center gap-4 text-[9px] mb-1.5 opacity-80 font-black uppercase tracking-wider">
                                                                {!isMe && <span className="text-indigo-600 dark:text-indigo-400">{note.user}</span>}
                                                                <span className={isMe ? 'text-indigo-100 ml-auto' : 'text-slate-400'}>
                                                                    {isValidDate ? timestamp.toLocaleString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }) : '-'}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs leading-relaxed break-words font-medium">{note.text}</p>
                                                            {note.attachmentUrl && (
                                                                <div className={`mt-3 flex items-center justify-between p-2.5 rounded-2xl border border-dashed ${isMe ? 'bg-white/10 border-white/20' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                                        <Paperclip size={12} className={isMe ? 'text-indigo-200' : 'text-indigo-500'} />
                                                                        <span className="text-[9px] font-bold truncate max-w-[120px]">{note.attachmentName}</span>
                                                                    </div>
                                                                    <button 
                                                                        onClick={() => handleViewFileDetail({ id: `note-${note.id}`, title: note.attachmentName, type: note.attachmentType, url: note.attachmentUrl, fileData: null })}
                                                                        className={`text-[9px] font-black uppercase hover:underline ml-3 ${isMe ? 'text-white' : 'text-indigo-600'}`}
                                                                    >
                                                                        Preview
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            <div ref={chatEndRef} />
                                        </div>
                                    </div>

                                    {hasPermission('tax-monitoring', 'edit') && (
                                        <div className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5">
                                            <textarea 
                                                value={newNoteText} onChange={e => setNewNoteText(e.target.value)}
                                                className="w-full p-4 text-sm bg-slate-50 dark:bg-slate-950 border-0 rounded-3xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white resize-none shadow-inner"
                                                placeholder="Tulis koordinasi atau alasan pending..."
                                                rows="2"
                                            />
                                            <div className="flex justify-between items-center px-2">
                                                <label className="flex items-center gap-2 cursor-pointer group">
                                                    <div className={`p-2.5 rounded-2xl transition-all ${noteAttachment ? 'bg-emerald-100 text-emerald-600 shadow-lg shadow-emerald-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500'}`}>
                                                        <Paperclip size={18} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">{noteAttachment ? 'File Terpilih' : 'Lampiran'}</span>
                                                        <span className="text-[9px] font-bold text-indigo-500 truncate max-w-[120px]">{noteAttachment ? noteAttachment.name : 'PDF/Gambar'}</span>
                                                    </div>
                                                    <input type="file" className="hidden" onChange={e => setNoteAttachment(e.target.files[0])} />
                                                </label>
                                                <button 
                                                    onClick={handlePostNote} 
                                                    disabled={isPostingNote || (!newNoteText.trim() && !noteAttachment)}
                                                    className="px-8 py-3 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-indigo-500/30 hover:bg-indigo-500 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:translate-y-0 transition-all flex items-center gap-2"
                                                >
                                                    {isPostingNote ? (
                                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    ) : <CloudUpload size={16} />}
                                                    Kirim
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>
                            <div className="space-y-4">
                                <Card>
                                    <h4 className="font-bold text-sm text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2"><FileText size={16} /> Dokumen Tahap {activeStep}</h4>
                                    <div className="space-y-2 max-h-[300px] overflow-y-auto mb-4 custom-scrollbar">
                                        {isLoadingFiles ? <div className="text-center py-4 text-xs text-gray-400">Loading...</div> : auditFiles.length === 0 ? <div className="text-center py-4 text-xs text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">Tidak ada dokumen</div> :
                                            auditFiles.map(file => (
                                                <div key={file.id} className="flex items-center gap-3 p-2 bg-white dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700 shadow-sm text-xs group">
                                                    <div className={`p-1.5 rounded ${file.type?.includes('pdf') ? 'bg-red-100 text-red-600' : file.type?.includes('image') ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                                        {file.type?.includes('pdf') ? <FileDigit size={14} /> : file.type?.includes('image') ? <ImageIcon size={14} /> : <File size={14} />}
                                                    </div>
                                                    <div className="flex-1 truncate cursor-pointer" onClick={() => handleViewFileDetail(file)}>
                                                        <span className="font-medium text-slate-700 dark:text-slate-200 hover:text-indigo-600 truncate block text-left transition-colors">{file.title}</span>
                                                        <span className="text-gray-400 flex items-center gap-1">
                                                            {file.size}
                                                            {file.ocrContent && <span className="text-[9px] bg-green-100 text-green-700 px-1 rounded flex items-center gap-0.5"><FileText size={8} /> OCR</span>}
                                                        </span>
                                                    </div>
                                                    <button onClick={(e) => { e.stopPropagation(); handleSecureDownload(file); }} className="text-gray-400 hover:text-blue-500 transition-colors p-1" title="Download"><Download size={14} /></button>
                                                    {hasPermission('tax-monitoring', 'delete') && (
                                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteFile(file.id); }} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"><Trash2 size={14} /></button>
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
                                            <input type="file" className="hidden" onChange={handleFileSelect} />
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
                <div className="space-y-6 pt-24 max-h-[85vh] overflow-y-auto custom-scrollbar px-1">
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
                                        <input type="file" className="hidden" onChange={e => setNewAuditFile(e.target.files[0])} accept="image/*,.pdf,.docx,.doc,.xlsx,.xls,.pptx" />
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

            {/* FILE DETAIL MODAL - NEW */}
            <Modal
                isOpen={!!selectedFileDetail}
                onClose={() => setSelectedFileDetail(null)}
                title="Detail Dokumen & OCR"
                size="max-w-4xl"
            >
                <div className="flex flex-col md:flex-row gap-6 h-[70vh] pt-24">
                    {/* LEFT: PREVIEW */}
                    <div className="flex-1 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-700 relative">
                        {String(selectedFileDetail?.type || '').toLowerCase().startsWith('image/') ? (
                            <img src={selectedFileDetail?.fileData || getFullUrl(selectedFileDetail?.url)} alt="Preview" className="max-w-full max-h-full object-contain" onError={(e) => { e.target.style.display='none'; }} />
                        ) : String(selectedFileDetail?.type || '').toLowerCase().includes('pdf') ? (
                            <iframe src={selectedFileDetail?.fileData || getFullUrl(selectedFileDetail?.url)} className="w-full h-full" title="PDF Preview"></iframe>
                        ) : (
                            <div className="text-center p-6 text-slate-500">
                                <FileText size={48} className="mx-auto mb-2 opacity-50" />
                                <p>Preview tidak tersedia untuk format ini.</p>
                                <button onClick={() => handleSecureDownload(selectedFileDetail)} className="mt-4 text-indigo-600 hover:underline">Download File</button>
                            </div>
                        )}
                    </div>

                    {/* RIGHT: OCR CONTENT */}
                    <div className="flex-1 flex flex-col h-full">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                <FileText size={16} className="text-indigo-500" /> Extracted Text (OCR)
                            </h4>
                            {selectedFileDetail?.ocrContent ? (
                                <span className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded border border-emerald-100 dark:border-emerald-800 flex items-center gap-1">
                                    <CheckCircle2 size={12} /> Auto-Generated
                                </span>
                            ) : (
                                <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded border border-amber-100 dark:border-amber-800 flex items-center gap-1 animate-pulse">
                                    <Clock size={12} /> Pending / Empty
                                </span>
                            )}
                        </div>
                        <textarea
                            className="flex-1 w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl p-4 text-sm font-mono text-slate-700 dark:text-slate-300 focus:border-indigo-500 focus:ring-0 resize-none outline-none leading-relaxed"
                            value={selectedFileDetail?.ocrContent || ''}
                            onChange={(e) => setSelectedFileDetail({ ...selectedFileDetail, ocrContent: e.target.value })}
                            placeholder={selectedFileDetail?.ocrContent ? "Teks hasil scan..." : "Teks belum tersedia. Mohon tunggu proses OCR selesai atau klik tombol 'Regenerate/Refresh' di bawah."}
                        />
                        <div className="mt-4 flex justify-end gap-3">
                            <button
                                onClick={() => setSelectedFileDetail(null)}
                                className="px-5 py-2.5 rounded-xl text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                Tutup
                            </button>
                            <button
                                onClick={async () => {
                                    // REGENERATE / REFRESH ACTION
                                    try {
                                        const refreshedDoc = await api.getDocumentById(selectedFileDetail.id);
                                        if (refreshedDoc) {
                                            setSelectedFileDetail(refreshedDoc);
                                            alert("Data dokumen diperbarui dari server.");
                                        }
                                    } catch (e) { alert("Gagal refresh: " + e.message); }
                                }}
                                className="px-5 py-2.5 rounded-xl text-indigo-600 font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors border border-indigo-100 dark:border-indigo-800"
                            >
                                Refresh / Cek OCR
                            </button>
                        </div>
                    </div>
                </div>
            </Modal >

            {/* UPLOAD MODAL - NEW */}
            <Modal
                isOpen={uploadModalOpen}
                onClose={() => setUploadModalOpen(false)}
                title="Upload Dokumen Pemeriksaan"
                size="max-w-2xl"
            >
                <div className="space-y-6 pt-24 max-h-[85vh] overflow-y-auto custom-scrollbar px-1">
                    {/* Preview Section */}
                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="w-full md:w-1/3 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 flex items-center justify-center h-48 relative group">
                            {uploadForm.fileType?.startsWith('image/') ? (
                                <img src={uploadForm.fileData} alt="Preview" className="max-w-full max-h-full object-contain" />
                            ) : (
                                <div className="text-center p-4">
                                    <FileText size={48} className="mx-auto mb-2 text-slate-400" />
                                    <p className="text-xs text-slate-500 break-all">{uploadForm.fileName}</p>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <p className="text-white text-xs font-bold">{uploadForm.fileSize}</p>
                            </div>
                        </div>
                        <div className="flex-1 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Judul Dokumen</label>
                                <input
                                    className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    value={uploadForm.title}
                                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                                    placeholder="Masukkan judul dokumen..."
                                />
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">Hasil OCR (Text Extraction)</label>
                                    {uploadForm.ocrContent && (
                                        <span className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded flex items-center gap-1">
                                            <CheckCircle2 size={10} /> Berhasil
                                        </span>
                                    )}
                                </div>
                                <div className="relative">
                                    <textarea
                                        className="w-full h-24 px-4 py-2 border rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 text-xs font-mono resize-none focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                                        value={uploadForm.ocrContent}
                                        onChange={(e) => setUploadForm({ ...uploadForm, ocrContent: e.target.value })}
                                        placeholder="Klik tombol 'Proses OCR' untuk mengekstrak teks otomatis dari dokumen..."
                                    />
                                    {!uploadForm.ocrContent && !uploadForm.isProcessing && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <span className="text-slate-400 text-xs italic">Menunggu proses OCR...</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar if processing */}
                    {uploadForm.isProcessing && (
                        <div className="space-y-2 animate-in fade-in duration-300">
                            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                                <span>{uploadForm.processingMessage}</span>
                                <span className="animate-pulse font-bold text-indigo-500">Processing...</span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-indigo-600 h-full rounded-full animate-progress-indeterminate"></div>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button
                            onClick={() => setUploadModalOpen(false)}
                            className="px-4 py-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white font-bold text-sm transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            onClick={handleConfirmUpload}
                            disabled={uploadForm.isProcessing}
                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-lg shadow-indigo-500/30 transition-all transform active:scale-95 text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center gap-2"
                        >
                            <CloudUpload size={18} /> Upload & Proses Background
                        </button>
                    </div>
                </div>
            </Modal>

            {/* UPLOAD LOADING OVERLAY */}
            {
                isUploadingFile && (
                    <div className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm flex items-center justify-center">
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-2xl flex flex-col items-center animate-in zoom-in-95 max-w-sm text-center">
                            <div className="relative mb-6">
                                <div className="w-20 h-20 border-4 border-indigo-100 dark:border-indigo-900/30 rounded-full"></div>
                                <div className="w-20 h-20 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                                <FileText className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600 animate-pulse" size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Memproses Dokumen...</h3>
                            <p className="text-sm text-gray-500 dark:text-slate-400">
                                Sedang mengunggah, melakukan <b>OCR (Ekstraksi Teks)</b>, dan analisis vector. Mohon tunggu sebentar.
                            </p>
                        </div>
                    </div>
                )
            }
        </>
    );
}
