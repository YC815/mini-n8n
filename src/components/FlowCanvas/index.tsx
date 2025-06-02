"use client";

import React, { useCallback, useEffect } from "react";
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
} from "reactflow";
import "reactflow/dist/style.css";
import { useWorkflowStore } from "@/store/workflowStore";
import { WorkflowEdge } from "@/types/workflow";
// import CustomNodeTypes from "./custom-nodes"; // 匯入自訂節點類型

// 暫時定義 CustomNodeTypes，待後續建立自訂節點後再修改
const CustomNodeTypes = {};

export default function FlowCanvas() {
  const { nodes: storeNodes, edges: storeEdges, setNodes, setEdges, addEdge: storeAddEdge, openModal } = useWorkflowStore();

  // React Flow 提供的 hook，可簡化節點／連線管理
  // 注意：這裡的初始值直接使用 store 的狀態，但 React Flow 內部仍會維護自己的狀態
  const [rfNodes, setRfNodes] = useNodesState(storeNodes);
  const [rfEdges, setRfEdges] = useEdgesState(storeEdges);

  // 當 store中的 nodes 更新時，同步到 React Flow 的內部狀態
  useEffect(() => {
    setRfNodes(storeNodes);
  }, [storeNodes, setRfNodes]);

  // 當 store中的 edges 更新時，同步到 React Flow 的內部狀態
  useEffect(() => {
    setRfEdges(storeEdges);
  }, [storeEdges, setRfEdges]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const updatedNodes = applyNodeChanges(changes, storeNodes);
      setNodes(updatedNodes.map(node => ({
        ...node,
        type: node.type || 'default' // 確保 type 屬性存在
      })));
    },
    [setNodes, storeNodes]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const updatedEdges = applyEdgeChanges(changes, storeEdges);
      setEdges(updatedEdges.map(edge => ({
        ...edge,
        label: typeof edge.label === 'string' ? edge.label : undefined
      })));
    },
    [setEdges, storeEdges]
  );

  // 處理新增連線
  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge: WorkflowEdge = {
        id: `e-${params.source}-${params.target}`,
        source: params.source!,
        target: params.target!,
        animated: true,
        label: undefined
      };
      storeAddEdge(newEdge);
    },
    [storeAddEdge]
  );

  // 雙擊節點時開啟 Modal
  const onNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node) => {
    openModal(node.id);
  }, [openModal]);

  return (
    <ReactFlowProvider>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDoubleClick={onNodeDoubleClick}
        nodeTypes={CustomNodeTypes}
        panOnScroll
        zoomOnScroll
        fitView
        attributionPosition="bottom-right"
      >
        <Background />
        <MiniMap />
        <Controls />
      </ReactFlow>
    </ReactFlowProvider>
  );
} 