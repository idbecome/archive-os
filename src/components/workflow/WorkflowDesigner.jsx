
import React, { useState, useCallback, useMemo } from 'react';
import {
    ReactFlow,
    Controls,
    Background,
    applyNodeChanges,
    applyEdgeChanges,
    addEdge,
    Panel,
    MarkerType,
    Handle,
    Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { User, ShieldCheck, Play, Flag, Trash2, Save, X } from 'lucide-react';

// --- Custom Nodes ---

const StartNode = () => (
    <div className="px-6 py-3 rounded-2xl bg-emerald-500 text-white shadow-xl border-2 border-emerald-400 flex items-center gap-3 min-w-[150px]">
        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <Play size={18} fill="white" />
        </div>
        <div>
            <p className="text-[10px] font-black uppercase opacity-70">Trigger</p>
            <p className="font-bold">START</p>
        </div>
        <Handle type="source" position={Position.Right} className="w-3 h-3 bg-emerald-300 border-2 border-white" />
    </div>
);

const EndNode = () => (
    <div className="px-6 py-3 rounded-2xl bg-indigo-600 text-white shadow-xl border-2 border-indigo-400 flex items-center gap-3 min-w-[150px]">
        <Handle type="target" position={Position.Left} className="w-3 h-3 bg-indigo-300 border-2 border-white" />
        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <Flag size={18} fill="white" />
        </div>
        <div>
            <p className="text-[10px] font-black uppercase opacity-70">Status</p>
            <p className="font-bold">COMPLETED</p>
        </div>
    </div>
);

const ApproverNode = ({ data }) => (
    <div className="px-6 py-4 rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border-2 border-indigo-100 dark:border-indigo-800 min-w-[200px] group relative hover:border-indigo-500 transition-all">
        <Handle type="target" position={Position.Left} className="w-3 h-3 bg-indigo-500 border-2 border-white" />

        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <ShieldCheck size={20} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Approver</p>
                <p className="font-bold text-slate-800 dark:text-white truncate">{data.label || 'Pilih User...'}</p>
                <p className="text-[9px] text-indigo-500 font-bold truncate">{data.username || '-'}</p>
            </div>
        </div>

        <Handle type="source" position={Position.Right} className="w-3 h-3 bg-indigo-500 border-2 border-white" />
    </div>
);

const nodeTypes = {
    start: StartNode,
    end: EndNode,
    approver: ApproverNode,
};

// --- Designer Component ---

export default function WorkflowDesigner({ initialNodes = [], initialEdges = [], onSave, onClose, users = [] }) {
    const [nodes, setNodes] = useState(initialNodes.length > 0 ? initialNodes : [
        { id: 'start', type: 'start', position: { x: 50, y: 150 }, data: { label: 'Start' } },
        { id: 'end', type: 'end', position: { x: 600, y: 150 }, data: { label: 'End' } },
    ]);
    const [edges, setEdges] = useState(initialEdges);
    const [selectedNode, setSelectedNode] = useState(null);

    const onNodesChange = useCallback(
        (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
        [setNodes]
    );
    const onEdgesChange = useCallback(
        (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
        [setEdges]
    );
    const onConnect = useCallback(
        (params) => setEdges((eds) => addEdge({
            ...params,
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
            style: { strokeWidth: 2, stroke: '#6366f1' }
        }, eds)),
        [setEdges]
    );

    const addApprover = () => {
        const id = `node_${Date.now()}`;
        const newNode = {
            id,
            type: 'approver',
            position: { x: 300, y: 150 },
            data: { label: 'Klik untuk set user', username: '' },
        };
        setNodes((nds) => nds.concat(newNode));
    };

    const handleNodeClick = (event, node) => {
        if (node.type === 'approver') {
            setSelectedNode(node);
        } else {
            setSelectedNode(null);
        }
    };

    const updateNodeData = (username, name) => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === selectedNode.id) {
                    return {
                        ...node,
                        data: { ...node.data, label: name, username: username },
                    };
                }
                return node;
            })
        );
        setSelectedNode(null);
    };

    const deleteNode = (id) => {
        if (id === 'start' || id === 'end') return;
        setNodes((nds) => nds.filter((n) => n.id !== id));
        setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
        setSelectedNode(null);
    };

    const handleSave = () => {
        // Validate connectivity
        const hasStartToFinish = true; // Placeholder for simple DFS check
        onSave({ nodes, edges });
    };

    return (
        <div className="w-full h-full bg-slate-50 dark:bg-slate-950 relative overflow-hidden flex">
            {/* Toolbar */}
            <div className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-6 z-10 shadow-2xl">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                        <Save className="text-indigo-500" size={20} /> Workflow
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                <div className="space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aksi</p>
                    <button
                        onClick={addApprover}
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20"
                    >
                        <User size={16} /> Tambah Approver
                    </button>
                </div>

                {selectedNode && (
                    <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="flex justify-between items-center">
                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Node Properties</p>
                            <button onClick={() => deleteNode(selectedNode.id)} className="text-red-500 hover:text-red-600 p-1">
                                <Trash2 size={16} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-tight">Pilih User Approver</label>
                            <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto no-scrollbar">
                                {users.map(u => (
                                    <button
                                        key={u.username}
                                        onClick={() => updateNodeData(u.username, u.name)}
                                        className={`w-full text-left p-3 rounded-xl border-2 transition-all ${selectedNode.data.username === u.username ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-transparent bg-slate-50 dark:bg-slate-800 hover:border-slate-200'}`}
                                    >
                                        <p className="text-sm font-bold dark:text-white">{u.name}</p>
                                        <p className="text-[10px] text-slate-400">{u.username} - {u.department}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800">
                    <button
                        onClick={handleSave}
                        className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-500/20"
                    >
                        Terapkan Alur
                    </button>
                </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 relative">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    nodeTypes={nodeTypes}
                    onNodeClick={handleNodeClick}
                    fitView
                    className="bg-slate-50 dark:bg-[#0B1437]"
                >
                    <Background color="#94a3b8" gap={20} size={1} />
                    <Controls />
                    <Panel position="top-right" className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-white/20 shadow-xl">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Flow</p>
                        <p className="text-xs font-bold text-slate-800 dark:text-white">Drafting Master Flow</p>
                    </Panel>
                </ReactFlow>
            </div>
        </div>
    );
}
