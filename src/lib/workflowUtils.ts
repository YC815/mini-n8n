import { WorkflowNode, Workflow, NodeOutput, NodeParams } from "@/types/workflow";

function convertToNodeOutput(data: (string | number | boolean)[][]): NodeOutput {
  if (!data || data.length < 1) return [];
  const headers = data[0];
  if (!headers || headers.length === 0) return [];

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
export function executeWorkflow(workflow: Workflow, excelData: (string | number | boolean)[][]): WorkflowNode[] {
  const nodeMap = new Map<string, WorkflowNode>();
  const newNodes = workflow.nodes.map(node => ({ ...node, data: { ...node.data } }));
  newNodes.forEach((node) => nodeMap.set(node.id, node));

  newNodes
    .filter((n) => n.type === "fileUpload")
    .forEach((n) => {
      n.data.outputData = convertToNodeOutput(excelData);
    });

  const pending = new Set(newNodes.map((n) => n.id));
  let iterations = 0;
  const MAX_ITERATIONS = newNodes.length * newNodes.length;

  while (pending.size > 0 && iterations < MAX_ITERATIONS) {
    let changedInIteration = false;
    for (const nodeId of Array.from(pending)) {
      const node = nodeMap.get(nodeId)!;
      const incomingEdges = workflow.edges.filter((e) => e.target === nodeId);

      if (node.type === "fileUpload") {
        pending.delete(nodeId);
        changedInIteration = true;
        continue;
      }
      
      const upstreamReady = incomingEdges.every((e) => {
        const prevNode = nodeMap.get(e.source)!;
        return !pending.has(e.source) || prevNode.data.outputData !== undefined;
      });

      if (!incomingEdges.length && node.type !== "fileUpload") {
        continue; 
      }

      if (upstreamReady) {
        const inputDatas: (NodeOutput | undefined)[] = incomingEdges.map((e) => {
          const prev = nodeMap.get(e.source)!;
          return prev.data.outputData;
        });

        if (node.type === "merge") {
            const validInputs = inputDatas.filter(d => d !== undefined && Array.isArray(d) && d.length > 0) as NodeOutput[];
            if (validInputs.length >= 2) {
                const tableA_Array = convertToArray(validInputs[0]);
                const tableB_Array = convertToArray(validInputs[1]); // Merge 節點固定取前兩個有效輸入
                
                // 修正讀取 joinKey 和 joinType 的路徑
                const mergeParams = node.data.params as MergeParams; // 直接使用 MergeParams 型別
                const joinKey = mergeParams?.key;
                const joinType = mergeParams?.joinType || 'left'; // 預設為 'left'

                if (!joinKey) {
                    console.warn(`Merge node ${node.id} (${node.data.customName}) is missing a join key. Outputting empty.`);
                    node.data.outputData = [];
                } else {
                    node.data.outputData = convertToNodeOutput(
                        mergeTables([tableA_Array, tableB_Array], joinKey, joinType) // 傳遞 joinType
                    );
                }
            } else {
                console.warn(`Merge node ${node.id} (${node.data.customName}) requires at least 2 upstream inputs with data, got ${validInputs.length}. Outputting empty.`);
                node.data.outputData = [];
            }
        } else { // 其他節點類型
            const mergedInput = inputDatas.length > 1 ? mergeArrays(inputDatas) : (inputDatas[0] || []);
            node.data.outputData = executeNodeLogic(node, mergedInput);
        }
        pending.delete(nodeId);
        changedInIteration = true;
      }
    }
    iterations++;
    if (!changedInIteration && pending.size > 0) {
        console.warn("Workflow execution stuck: No nodes processed in an iteration. Pending nodes:", Array.from(pending).map(id => nodeMap.get(id)?.type));
        pending.forEach(nodeId => {
            const node = nodeMap.get(nodeId)!;
            if (!node.data.outputData) {
                node.data.outputData = [];
            }
        });
        pending.clear();
        break;
    }
  }
  if (iterations >= MAX_ITERATIONS && pending.size > 0) {
    console.warn("Workflow execution reached max iterations. There might be a circular dependency or unresolvable nodes. Pending:", Array.from(pending));
    pending.forEach(nodeId => {
        const node = nodeMap.get(nodeId)!;
        if (!node.data.outputData) {
            node.data.outputData = [];
        }
    });
  }
  return newNodes;
}

function executeNodeLogic(node: WorkflowNode, inputData: NodeOutput): NodeOutput {
  const params = node.data.params || {}; 
  const tableData = convertToArray(inputData); // Convert input once for all cases

  switch (node.type) {
    case "filter":
      console.log(`Executing filter for node ${node.id}`, params.filter);
      return convertToNodeOutput(filterRows(tableData, params));
    case "vlookup":
      console.log(`Executing vlookup for node ${node.id}`, params.vlookup);
      return convertToNodeOutput(vlookupRows(tableData, params));
    case "delete": // <-- 新增 delete 節點的處理邏輯
      console.log(`Executing delete for node ${node.id}`, params.delete);
      if (params.delete) {
        const { mode, selectedField, operator, filterValue } = params.delete;
        if (mode === "col" && selectedField) {
          return convertToNodeOutput(deleteColumn(tableData, selectedField));
        } else if (mode === "row" && selectedField && operator && filterValue !== undefined) {
          return convertToNodeOutput(deleteRows(tableData, { selectedField, operator, filterValue }));
        }
      }
      console.warn(`Delete node ${node.id} (${node.data.customName}) is missing parameters or has an invalid mode. Returning original data.`);
      return inputData; // 如果參數不完整或模式不對，返回原始數據
    case "export":
      console.log(`Executing export for node ${node.id}`);
      return inputData;
    default:
      console.log(`Unknown node type ${node.type} for node ${node.id}. Returning original data.`);
      return inputData;
  }
}

export function convertToArray(data: NodeOutput): (string | number | boolean)[][] {
  if (!data || !data.length) return [];
  const headers = Object.keys(data[0] || {});
  if (headers.length === 0) return [[]];
  return [headers, ...data.map(row => headers.map(header => row[header] as string | number | boolean))];
}

export function filterRows(data: (string | number | boolean)[][], params: NodeParams): (string | number | boolean)[][] {
  if (!data || data.length < 2) return data;
  const header = data[0] as string[];
  const field = params.filter?.field;
  if (!field) return data;
  const colIndex = header.indexOf(field);
  if (colIndex < 0) return data;
  
  const operator = params.filter?.operator;
  const value = params.filter?.value;

  if (operator === undefined || value === undefined) return data; 

  const filtered = data.slice(1).filter((row) => {
    const cellValue = row[colIndex];
    
    // 將 cellValue 和 value 轉換為相同的型別進行比較
    const typedCellValue = typeof cellValue === 'number' ? cellValue : String(cellValue);
    const typedValue = !isNaN(Number(value)) ? Number(value) : String(value);
    
    switch (operator) {
      case "equals":
        return typedCellValue === typedValue;
      case "greater":
        return typeof typedCellValue === 'number' && typeof typedValue === 'number' && typedCellValue > typedValue;
      case "less":
        return typeof typedCellValue === 'number' && typeof typedValue === 'number' && typedCellValue < typedValue;
      case "contains":
        return String(typedCellValue).toLowerCase().includes(String(typedValue).toLowerCase());
      default:
        return true;
    }
  });
  
  return [header, ...filtered];
}

export function vlookupRows(data: (string | number | boolean)[][], params: NodeParams): (string | number | boolean)[][] {
  if (!data || data.length < 2) return data;
  const header = data[0] as string[];
  
  const lookupField = params.vlookup?.lookupField;
  const targetField = params.vlookup?.targetField;
  const returnKeyValue = params.vlookup?.returnField;

  if (!lookupField || !targetField || returnKeyValue === undefined) return data;

  const searchIndex = header.indexOf(lookupField);
  const targetIndex = header.indexOf(targetField);

  if (searchIndex < 0 || targetIndex < 0) return data;

  const newHeader = [...header, `VLOOKUP_${targetField}`];
  const resultRows = data.slice(1).map((row) => {
    if (row[searchIndex] === returnKeyValue) {
      return [...row, row[targetIndex]];
    }
    return [...row, ''];
  });
  return [newHeader, ...resultRows];
}

export function mergeTables(
  tables: (string | number | boolean)[][][],
  joinColKey: string,
  joinType: 'left' | 'inner' | 'right' | 'outer' = 'left'
): (string | number | boolean)[][] {
  if (tables.length < 2) return tables[0] || [];
  const [tableA, tableB] = tables;
  if (!tableA || tableA.length < 1 || !tableB || tableB.length < 1) return tableA || [];

  const headerA = tableA[0] as string[];
  const headerB = tableB[0] as string[];
  if (!headerA || !headerB) return tableA || [];

  const idxA = headerA.indexOf(joinColKey);
  const idxB = headerB.indexOf(joinColKey);

  if (idxA < 0 || idxB < 0) {
    console.warn(`Join key "${joinColKey}" not found in one or both tables. Returning first table (or empty if joinType demands).`);
    // 根據 joinType 決定行為，目前 'left' join 在此情況下會返回 tableA
    // 若是 'inner' join，則應返回空表頭或空資料
    if (joinType === 'inner') {
        return tableA.length > 0 ? [tableA[0]] : []; // 只返回表頭
    }
    return tableA; // Left join returns tableA
  }

  const mergedHeader = [...headerA, ...headerB.filter((col, i) => i !== idxB)];
  const mapB = new Map<string | number | boolean, (string | number | boolean)[]>();
  
  tableB.slice(1).forEach((row) => {
    mapB.set(row[idxB], row);
  });

  const mergedRows = tableA.slice(1).map((row) => {
    const key = row[idxA];
    const rowBData = mapB.get(key);
    
    if (rowBData) { // 如果在 tableB 中找到對應的 key
      const bValues = headerB.map((_, i) => (i !== idxB ? rowBData[i] : undefined /* undefined 標記不加入 */));
      return [...row, ...bValues.filter(val => val !== undefined && headerB[headerB.indexOf(joinColKey)] !== headerB[bValues.indexOf(val)] )];
    } else { // 如果在 tableB 中沒有找到對應的 key
      if (joinType === 'left' || joinType === 'outer') { // Left Join 或 Outer Join 時，tableA 的列保留，tableB 的部分填空
        const emptyBValues = headerB.map((colName, i) => (i !== idxB ? '' : undefined)).filter(val => val !== undefined);
        return [...row, ...emptyBValues];
      }
      return null; // Inner Join 或 Right Join (如果 tableA 是 'driving' table) 時，不包含此列
    }
  }).filter(row => row !== null) as (string | number | boolean)[][]; // 過濾掉 null (針對 Inner Join)
  
  return [mergedHeader, ...mergedRows];
}

function mergeArrays(arrays: (NodeOutput | undefined)[]): NodeOutput {
  if (!arrays || !arrays.length) return [];
  const validArrays = arrays.filter(arr => arr !== undefined && arr.length > 0) as NodeOutput[];
  if (!validArrays.length) return [];
  if (validArrays.length === 1) return validArrays[0];
  
  return validArrays.reduce<NodeOutput>((acc, curr) => {
    return acc.concat(curr);
  }, []);
}

/**
 * 根據條件刪除符合的列
 */
export function deleteRows(
  data: (string | number | boolean)[][],
  params: { selectedField: string; operator: string; filterValue: string | number | boolean }
): (string | number | boolean)[][] {
  if (!data || data.length === 0) return data;
  
  const header = data[0] as string[];
  const colIndex = header.indexOf(params.selectedField);
  if (colIndex < 0) return data;

  const filtered = data.slice(1).filter((row) => {
    const cell = row[colIndex];
    switch (params.operator) {
      case "=":
        return cell !== params.filterValue;
      case ">":
        return cell <= params.filterValue;
      case "<":
        return cell >= params.filterValue;
      case "contains":
        return !String(cell).toLowerCase().includes(String(params.filterValue).toLowerCase());
      default:
        return true;
    }
  });

  return [header, ...filtered];
}

/**
 * 刪除指定的欄位
 */
export function deleteColumn(data: (string | number | boolean)[][], colKey: string): (string | number | boolean)[][] {
  if (!data || data.length === 0) return data;
  
  const header = data[0].map((h) => String(h));
  const colIndex = header.indexOf(colKey);
  if (colIndex < 0) return data;

  // 移除 header 及每一列的對應欄
  const newHeader = data[0].filter((_, idx) => idx !== colIndex);
  const newRows = data.slice(1).map((row) =>
    row.filter((_, idx) => idx !== colIndex)
  );

  return [newHeader, ...newRows];
} 