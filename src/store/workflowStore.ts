import { create } from "zustand";
import { WorkflowNode, WorkflowEdge, NodeID } from "@/types/workflow";
import { executeWorkflow } from "@/lib/workflowUtils";

// 定義 Excel 資料的型別
type ExcelData = (string | number | boolean)[][] | Record<string, string | number | boolean>[];

// 定義 store 中的狀態與動作
interface WorkflowState {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  excelData: ExcelData;                  // 原始上傳的 Excel 資料（可為二維陣列或物件陣列）
  currentEditingNodeId: NodeID | null;
  modalVisible: boolean;
  isExecuting: boolean;                  // 新增：是否正在執行工作流
  setNodes: (nodes: WorkflowNode[]) => void;
  setEdges: (edges: WorkflowEdge[]) => void;
  setExcelData: (data: ExcelData) => void;
  addNode: (node: WorkflowNode) => void;
  updateNode: (id: NodeID, data: Partial<WorkflowNode["data"]>) => void;
  removeNode: (id: NodeID) => void;
  addEdge: (edge: WorkflowEdge) => void;
  removeEdge: (id: string) => void;
  openModal: (nodeId: NodeID) => void;
  closeModal: () => void;
  replaceWorkflow: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => void;
  executeWorkflow: () => void;           // 新增：執行工作流的方法
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: [],
  edges: [],
  excelData: [],
  currentEditingNodeId: null,
  modalVisible: false,
  isExecuting: false,                    // 新增：預設為 false
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
  replaceWorkflow: (nodes, edges) => set({ nodes, edges }),
  executeWorkflow: () => {
    const state = get();
    if (state.isExecuting) return;
    
    set({ isExecuting: true });
    try {
      // 將 excelData 轉換為二維陣列格式
      const excelDataArray = Array.isArray(state.excelData) && state.excelData.length > 0 && Array.isArray(state.excelData[0])
        ? state.excelData
        : (state.excelData as Record<string, string | number | boolean>[]).map(row => Object.values(row));

      const updatedNodes = executeWorkflow(
        { nodes: state.nodes, edges: state.edges },
        excelDataArray as (string | number | boolean)[][]
      );
      set({ nodes: updatedNodes });
    } catch (error) {
      console.error('執行工作流時發生錯誤:', error);
    } finally {
      set({ isExecuting: false });
    }
  },
})); 