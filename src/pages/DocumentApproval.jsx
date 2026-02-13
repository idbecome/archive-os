import React, { useState, useRef, useEffect } from 'react';
import { 
    FileCheck, Plus, Search, Clock, CheckCircle2, XCircle, User, 
    Building2, Paperclip, Send, ChevronRight, MoreVertical, 
    Trash2, Eye, Download, MessageSquare, ShieldCheck, ArrowRight, Edit3,
    FileDigit, FileText, Sparkles
} from 'lucide-react';
import { Card, SummaryCard } from '../components/ui/Card';
import Modal from '../components/common/Modal';
import { db as api } from '../services/database';

export default function DocumentApproval({ approvals = [], users = [], departments = [], currentUser, onRefresh, hasPermission, flows = [], syncApprovalFolder }) {
    const getFullUrl = (url) => {
        if (typeof url !== 'string' || !url.startsWith('/uploads/')) return url;
        const isDev = window.location.port === '3000' || window.location.port === '5173' || window.location.hostname === 'localhost';
        return isDev ? `http://${window.location.hostname}:5000${url}` : url;
    };

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedApproval, setSelectedApproval] = useState(null);
    const [editingApproval, setEditingApproval] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [previewFile, setPreviewFile] = useState(null);
    
    // Form State
    const [form, setForm] = useState({
        title: '',
        description: '',
        division: currentUser?.department || '',
        steps: [] // { username, name }
    });
    const [attachment, setNoteAttachment] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedFlowId, setSelectedFlowId] = useState("");

    // Action State
    const [actionNote, setActionNote] = useState('');
    const [actionAttachment, setActionAttachment] = useState(null);

    const handleAddStep = (user) => {
        if (form.steps.find(s => s.username === user.username)) return;
        setForm({ ...form, steps: [...form.steps, { username: user.username, name: user.name }] });
    };

    const handleRemoveStep = (index) => {
        const newSteps = [...form.steps];
        newSteps.splice(index, 1);
        setForm({ ...form, steps: newSteps });
    };

    const handleFlowChange = (flowId) => {
        setSelectedFlowId(flowId);
        if (!flowId) {
            setForm({ ...form, steps: [] });
            return;
        }
        const flow = flows.find(f => String(f.id) === String(flowId));
        if (flow) setForm({ ...form, steps: flow.steps || [] });
    };

    const handleEdit = (app, e) => {
        e.stopPropagation();
        setEditingApproval(app);
        setForm({
            title: app.title,
            description: app.description,
            division: app.division,
            steps: (app.steps || []).map(s => ({ username: s.approver_username, name: s.approver_name }))
        });
        // Cari flow yang cocok jika ada
        const matchingFlow = flows.find(f => JSON.stringify(f.steps) === JSON.stringify(app.steps.map(s => ({ username: s.approver_username, name: s.approver_name }))));
        setSelectedFlowId(matchingFlow ? matchingFlow.id : "");
        setNoteAttachment(null);
        setIsCreateModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!form.title || form.steps.length === 0) return alert("Judul dan minimal 1 Approver wajib diisi!");
        setIsSubmitting(true);
        
        // Sync folder ApprovalDoc
        await syncApprovalFolder(form.title, 'ACTIVE');

        try {
            let fileUrl = editingApproval ? editingApproval.attachment_url : null;
            let fileName = editingApproval ? editingApproval.attachment_name : null;
            
            if (attachment) {
                const uploadRes = await api.uploadFile(attachment);
                if (uploadRes.success) {
                    fileUrl = uploadRes.url;
                    fileName = attachment.name;
                }
            }

            const payload = {
                ...form,
                requester_name: currentUser.name,
                requester_username: currentUser.username,
                attachment_url: fileUrl,
                attachment_name: fileName
            };

            if (editingApproval) {
                await api.updateApproval(editingApproval.id, payload);
            } else {
                await api.createApproval(payload);
            }

            setIsCreateModalOpen(false);
            setEditingApproval(null);
            setForm({ title: '', description: '', division: currentUser?.department || '', steps: [] });
            setSelectedFlowId("");
            setNoteAttachment(null);
            onRefresh();
        } catch (e) {
            alert(e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAction = async (action) => {
        if (!selectedApproval) return;
        try {
            const formData = new FormData();
            formData.append('action', action);
            formData.append('note', actionNote);
            formData.append('username', currentUser.username);
            if (actionAttachment) {
                formData.append('file', actionAttachment);
            }

            await api.submitApprovalAction(selectedApproval.id, formData);
            setActionNote('');
            setActionAttachment(null);
            setSelectedApproval(null);
            onRefresh();
        } catch (e) { alert(e.message); }
    };

    const handleResetStep = async (stepIndex) => {
        if (!selectedApproval) return;
        if (!window.confirm("Apakah Anda yakin ingin menarik kembali/mengubah keputusan pada langkah ini? Alur akan diulang dari posisi Anda.")) return;
        try {
            await api.resetApprovalStep(selectedApproval.id, stepIndex);
            onRefresh();
            setSelectedApproval(null);
        } catch (e) { alert(e.message); }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm("Hapus pengajuan ini?")) return;
        try {
            await api.deleteApproval(id);
            onRefresh();
        } catch (e) { alert(e.message); }
    };

    const visibleApprovals = (approvals || []).filter(a => {
        if (!a) return false;
        const isAdmin = currentUser?.role === 'admin';
        const isRequester = a.requester_username === currentUser?.username;
        const isInTrail = (a.steps || []).some(step => step.approver_username === currentUser?.username);
        return isAdmin || isRequester || isInTrail;
    });

    const filteredApprovals = visibleApprovals.filter(a => 
        (a.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.requester_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SummaryCard title="Menunggu Persetujuan" value={visibleApprovals.filter(a => a?.status === 'Pending').length} icon={Clock} colorClass="bg-amber-100 text-amber-600" />
                <SummaryCard title="Disetujui" value={visibleApprovals.filter(a => a?.status === 'Approved').length} icon={CheckCircle2} colorClass="bg-emerald-100 text-emerald-600" />
                <SummaryCard title="Ditolak" value={visibleApprovals.filter(a => a?.status === 'Rejected').length} icon={XCircle} colorClass="bg-red-100 text-red-600" />
            </div>

            <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white"
                        placeholder="Cari pengajuan..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20"
                >
                    <Plus size={18} /> Buat Pengajuan
                </button>
            </div>

            {/* List View */}
            <div className="grid grid-cols-1 gap-4">
                {filteredApprovals.length === 0 && (
                    <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800">
                        <FileCheck size={48} className="mx-auto mb-4 text-slate-200 dark:text-slate-800" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Tidak ada data pengajuan</p>
                    </div>
                )}

                {filteredApprovals.map(app => (
                    <div 
                        key={app.id} 
                        onClick={() => setSelectedApproval(app)}
                        className="group bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all cursor-pointer shadow-sm hover:shadow-xl flex items-center gap-6"
                    >
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                            app?.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' : 
                            app?.status === 'Rejected' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                            <FileCheck size={28} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                                <h3 className="font-black text-slate-800 dark:text-white truncate">{app?.title}</h3>
                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                    app?.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 
                                    app?.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                }`}>{app?.status}</span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-slate-400 font-bold uppercase tracking-tight">
                                <span className="flex items-center gap-1"><User size={12} /> {app?.requester_name}</span>
                                <span className="flex items-center gap-1"><Building2 size={12} /> {app?.division}</span>
                                <span className="flex items-center gap-1"><Clock size={12} /> {app?.created_at ? new Date(app.created_at).toLocaleDateString() : '-'}</span>
                            </div>
                        </div>
                        
                        {/* Mini Progress Trail */}
                        <div className="hidden md:flex items-center gap-1">
                            {(app?.steps || []).map((step, idx) => (
                                <div key={idx} className="flex items-center">
                                    <div 
                                        className={`w-3 h-3 rounded-full border-2 ${
                                            step?.status === 'Approved' ? 'bg-emerald-500 border-emerald-200' : 
                                            step?.status === 'Rejected' ? 'bg-red-500 border-red-200' : 
                                            idx === app?.current_step_index ? 'bg-amber-500 border-amber-200 animate-pulse' : 'bg-slate-200 border-slate-100'
                                        }`}
                                        title={`${step?.approver_name || 'Unknown'}: ${step?.status || 'Pending'}`}
                                    />
                                    {idx < (app?.steps?.length || 0) - 1 && <div className="w-4 h-0.5 bg-slate-200 dark:bg-slate-700" />}
                                </div>
                            ))}
                        </div>
                        
                        {/* Delete Action for Requester or Admin */}
                        <div className="flex items-center gap-1">
                            {(currentUser?.role === 'admin' || (app?.status?.toLowerCase() === 'rejected' && app?.requester_username === currentUser?.username)) && (
                                <button onClick={(e) => handleEdit(app, e)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors" title="Edit & Ajukan Ulang">
                                    <Edit3 size={18} />
                                </button>
                            )}
                            {(currentUser?.role === 'admin' || (app?.status?.toLowerCase() === 'rejected' && app?.requester_username === currentUser?.username)) && (
                                <button onClick={(e) => handleDelete(app.id, e)} className="p-2 text-slate-300 hover:text-red-500 transition-colors" title="Hapus Pengajuan">
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>

                        <ChevronRight className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                    </div>
                ))}
            </div>

            {/* MODAL: CREATE NEW */}
            <Modal 
                isOpen={isCreateModalOpen} 
                onClose={() => { setIsCreateModalOpen(false); setEditingApproval(null); }} 
                title={editingApproval ? "Edit & Ajukan Ulang" : "Pengajuan Dokumen Baru"} 
                size="max-w-2xl"
            >
                <div className="space-y-6 pt-24 max-h-[80vh] overflow-y-auto custom-scrollbar px-1">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Judul Dokumen</label>
                            <input 
                                className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none dark:text-white font-bold"
                                placeholder="Contoh: Pengajuan Cuti / Reimbursement"
                                value={form.title}
                                onChange={e => setForm({...form, title: e.target.value})}
                            />
                        </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pilih Master Flow (Alur Baku)</label>
                        <select 
                            className="w-full px-5 py-3 bg-white dark:bg-slate-900 border-2 border-indigo-100 dark:border-indigo-800 rounded-2xl outline-none dark:text-white font-bold appearance-none"
                            value={selectedFlowId}
                            onChange={(e) => handleFlowChange(e.target.value)}
                        >
                            <option value="">-- Pilih Alur Persetujuan --</option>
                            {flows.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                    </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Divisi / Departemen</label>
                            <select 
                                className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none dark:text-white font-bold appearance-none"
                                value={form.division}
                                onChange={e => setForm({...form, division: e.target.value})}
                            >
                                {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                            </select>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Keterangan</label>
                        <textarea 
                            className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none dark:text-white font-medium resize-none"
                            rows="3"
                            placeholder="Jelaskan detail pengajuan..."
                            value={form.description}
                            onChange={e => setForm({...form, description: e.target.value})}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lampiran File</label>
                        <label className="flex items-center gap-3 px-5 py-4 bg-white dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:bg-indigo-50 transition-all group">
                            <Paperclip className="text-slate-400 group-hover:text-indigo-500" />
                            <span className="text-sm font-bold text-slate-500">{attachment ? attachment.name : 'Pilih file pendukung...'}</span>
                            <input type="file" className="hidden" onChange={e => setNoteAttachment(e.target.files[0])} />
                        </label>
                        {attachment && (
                            <div 
                                onClick={() => setPreviewFile({ url: URL.createObjectURL(attachment), name: attachment.name, isLocal: true })}
                                className="mt-2 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-900 h-40 flex items-center justify-center animate-in fade-in zoom-in-95 cursor-zoom-in group relative"
                            >
                                {attachment.type.startsWith('image/') ? (
                                    <img src={URL.createObjectURL(attachment)} alt="Preview" className="max-w-full max-h-full object-contain" />
                                ) : attachment.type === 'application/pdf' ? (
                                    <div className="flex flex-col items-center gap-2 text-slate-400">
                                        <FileDigit size={32} />
                                        <span className="text-[10px] font-bold uppercase">PDF Document</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-slate-400">
                                        <FileText size={32} />
                                        <span className="text-[10px] font-bold uppercase">File Attached</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all flex items-center justify-center">
                                    <div className="p-2 bg-white/90 dark:bg-slate-900/90 rounded-xl shadow-lg scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all text-indigo-600">
                                        <Eye size={20} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Dynamic Approver Steps */}
                    {selectedFlowId && (
                    <div className="space-y-4 p-6 rounded-[2rem] border transition-all bg-slate-100/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center">
                            <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-slate-500">
                                <ShieldCheck size={16} /> Alur Persetujuan (Terkunci)
                            </h4>
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full border border-amber-100 dark:border-amber-800">MASTER FLOW AKTIF</span>
                        </div>
                        
                        <div className="space-y-2">
                            {(form?.steps || []).map((step, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-3 rounded-2xl shadow-sm animate-in slide-in-from-left-2 bg-slate-50 dark:bg-slate-800/80">
                                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs font-black">{idx + 1}</div>
                                    <div className="flex-1">
                                        <p className="text-sm font-black text-slate-800 dark:text-white">{step.name}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">{step.username}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <button onClick={() => { setIsCreateModalOpen(false); setEditingApproval(null); }} className="flex-1 py-4 text-slate-500 font-black uppercase text-xs tracking-widest">Batal</button>
                        <button 
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-500/20 hover:bg-indigo-500 transition-all active:scale-95"
                        >
                            {isSubmitting ? 'Memproses...' : editingApproval ? 'Simpan & Ajukan Ulang' : 'Kirim Pengajuan'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* MODAL: DETAIL & TRAIL FLOW */}
            <Modal isOpen={!!selectedApproval} onClose={() => setSelectedApproval(null)} title="Detail & Alur Persetujuan" size="max-w-5xl">
                <div className="flex flex-col md:flex-row gap-8 pt-24 h-[75vh]">
                    {/* Left: Info */}
                    <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-2 block">Informasi Dokumen</span>
                            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-4 leading-tight">{selectedApproval?.title}</h2>
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">{selectedApproval?.description}</p>
                            
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
                                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Pengaju</p>
                                    <p className="text-sm font-bold dark:text-white">{selectedApproval?.requester_name}</p>
                                </div>
                                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
                                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Tanggal</p>
                                    <p className="text-sm font-bold dark:text-white">{new Date(selectedApproval?.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>

                            {selectedApproval?.attachment_url && (
                                <div className="space-y-4">
                                    <div className="p-4 bg-indigo-600 rounded-2xl text-white flex items-center justify-between group shadow-lg shadow-indigo-500/20">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <Paperclip size={20} />
                                            <span className="text-xs font-bold truncate">{selectedApproval.attachment_name}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => setPreviewFile({ url: selectedApproval.attachment_url, name: selectedApproval.attachment_name })}
                                                className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-all"
                                                title="Perbesar Preview"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <a href={getFullUrl(selectedApproval.attachment_url)} target="_blank" className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-all">
                                                <Download size={16} />
                                            </a>
                                        </div>
                                    </div>
                                    
                                    {/* Preview Section */}
                                    <div 
                                        onClick={() => setPreviewFile({ url: selectedApproval.attachment_url, name: selectedApproval.attachment_name })}
                                        className="rounded-[2rem] border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900 h-64 shadow-inner cursor-zoom-in group relative"
                                    >
                                        {selectedApproval.attachment_url.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                                            <img src={getFullUrl(selectedApproval.attachment_url)} alt="Preview" className="w-full h-full object-contain" />
                                        ) : selectedApproval.attachment_url.endsWith('.pdf') ? (
                                            <iframe src={getFullUrl(selectedApproval.attachment_url)} className="w-full h-full" title="Attachment Preview" />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-slate-300">
                                                <FileText size={48} className="mb-2 opacity-20" />
                                                <p className="text-[10px] font-black uppercase tracking-widest">Preview tidak tersedia</p>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all flex items-center justify-center">
                                            <div className="p-3 bg-white/90 dark:bg-slate-900/90 rounded-2xl shadow-xl scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-widest">
                                                <Eye size={16} /> Klik untuk Perbesar
                                            </div>
                                        </div>
                                    </div>

                                    {/* OCR Content Section */}
                                    {selectedApproval.ocr_content && (
                                        <div className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                                <Sparkles size={12} className="text-indigo-500" /> Hasil Ekstraksi Teks (OCR)
                                            </h4>
                                            <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar">
                                                {selectedApproval.ocr_content}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Action Box if current user is the active approver */}
                        {selectedApproval?.status === 'Pending' && 
                         (selectedApproval?.steps || [])[selectedApproval?.current_step_index]?.approver_username === currentUser?.username && (
                            <div className="p-6 bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-indigo-500 shadow-2xl animate-in zoom-in-95">
                                <h4 className="text-sm font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                    <ShieldCheck className="text-indigo-600" /> Keputusan Anda Diperlukan
                                </h4>
                                
                                <textarea 
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl mb-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                    placeholder="Tambahkan catatan (opsional)..."
                                    value={actionNote}
                                    onChange={e => setActionNote(e.target.value)}
                                />
                                <label className="flex items-center gap-2 cursor-pointer group mb-4">
                                    <div className={`p-2.5 rounded-2xl transition-all ${actionAttachment ? 'bg-emerald-100 text-emerald-600 shadow-lg shadow-emerald-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500'}`}>
                                        <Paperclip size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">{actionAttachment ? 'File Terpilih' : 'Lampiran Keputusan'}</span>
                                        <span className="text-[9px] font-bold text-indigo-500 truncate max-w-[200px]">{actionAttachment ? actionAttachment.name : 'Klik untuk tambah file pendukung...'}</span>
                                    </div>
                                    <input type="file" className="hidden" onChange={e => setActionAttachment(e.target.files[0])} />
                                </label>

                                {actionAttachment && (
                                    <div 
                                        onClick={() => setPreviewFile({ url: URL.createObjectURL(actionAttachment), name: actionAttachment.name, isLocal: true })}
                                        className="mt-2 mb-4 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-900 h-32 flex items-center justify-center animate-in fade-in zoom-in-95 cursor-zoom-in group relative"
                                    >
                                        {actionAttachment.type.startsWith('image/') ? (
                                            <img src={URL.createObjectURL(actionAttachment)} alt="Preview" className="max-w-full max-h-full object-contain" />
                                        ) : (
                                            <div className="flex flex-col items-center gap-2 text-slate-400">
                                                <FileDigit size={24} />
                                                <span className="text-[8px] font-bold uppercase">Dokumen Lampiran</span>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all flex items-center justify-center">
                                            <div className="p-2 bg-white/90 dark:bg-slate-900/90 rounded-xl shadow-lg scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all text-indigo-600">
                                                <Eye size={16} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => handleAction('Reject')}
                                        className="flex-1 py-3 bg-red-50 text-red-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-100 transition-all"
                                    >
                                        Tolak / Send Back
                                    </button>
                                    <button 
                                        onClick={() => handleAction('Approve')}
                                        className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-all"
                                    >
                                        Setujui Dokumen
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Visual Trail Flow */}
                    <div className="flex-1 flex flex-col">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                            <ArrowRight size={12} className="text-indigo-500" /> Approval Trail Flow
                        </h4>
                        
                        <div className="relative flex-1 pl-8">
                            {/* Vertical Line */}
                            <div className="absolute left-[47px] top-4 bottom-4 w-1 bg-slate-200 dark:bg-slate-800 rounded-full" />

                            <div className="space-y-10">
                                {/* Requester Node */}
                                <div className="relative pl-16">
                                    <div className="absolute left-0 top-0 w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-sm z-10 border-4 border-white dark:border-slate-900">
                                        <Send size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Submitted By</p>
                                        <p className="text-sm font-black text-slate-800 dark:text-white">{selectedApproval?.requester_name}</p>
                                        <p className="text-[10px] text-slate-400 font-bold">{new Date(selectedApproval?.created_at).toLocaleString()}</p>
                                    </div>
                                </div>

                                {/* Approver Steps */}
                                {(selectedApproval?.steps || []).map((step, idx) => {
                                    const isActive = selectedApproval?.status === 'Pending' && idx === selectedApproval?.current_step_index;
                                    const isDone = step?.status === 'Approved';
                                    const isRejected = step?.status === 'Rejected';
                                    
                                    return (
                                        <div key={idx} className="relative pl-16 group">
                                            {/* Node Icon */}
                                            <div className={`absolute left-0 top-0 w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl z-10 border-4 border-white dark:border-slate-900 transition-all duration-500 ${
                                                isDone ? 'bg-emerald-500 text-white' : 
                                                isRejected ? 'bg-red-500 text-white' : 
                                                isActive ? 'bg-amber-500 text-white scale-110 ring-4 ring-amber-500/20' : 'bg-slate-100 text-slate-400'
                                            }`}>
                                                {isDone ? <CheckCircle2 size={20} /> : isRejected ? <XCircle size={20} /> : <User size={20} />}
                                            </div>

                                            {/* Content Card */}
                                            <div className={`p-4 rounded-3xl border transition-all ${
                                                isActive ? 'bg-white dark:bg-slate-900 border-amber-200 shadow-xl -translate-y-1' : 
                                                'bg-white/50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'
                                            }`}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <p className={`text-[9px] font-black uppercase tracking-widest ${isActive ? 'text-amber-600' : 'text-slate-400'}`}>
                                                            Level {idx + 1}: {isActive ? 'Waiting Action' : (step?.status || 'Pending')}
                                                        </p>
                                                        <h5 className="text-sm font-black text-slate-800 dark:text-white">{step?.approver_name || 'Unknown'}</h5>
                                                    </div>
                                                    {step?.action_date && (
                                                        <span className="text-[9px] font-bold text-slate-400">{new Date(step?.action_date).toLocaleDateString()}</span>
                                                    )}
                                                </div>
                                                
                                                {step?.note && (
                                                    <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] font-medium text-slate-600 dark:text-slate-400 italic border-l-4 border-indigo-500">
                                                        "{step.note}"
                                                    </div>
                                                )}
                                                
                                                {step?.attachment_url && (
                                                    <div className="mt-3 flex items-center justify-between p-2.5 rounded-2xl border border-dashed bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                            <Paperclip size={12} className="text-indigo-500" />
                                                            <span className="text-[9px] font-bold truncate max-w-[150px]">{step.attachment_name}</span>
                                                        </div>
                                                        <button 
                                                            onClick={() => setPreviewFile({ url: step.attachment_url, name: step.attachment_name })}
                                                            className="text-[9px] font-black uppercase text-indigo-600 hover:underline ml-3"
                                                        >
                                                            Preview
                                                        </button>
                                                    </div>
                                                )}

                                                {step?.approver_username === currentUser?.username && step?.status !== 'Pending' && selectedApproval?.status !== 'Approved' && (
                                                    <button 
                                                        onClick={() => handleResetStep(idx)}
                                                        className="mt-3 text-[9px] font-black uppercase text-amber-600 hover:text-amber-700 hover:underline flex items-center gap-1 transition-all"
                                                    >
                                                        <Edit3 size={10} /> Ubah Keputusan
                                                    </button>
                                                )}
                                                
                                                {isActive && (
                                                    <div className="mt-3 flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                                                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-tighter">Current Process</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Final Status Node */}
                                {selectedApproval?.status && selectedApproval.status !== 'Pending' && (
                                    <div className="relative pl-16 animate-in zoom-in-95">
                                        <div className={`absolute left-0 top-0 w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl z-10 border-4 border-white dark:border-slate-900 ${
                                            selectedApproval?.status === 'Approved' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                                        }`}>
                                            <ShieldCheck size={24} />
                                        </div>
                                        <div className={`p-5 rounded-[2rem] text-white shadow-xl ${
                                            selectedApproval.status === 'Approved' ? 'bg-emerald-600 shadow-emerald-500/20' : 'bg-red-600 shadow-red-500/20'
                                        }`}>
                                            <h5 className="font-black uppercase tracking-widest text-xs mb-1">Final Result</h5>
                                            <p className="text-lg font-black">Document {selectedApproval.status}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button 
                            onClick={() => setSelectedApproval(null)}
                            className="mt-8 w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all"
                        >
                            Tutup Detail
                        </button>
                    </div>
                </div>
            </Modal>

            {/* FULL SCREEN PREVIEW MODAL */}
            <Modal
                isOpen={!!previewFile}
                onClose={() => setPreviewFile(null)}
                title={`Preview: ${previewFile?.name}`}
                size="max-w-7xl"
            >
                <div className="pt-24 h-[85vh] flex flex-col">
                    <div className="flex-1 bg-slate-100 dark:bg-slate-950 rounded-[2.5rem] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner">
                        {previewFile?.url && (previewFile.url.match(/\.(jpg|jpeg|png|webp)$/i) || (previewFile.isLocal && previewFile.name.match(/\.(jpg|jpeg|png|webp)$/i))) ? (
                            <img src={previewFile.isLocal ? previewFile.url : getFullUrl(previewFile.url)} alt="Full Preview" className="w-full h-full object-contain" />
                        ) : previewFile?.url && (previewFile.url.endsWith('.pdf') || (previewFile.isLocal && previewFile.name.endsWith('.pdf'))) ? (
                            <iframe src={previewFile.isLocal ? previewFile.url : getFullUrl(previewFile.url)} className="w-full h-full" title="Full PDF Preview" />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <FileText size={64} className="mb-4 opacity-20" />
                                <p className="font-black uppercase tracking-widest">Preview tidak tersedia untuk format ini</p>
                            </div>
                        )}
                    </div>
                    <div className="mt-6 flex justify-end">
                        <button onClick={() => setPreviewFile(null)} className="px-8 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">
                            Tutup Preview
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}