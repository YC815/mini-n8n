export type NodeID = string;
export type EdgeID = string;

export interface WorkflowNode {
  id: NodeID;                             // 唯一識別
  type: string;                           // React Flow 節點類型（例如 'fileUpload', 'filter'）
  position: { x: number; y: number };     // 節點座標
  data: {
    customName: string;                   // 用戶自定義的節點名稱
    params: Record<string, any>;          // 節點專屬參數（例如篩選條件、VLOOKUP 參數等）
    outputData?: any;                     // 該節點運算後產生的輸出（可在 Modal 顯示）
  };
}

export interface WorkflowEdge {
  id: EdgeID;                             // 唯一識別
  source: NodeID;                         // 出點節點 ID
  target: NodeID;                         // 入點節點 ID
  animated?: boolean;                     // 是否啟用連線動畫
  label?: string;                         // (可選) 連線標籤
}

export interface Workflow {
  nodes: WorkflowNode[];                  // 節點清單
  edges: WorkflowEdge[];                  // 連線清單
} 