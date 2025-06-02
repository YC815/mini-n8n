import { WorkflowNode, WorkflowEdge, Workflow } from "@/types/workflow";
import * as XLSX from "xlsx";

/**
 * 根據 workflow（nodes、edges）與 excelData，計算每個節點的 outputData
 */
export function executeWorkflow(workflow: Workflow, excelData: any[][]) {
  const nodeMap = new Map<string, WorkflowNode>();
  workflow.nodes.forEach((node) => nodeMap.set(node.id, node));

  // 先將 Trigger 節點的 outputData 設為 excelData
  workflow.nodes
    .filter((n) => n.type === "fileUpload")
    .forEach((n) => {
      n.data.outputData = excelData;
    });

  // 拓譜排序（或遞迴）從 Trigger 開始，以下使用簡單迴圈，每次找可運算的節點
  const pending = new Set(workflow.nodes.map((n) => n.id));
  while (pending.size > 0) {
    for (const nodeId of Array.from(pending)) {
      const node = nodeMap.get(nodeId)!;
      // 找到所有已運算的前序節點
      const incomingEdges = workflow.edges.filter((e) => e.target === nodeId);
      const upstreamReady = incomingEdges.every((e) => {
        const prevNode = nodeMap.get(e.source)!;
        return prevNode.data.outputData !== undefined;
      });
      if (!incomingEdges.length && node.type !== "fileUpload") {
        // 若非 Trigger 卻沒有前序，暫時跳過
        continue;
      }
      if (upstreamReady) {
        // 取得所有前序節點輸出
        const inputDatas = incomingEdges.map((e) => {
          const prev = nodeMap.get(e.source)!;
          return prev.data.outputData;
        });
        // 若只有一個前序，直接取第一；若多個合併陣列再運算
        const mergedInput = inputDatas.length > 1 ? mergeArrays(inputDatas) : inputDatas[0];
        // 執行該節點功能，並設定 outputData
        node.data.outputData = executeNodeLogic(node, mergedInput);
        pending.delete(nodeId);
      }
    }
  }
}

/**
 * 節點邏輯執行器，依 node.type 決定呼叫何種運算
 */
function executeNodeLogic(node: WorkflowNode, inputData: any[][]): any[][] {
  switch (node.type) {
    case "filter":
      return filterRows(inputData, node.data.params);
    case "vlookup":
      return vlookupRows(inputData, node.data.params);
    case "merge":
      return mergeTables([inputData, node.data.params.otherTable], node.data.params.joinColKey);
    case "export":
      return inputData; // 最後交由 exportNode 再處理
    default:
      return inputData;
  }
}

// 篩選實作：依 params={ columnKey, operator, value }
function filterRows(data: any[][], params: any): any[][] {
  const header = data[0];
  const colIndex = header.indexOf(params.columnKey);
  if (colIndex < 0) return data;
  const filtered = data.slice(1).filter((row) => {
    switch (params.operator) {
      case "=":
        return row[colIndex] === params.value;
      case ">":
        return row[colIndex] > params.value;
      case "<":
        return row[colIndex] < params.value;
      default:
        return true;
    }
  });
  return [header, ...filtered];
}

// VLOOKUP 實作：params={ searchColKey, lookupColKey, searchKey }
function vlookupRows(data: any[][], params: any): any[][] {
  const header = data[0];
  const searchIndex = header.indexOf(params.searchColKey);
  const lookupIndex = header.indexOf(params.lookupColKey);
  if (searchIndex < 0 || lookupIndex < 0) return data;
  const resultRows = data.slice(1).map((row) => {
    if (row[searchIndex] === params.searchKey) {
      return [...row, row[lookupIndex]];
    }
    return [...row, null];
  });
  return [ [...header, `VLOOKUP_${params.lookupColKey}`], ...resultRows ];
}

// 合併實作：params.otherTable 為另一工作表資料，joinColKey 為 Key 欄名稱
function mergeTables(
  tables: any[][][],
  joinColKey: string
): any[][] {
  const [tableA, tableB] = tables; // 只示範兩表合併
  const headerA = tableA[0];
  const headerB = tableB[0];
  const idxA = headerA.indexOf(joinColKey);
  const idxB = headerB.indexOf(joinColKey);
  if (idxA < 0 || idxB < 0) return tableA;
  const mergedHeader = [...headerA, ...headerB.filter((_, i) => i !== idxB)];
  const mapB = new Map<any, any[]>();
  tableB.slice(1).forEach((row) => {
    mapB.set(row[idxB], row);
  });
  const mergedRows = tableA.slice(1).map((row) => {
    const key = row[idxA];
    const rowB = mapB.get(key) || new Array(headerB.length).fill(null);
    return [...row, ...rowB.filter((_, i) => i !== idxB)];
  });
  return [mergedHeader, ...mergedRows];
}

// 若多個輸入，簡單將陣列串成一個，後續節點再自行決定邏輯
function mergeArrays(arrays: any[][][]): any[][] {
  if (!arrays.length) return [];
  if (arrays.length === 1) return arrays[0];
  return arrays.reduce((prev, curr) => {
    // 將 curr 跟 prev 的資料列依需求合併，這裡示範垂直合併（append rows）
    return [...prev, ...curr.slice(1)];
  });
} 