export type NodeID = string;
export type EdgeID = string;

// 定義節點輸出資料的型別
export type NodeOutput = Record<string, string | number | boolean>[];

// 定義不同節點類型的參數
export interface UploadParams {
  fileName?: string; // 給 UploadNode 使用
}

export interface FilterParams {
  field?: string;
  operator?: "equals" | "greater" | "less" | "contains";
  value?: string;
}

export interface VlookupParams {
  lookupField?: string;
  targetField?: string;
  returnField?: string; // 報告中的 searchKey 對應到這裡可能是 returnField 或一個具體的值
}

export interface MergeParams {
  key?: string;
  joinType?: 'left' | 'inner' | 'right' | 'outer';
  // otherTable?: (string | number | boolean)[][]; // otherTable 的數據源由 executeWorkflow 決定
}

export interface ExportParams {
  fileName?: string; // 給 ExportNode 使用
}

export interface DeleteParams {
  mode: "row" | "col";
  selectedField?: string;
  operator?: "=" | ">" | "<" | "contains";
  filterValue?: string;
}

// 節點參數的聯合型別
export type NodeParams = {
  upload?: UploadParams;
  filter?: FilterParams;
  vlookup?: VlookupParams;
  merge?: MergeParams;
  export?: ExportParams;
  delete?: DeleteParams;
  [key: string]: unknown; // 允許其他任意參數，但建議具體化
};

export interface WorkflowNodeData {
  customName: string;
  params: NodeParams;        
  outputData?: NodeOutput;
  fileName?: string; // 通用 fileName 屬性，主要由 UploadNode 使用和更新
}

export interface WorkflowNode {
  id: NodeID;                             // 唯一識別
  type: string;                           // React Flow 節點類型
  position: { x: number; y: number };     // 節點坐標
  data: WorkflowNodeData; // 使用獨立的 interface 管理 data 結構
}

export interface WorkflowEdge {
  id: EdgeID;                             // 唯一識別
  source: NodeID;                         // 出點節點 ID
  target: NodeID;                         // 入點節點 ID
  animated?: boolean;                     // 是否開啟連線動畫
  label?: string;                         // (可選) 連線標籤
}

export interface Workflow {
  nodes: WorkflowNode[];                  // 節點陣列
  edges: WorkflowEdge[];                  // 連線陣列
} 