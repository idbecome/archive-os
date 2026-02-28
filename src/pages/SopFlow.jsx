import React, { useState, useEffect } from 'react';
import { GitBranch, Plus, Trash2, Edit3, Search, Info } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { sopService } from '../services/sopService';
import { parseApiError } from '../utils/errorHandler';
import Modal from '../components/common/Modal';
import WorkflowDesigner from '../components/workflow/WorkflowDesigner';
import WorkflowViewer from '../components/workflow/WorkflowViewer';

export default function SopFlow({ currentUser, hasPermission, users = [], syncSopFolder }) {
    const [flows, setFlows] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingFlow, setEditingFlow] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedFlow, setSelectedFlow] = useState(null);

    const [form, setForm] = useState({
        title: '',
        description: '',
        category: 'Operasional',
        steps: [{ title: '', pic: '', documents: [] }]
    });

    const fetchFlows = async () => {
        setIsLoading(true);
        try {
            const data = await sopService.getFlows();
            setFlows(data || []);
        } catch (e) {
            const msg = await parseApiError(e);
            console.error("Fetch flows failed:", msg);
        }
        finally { setIsLoading(false); }
    };

    useEffect(() => { fetchFlows(); }, []);

    const handleSaveVisual = async (updatedForm) => {
        if (!updatedForm.title) return alert("Judul SOP wajib diisi!");

        const oldTitle = flows.find(f => f.id === editingFlow?.id)?.title;
        await syncSopFolder(updatedForm.title, oldTitle);

        // Sanitasi data visual_config untuk mencegah Error #008
        const sanitizedVisualConfig = {
            nodes: updatedForm.visual_config?.nodes || [],
            edges: (updatedForm.visual_config?.edges || []).map(edge => ({
                ...edge,
                type: 'smoothstep',
                // Jika handle bernilai null atau string "null", hapus propertinya 
                // agar React Flow menggunakan default handle
                sourceHandle: (edge.sourceHandle === null || edge.sourceHandle === "null") ? undefined : edge.sourceHandle,
                targetHandle: (edge.targetHandle === null || edge.targetHandle === "null") ? undefined : edge.targetHandle
            }))
        };

        try {
            const payload = {
                ...updatedForm,
                visual_config: sanitizedVisualConfig,
                owner: currentUser?.username
            };

            if (editingFlow) await sopService.updateFlow(editingFlow.id, payload);
            else await sopService.createFlow(payload);
            setIsModalOpen(false);
            fetchFlows();
        } catch (e) {
            const msg = await parseApiError(e);
            alert(msg);
        }
    };

    const handleDelete = async (e, id) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (!window.confirm("Hapus SOP ini?")) return;
        try {
            await sopService.deleteFlow(id);
            fetchFlows();
        } catch (e) {
            const msg = await parseApiError(e);
            alert(msg);
        }
    };

    const filteredFlows = flows.filter(f =>
        f.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="relative flex-1 w-full md:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                        placeholder="Cari standarisasi kerja..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => {
                        setEditingFlow(null);
                        setForm({ title: '', description: '', category: 'Operasional', steps: [], visual_config: null });
                        setIsModalOpen(true);
                    }}
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20"
                >
                    <Plus size={18} /> Buat Flow SOP
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredFlows.map(flow => (
                    <Card key={flow.id} className="group hover:border-indigo-500 transition-all relative overflow-hidden flex flex-col h-full">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <GitBranch size={80} />
                        </div>

                        {/* AREA KLIK UNTUK VIEW (ATAS) */}
                        <div className="flex-1 cursor-pointer" onClick={() => setSelectedFlow(flow)}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl text-indigo-600">
                                    <GitBranch size={24} />
                                </div>
                            </div>
                            <h3 className="font-black text-slate-800 dark:text-white text-lg mb-1">{flow.title}</h3>
                            <p className="text-xs text-slate-500 line-clamp-2 mb-4">{flow.description}</p>
                            <div className="space-y-2 mb-4">
                                {(flow.steps || []).slice(0, 3).map((step, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        <div className="w-4 h-4 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">{idx + 1}</div>
                                        <span className="truncate">{step.title}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* AREA TOMBOL AKSI (BAWAH) - TERISOLASI */}
                        <div className="mt-auto pt-4 border-t border-slate-50 dark:border-slate-800 flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingFlow(flow); setForm(flow); setIsModalOpen(true); }}
                                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95"
                            >
                                <Edit3 size={16} /> Edit Flow
                            </button>
                            <button
                                type="button"
                                onClick={(e) => handleDelete(e, flow.id)}
                                className="px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 transition-all border border-red-100 dark:border-red-900/30 active:scale-95"
                                title="Hapus SOP"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </Card>
                ))}
            </div>

            {/* MODAL: VISUAL WORKFLOW DESIGNER */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingFlow ? `Edit SOP: ${form.title}` : "Buat Standarisasi Kerja (SOP)"}
                size="max-w-7xl"
                noPadding
            >
                <div className="flex flex-col h-[85vh]">
                    <div className="p-6 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Judul SOP</label>
                            <input
                                className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none dark:text-white font-black"
                                placeholder="Contoh: Alur Pengarsipan Invoice"
                                value={form.title}
                                onChange={e => setForm({ ...form, title: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kategori</label>
                            <select
                                className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none dark:text-white font-bold appearance-none"
                                value={form.category}
                                onChange={e => setForm({ ...form, category: e.target.value })}
                            >
                                <option>Operasional</option><option>Finance</option><option>HR</option><option>IT</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex-1 min-h-0">
                        <WorkflowDesigner
                            initialNodes={form.visual_config?.nodes || []}
                            initialEdges={form.visual_config?.edges || []}
                            users={users}
                            onClose={() => setIsModalOpen(false)}
                            onSave={(visualData) => {
                                const approverNodes = visualData.nodes.filter(n => n.type === 'approver');
                                const steps = approverNodes.map(n => ({
                                    title: n.data.label,
                                    pic: n.data.username,
                                    documents: n.data.documents || [],
                                    instruction: n.data.instruction || n.data.notes || ''
                                }));

                                handleSaveVisual({
                                    ...form,
                                    steps,
                                    visual_config: visualData
                                });
                            }}
                        />
                    </div>
                </div>
            </Modal>

            {/* MODAL: WORKFLOW VIEWER */}
            <Modal
                isOpen={!!selectedFlow}
                onClose={() => setSelectedFlow(null)}
                title={`Detail SOP: ${selectedFlow?.title}`}
                size="max-w-6xl"
                noPadding
            >
                <div className="flex flex-col h-[80vh]">
                    {/* SOP Info Header */}
                    <div className="p-5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-black text-slate-800 dark:text-white">{selectedFlow?.title}</h3>
                                <p className="text-xs text-slate-500 mt-1">{selectedFlow?.description}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-lg text-[10px] font-black uppercase">
                                    {selectedFlow?.category || 'Operasional'}
                                </span>
                                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg text-[10px] font-bold">
                                    {selectedFlow?.steps?.length || 0} Langkah
                                </span>
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-3 font-bold flex items-center gap-1">
                            💡 Klik blok approver untuk melihat detail instruksi & lampiran
                        </p>
                    </div>

                    {/* Full Flow Canvas */}
                    <div className="flex-1 min-h-0 relative">
                        {selectedFlow?.visual_config ? (() => {
                            const config = typeof selectedFlow.visual_config === 'string' ? JSON.parse(selectedFlow.visual_config) : selectedFlow.visual_config;

                            const nodesWithStrings = (config.nodes || []).map(node => ({
                                ...node,
                                id: String(node.id)
                            }));

                            const edgesWithArrows = (config.edges || [])
                                .filter(edge => edge.source && edge.target)
                                .map((edge, eIdx) => ({
                                    ...edge,
                                    id: String(edge.id || `edge-${selectedFlow?.id}-${eIdx}`),
                                    source: String(edge.source),
                                    target: String(edge.target),
                                    type: 'smoothstep',
                                    style: { stroke: '#6366f1', strokeWidth: 2 },
                                    markerEnd: { type: 'arrowclosed', color: '#6366f1', width: 20, height: 20 },
                                    sourceHandle: (edge.sourceHandle === null || edge.sourceHandle === "null") ? undefined : edge.sourceHandle,
                                    targetHandle: (edge.targetHandle === null || edge.targetHandle === "null") ? undefined : edge.targetHandle
                                }));
                            return (
                                <WorkflowViewer
                                    key={selectedFlow?.id}
                                    nodes={nodesWithStrings}
                                    edges={edgesWithArrows}
                                    sopMode={true}
                                />
                            );
                        })() : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <Info size={48} className="mb-4 opacity-20" />
                                <p className="text-sm font-bold uppercase tracking-widest">Visualisasi tidak tersedia</p>
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
}