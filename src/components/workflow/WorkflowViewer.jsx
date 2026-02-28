
import React, { useMemo } from 'react';
import {
    ReactFlow,
    Controls,
    Background,
    MarkerType,
    Handle,
    Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ShieldCheck, Play, Flag, CheckCircle2, XCircle, Clock } from 'lucide-react';

// --- Custom Nodes (Read-only version) ---

const StartNode = () => (
    <div className="px-6 py-3 rounded-2xl bg-emerald-500 text-white shadow-xl border-2 border-emerald-400 flex items-center gap-3 min-w-[150px]">
        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <Play size={18} fill="white" />
        </div>
        <div>
            <p className="text-[10px] font-black uppercase opacity-70">Trigger</p>
            <p className="font-bold">START</p>
        </div>
        <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
);

const EndNode = ({ data }) => (
    <div className={`px-6 py-3 rounded-2xl text-white shadow-xl border-2 flex items-center gap-3 min-w-[150px] ${data.status === 'Completed' ? 'bg-indigo-600 border-indigo-400' : 'bg-slate-400 border-slate-300'}`}>
        <Handle type="target" position={Position.Left} className="opacity-0" />
        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <Flag size={18} fill="white" />
        </div>
        <div>
            <p className="text-[10px] font-black uppercase opacity-70">Status</p>
            <p className="font-bold uppercase tracking-tight">{data.status || 'END'}</p>
        </div>
    </div>
);

const ApproverNode = ({ data }) => {
    const isDone = data.status === 'Approved';
    const isRejected = data.status === 'Rejected';
    const isActive = data.status === 'Active' || data.status === 'Pending_Active';

    return (
        <div className={`px-6 py-4 rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border-2 min-w-[200px] transition-all ${isDone ? 'border-emerald-500' :
            isRejected ? 'border-red-500' :
                isActive ? 'border-amber-500 ring-4 ring-amber-500/20 scale-105 z-50' :
                    'border-slate-100 dark:border-slate-800'
            }`}>
            <Handle type="target" position={Position.Left} className="opacity-0" />
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDone ? 'bg-emerald-50 text-emerald-600' :
                    isRejected ? 'bg-red-50 text-red-600' :
                        isActive ? 'bg-amber-50 text-amber-600 animate-pulse' :
                            'bg-slate-50 dark:bg-slate-800 text-slate-400'
                    }`}>
                    {isDone ? <CheckCircle2 size={20} /> :
                        isRejected ? <XCircle size={20} /> :
                            isActive ? <Clock size={20} /> : <ShieldCheck size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{data.role || 'Approver'}</p>
                    <p className="font-bold text-slate-800 dark:text-white truncate">{data.label}</p>
                    <div className="flex items-center gap-1 mt-1">
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter ${isDone ? 'bg-emerald-500/10 text-emerald-600' :
                            isRejected ? 'bg-red-500/10 text-red-600' :
                                isActive ? 'bg-amber-500/10 text-amber-600' :
                                    'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}>
                            {data.status || 'Waiting'}
                        </span>
                    </div>
                </div>
            </div>
            {data.action_date && (
                <p className="text-[8px] text-slate-400 mt-2 font-bold italic">Done: {new Date(data.action_date).toLocaleDateString()}</p>
            )}
            <Handle type="source" position={Position.Right} className="opacity-0" />
        </div>
    );
};

const nodeTypes = {
    start: StartNode,
    end: EndNode,
    approver: ApproverNode,
};

export default function WorkflowViewer({ nodes = [], edges = [], currentStepNodeId, approvalStatus, stepsStatus = [] }) {
    const processedNodes = useMemo(() => {
        return nodes.map(node => {
            if (node.type === 'approver') {
                // Find step status for this node
                const step = stepsStatus.find(s => s.node_id === node.id);
                const isNodeActive = node.id === currentStepNodeId && approvalStatus === 'Pending';

                return {
                    ...node,
                    data: {
                        ...node.data,
                        status: isNodeActive ? 'Active' : (step?.status || 'Pending'),
                        action_date: step?.action_date
                    }
                };
            }
            if (node.type === 'end') {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        status: approvalStatus === 'Approved' ? 'Completed' : (approvalStatus === 'Rejected' ? 'Stopped' : 'Pending')
                    }
                };
            }
            return node;
        });
    }, [nodes, currentStepNodeId, approvalStatus, stepsStatus]);

    const processedEdges = useMemo(() => {
        return edges.map(edge => ({
            ...edge,
            animated: true,
            style: { strokeWidth: 2, stroke: '#6366f1' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' }
        }));
    }, [edges]);

    return (
        <div className="w-full h-full bg-slate-50 dark:bg-[#0B1437]">
            <ReactFlow
                nodes={processedNodes}
                edges={processedEdges}
                nodeTypes={nodeTypes}
                fitView
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                panOnScroll
                className="bg-transparent"
            >
                <Background color="#94a3b8" gap={20} size={1} />
                <Controls />
            </ReactFlow>
        </div>
    );
}
