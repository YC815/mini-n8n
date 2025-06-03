"use client";

import React, { useCallback, useEffect, useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Connection,
  ReactFlowProvider,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  NodeTypes,
} from "reactflow";
import "reactflow/dist/style.css";
import { useWorkflowStore } from "@/store/workflowStore";
import { WorkflowEdge, WorkflowNode } from "@/types/workflow";
// import CustomNodeTypes from "./custom-nodes"; // 匯入自訂節點類型

// 暫時定義 CustomNodeTypes，待後續建立自訂節點後再修改
const CustomNodeTypes = {};

// 自訂節點元件
import UploadNode from "./custom-nodes/UploadNode";
import FilterNode from "./custom-nodes/FilterNode";
import VlookupNode from "./custom-nodes/VlookupNode";
import MergeNode from "./custom-nodes/MergeNode";
import ExportNode from "./custom-nodes/ExportNode";

// 定義自訂節點類型（移到組件外部）
const nodeTypes: NodeTypes = {
  upload: UploadNode,
  filter: FilterNode,
  vlookup: VlookupNode,
  merge: MergeNode,
  export: ExportNode,
};

export default function FlowCanvas() {
  const { nodes: storeNodes, edges: storeEdges, setNodes, setEdges, addEdge: storeAddEdge, openModal } = useWorkflowStore();

  // 將 store 的 nodes/edges 傳給 React Flow 的 hooks
  // rfNodes, setRfNodes 是 React Flow 內部的狀態
  const [rfNodes, setRfNodes, onReactFlowNodesChange] = useNodesState(storeNodes as Node[]);
  const [rfEdges, setRfEdges, onReactFlowEdgesChange] = useEdgesState(storeEdges as Edge[]);

  // 當 store 中的 nodes 更新時，同步到 React Flow 的內部狀態
  useEffect(() => {
    // 進行比較避免不必要的更新和潛在的無限迴圈
    // 注意：這裡的比較可能需要更深層次的比較，如果節點內部結構複雜
    if (JSON.stringify(storeNodes) !== JSON.stringify(rfNodes)) {
      setRfNodes(storeNodes as Node[]);
    }
  }, [storeNodes, setRfNodes, rfNodes]);

  // 當 store 中的 edges 更新時，同步到 React Flow 的內部狀態
  useEffect(() => {
    if (JSON.stringify(storeEdges) !== JSON.stringify(rfEdges)) {
      setRfEdges(storeEdges as Edge[]);
    }
  }, [storeEdges, setRfEdges, rfEdges]);

  // 當 React Flow 內部節點變化時，更新 Zustand store
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // applyNodeChanges 會回傳更新後的 nodes 陣列
      const updatedNodes = applyNodeChanges(changes, storeNodes) as WorkflowNode[];
      setNodes(updatedNodes.map(node => ({
        ...node,
        // 確保 type 屬性存在，React Flow 有時在內部操作後可能會移除
        type: node.type || storeNodes.find(n => n.id === node.id)?.type || 'default',
      })));
    },
    [storeNodes, setNodes]
  );

  // 當 React Flow 內部連線變化時，更新 Zustand store
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const updatedEdges = applyEdgeChanges(changes, storeEdges) as WorkflowEdge[];
      setEdges(updatedEdges.map(edge => ({
        ...edge,
        // 確保 label 是 string 或 undefined
        label: typeof edge.label === 'string' ? edge.label : undefined,
      })));
    },
    [storeEdges, setEdges]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return; // 確保 source 和 target 都存在
      const newEdge: WorkflowEdge = {
        id: `e-${params.source}-${params.target}`,
        source: params.source,
        target: params.target,
        animated: true,
        // label: "new edge" // 可選: 設定預設 label
      };
      storeAddEdge(newEdge);
    },
    [storeAddEdge]
  );

  return (
    <ReactFlowProvider> {/* ReactFlowProvider 需要包裹 ReactFlow 實例 */}
      <ReactFlow
        nodes={rfNodes} // 使用 React Flow 內部狀態 rfNodes
        edges={rfEdges} // 使用 React Flow 內部狀態 rfEdges
        onNodesChange={onNodesChange} // 使用我們包裝過的 onNodesChange
        onEdgesChange={onEdgesChange} // 使用我們包裝過的 onEdgesChange
        onConnect={onConnect}
        nodeTypes={nodeTypes} // 傳遞自訂節點類型
        fitView
        panOnScroll
        zoomOnScroll
        attributionPosition="bottom-right"
        className="bg-gray-100" // 給畫布一個背景色
      >
        <Background />
        <MiniMap />
        <Controls />
      </ReactFlow>
    </ReactFlowProvider>
  );
} 