import { WorkflowNode, Workflow, NodeOutput, NodeParams } from "@/types/workflow";

function convertToNodeOutput(data: (string | number | boolean)[][]): NodeOutput {
  if (!data.length) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj: Record<string, string | number | boolean> = {};
    headers.forEach((header, index) => {
      obj[String(header)] = row[index];
    });
    return obj;
  });
}

/**
 * 根據 workflow（nodes、edges）與 excelData，計算每個節點的 outputData
 */
export function executeWorkflow(workflow: Workflow, excelData: (string | number | boolean)[][]) {
  const nodeMap = new Map<string, WorkflowNode>();
  workflow.nodes.forEach((node) => nodeMap.set(node.id, node));

  // 先將 Trigger 節點的 outputData 設為 excelData
  workflow.nodes
    .filter((n) => n.type === "fileUpload")
    .forEach((n) => {
      n.data.outputData = convertToNodeOutput(excelData);
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
        const mergedInput = inputDatas.length > 1 ? mergeArrays(inputDatas) : (inputDatas[0] || []);
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
function executeNodeLogic(node: WorkflowNode, inputData: NodeOutput): NodeOutput {
  switch (node.type) {
    case "filter":
      return convertToNodeOutput(filterRows(convertToArray(inputData), node.data.params));
    case "vlookup":
      return convertToNodeOutput(vlookupRows(convertToArray(inputData), node.data.params));
    case "merge":
      return convertToNodeOutput(mergeTables([convertToArray(inputData), node.data.params.merge?.otherTable || []], node.data.params.merge?.key || ''));
    case "export":
      return inputData;
    default:
      return inputData;
  }
}

// 將 NodeOutput 轉換為二維陣列
function convertToArray(data: NodeOutput): (string | number | boolean)[][] {
  if (!data.length) return [];
  const headers = Object.keys(data[0]);
  return [headers, ...data.map(row => headers.map(header => row[header]))];
}

// 篩選實作：依 params={ columnKey, operator, value }
function filterRows(data: (string | number | boolean)[][], params: NodeParams): (string | number | boolean)[][] {
  const header = data[0];
  const colIndex = header.indexOf(params.filter?.field || '');
  if (colIndex < 0) return data;
  const filtered = data.slice(1).filter((row) => {
    switch (params.filter?.operator) {
      case "equals":
        return row[colIndex] === params.filter.value;
      case "greater":
        return row[colIndex] > params.filter.value;
      case "less":
        return row[colIndex] < params.filter.value;
      case "contains":
        return String(row[colIndex]).includes(String(params.filter.value));
      default:
        return true;
    }
  });
  return [header, ...filtered];
}

// VLOOKUP 實作：params={ searchColKey, lookupColKey, searchKey }
function vlookupRows(data: (string | number | boolean)[][], params: NodeParams): (string | number | boolean)[][] {
  const header = data[0];
  const searchIndex = header.indexOf(params.vlookup?.lookupField || '');
  const lookupIndex = header.indexOf(params.vlookup?.targetField || '');
  if (searchIndex < 0 || lookupIndex < 0) return data;
  const resultRows = data.slice(1).map((row) => {
    if (row[searchIndex] === params.vlookup?.returnField) {
      return [...row, row[lookupIndex]];
    }
    return [...row, ''];
  });
  return [ [...header, `VLOOKUP_${params.vlookup?.targetField}`], ...resultRows ];
}

// 合併實作：params.otherTable 為另一工作表資料，joinColKey 為 Key 欄名稱
function mergeTables(
  tables: (string | number | boolean)[][][],
  joinColKey: string
): (string | number | boolean)[][] {
  const [tableA, tableB] = tables;
  const headerA = tableA[0];
  const headerB = tableB[0];
  const idxA = headerA.indexOf(joinColKey);
  const idxB = headerB.indexOf(joinColKey);
  if (idxA < 0 || idxB < 0) return tableA;
  const mergedHeader = [...headerA, ...headerB.filter((_, i) => i !== idxB)];
  const mapB = new Map<string | number | boolean, (string | number | boolean)[]>();
  tableB.slice(1).forEach((row) => {
    mapB.set(row[idxB], row);
  });
  const mergedRows = tableA.slice(1).map((row) => {
    const key = row[idxA];
    const rowB = mapB.get(key) || new Array(headerB.length).fill('');
    return [...row, ...rowB.filter((_, i) => i !== idxB)];
  });
  return [mergedHeader, ...mergedRows];
}

// 若多個輸入，簡單將陣列串成一個，後續節點再自行決定邏輯
function mergeArrays(arrays: (NodeOutput | undefined)[]): NodeOutput {
  if (!arrays.length) return [];
  if (arrays.length === 1) return arrays[0] || [];
  return arrays.reduce<NodeOutput>((prev, curr) => {
    if (!curr) return prev;
    return [...prev, ...curr];
  }, []);
} 