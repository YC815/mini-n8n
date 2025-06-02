import { create } from "zustand";
import { WorkflowNode, WorkflowEdge, NodeID } from "@/types/workflow";

// 定義 store 中的狀態與動作
interface WorkflowState {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  excelData: any[];                  // 原始上傳的 Excel 資料（可為二維陣列或物件陣列）
  currentEditingNodeId: NodeID | null;
  modalVisible: boolean;
  setNodes: (nodes: WorkflowNode[]) => void;
  setEdges: (edges: WorkflowEdge[]) => void;
  setExcelData: (data: any[]) => void;
  addNode: (node: WorkflowNode) => void;
  updateNode: (id: NodeID, data: Partial<WorkflowNode["data"]>) => void;
  removeNode: (id: NodeID) => void;
  addEdge: (edge: WorkflowEdge) => void;
  removeEdge: (id: string) => void;
  openModal: (nodeId: NodeID) => void;
  closeModal: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  nodes: [],
  edges: [],
  excelData: [],
  currentEditingNodeId: null,
  modalVisible: false,
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setExcelData: (data) => set({ excelData: data }),
  addNode: (node) => set((state) => ({ nodes: [...state.nodes, node] })),
  updateNode: (id, data) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...data } } : node
      ),
    })),
  removeNode: (id) =>
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== id),
      edges: state.edges.filter((edge) => edge.source !== id && edge.target !== id),
    })),
  addEdge: (edge) => set((state) => ({ edges: [...state.edges, edge] })),
  removeEdge: (id) =>
    set((state) => ({ edges: state.edges.filter((edge) => edge.id !== id) })),
  openModal: (nodeId) => set({ currentEditingNodeId: nodeId, modalVisible: true }),
  closeModal: () => set({ currentEditingNodeId: null, modalVisible: false }),
})); 