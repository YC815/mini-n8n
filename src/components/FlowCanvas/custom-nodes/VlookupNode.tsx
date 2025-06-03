"use client";

import React, { useEffect, useState } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectItem,
  SelectContent,
} from "@/components/ui/select";
import { useWorkflowStore } from "@/store/workflowStore";
import { WorkflowNodeData } from "@/types/workflow"; // 假設 VlookupParams 會在外部更新

// 定義資料行型別
interface DataRow {
  [key: string]: string | number | boolean;
}

// 為了符合 VLOOKUP 邏輯，重新定義參數介面
interface VlookupNodeSpecificParams {
  lookupValue?: string;        // 要查找的具體值 (VLOOKUP: lookup_value)
  lookupColumn?: string;       // 在上游資料的哪一欄進行查找 (VLOOKUP: table_array 的查找欄)
  returnColumn?: string;       // 找到後，從上游資料回傳哪一欄 (VLOOKUP: col_index_num 指定的欄)
}

interface SpecificVlookupNodeData extends Omit<WorkflowNodeData, 'params'> {
  params: VlookupNodeSpecificParams; // 使用新的參數結構
}

/**
 * 處理 VLOOKUP 節點的資料轉換邏輯。
 * @param upstreamData - 從上游節點傳來的資料陣列 (Array of objects)。
 * @param params - VLOOKUP 節點的參數。
 *                 - lookupValue: 要查找的具體值 (例如 "C001")。
 *                 - lookupColumn: 在上游資料的哪一欄進行查找 (例如 "客戶ID")。
 *                 - returnColumn: 找到匹配列後，要從該列回傳哪一欄的值 (例如 "客戶名稱")。
 * @returns 處理後的資料陣列，包含符合條件的列，且每列只包含 lookupColumn 和 returnColumn。
 */
function processVlookupData(
  upstreamData: DataRow[],
  params: {
    lookupValue?: string;
    lookupColumn?: string;
    returnColumn?: string;
  }
): DataRow[] {
  const { lookupValue, lookupColumn, returnColumn } = params;

  // 1. 檢查必要的參數是否存在
  if (!lookupValue || !lookupColumn || !returnColumn || !Array.isArray(upstreamData)) {
    // 如果參數不完整或上游資料無效，回傳空陣列或進行錯誤處理
    return [];
  }

  const results: DataRow[] = [];

  // 2. 遍歷上游資料的每一列
  for (const row of upstreamData) {
    // 確保比較的欄位存在於當前列中
    if (row.hasOwnProperty(lookupColumn)) {
      // 3. 比較查找欄位的值是否與指定的查找值相符
      //    注意：這裡使用 String() 進行比較，您可能需要根據實際資料類型調整
      if (String(row[lookupColumn]) === String(lookupValue)) {
        
        // 4. 如果找到匹配的列，則準備輸出的資料列
        const outputRow: DataRow = {};

        // 按照您的「理論上輸出要是」範例，我們同時回傳 lookupColumn 和 returnColumn
        // 加入 lookupColumn 的值
        if (row.hasOwnProperty(lookupColumn)) {
          outputRow[lookupColumn] = row[lookupColumn];
        }

        // 加入 returnColumn 的值
        if (row.hasOwnProperty(returnColumn)) {
          outputRow[returnColumn] = row[returnColumn];
        } else {
          // 如果 returnColumn 不存在於原始資料中 (理論上不應發生，因為是從 headers 選的)
          // 使用空字串代替 null
          outputRow[returnColumn] = ''; 
        }
        
        results.push(outputRow);

        // 標準的 VLOOKUP 只會回傳第一個匹配項。
        // 如果您的系統也應如此，可以在這裡加上 break 來停止搜尋。
        // break; 
        // 如果需要回傳所有匹配項，則保持註解或移除 break。
      }
    }
  }

  // 5. 回傳結果
  return results;
}

export default function VlookupNode({ id, data, selected }: NodeProps<SpecificVlookupNodeData>) {
  const { nodes, edges, updateNode } = useWorkflowStore();

  // 根據 VLOOKUP 邏輯更新 state 變數名稱
  const [currentLookupValue, setCurrentLookupValue] = useState<string | undefined>(data.params.lookupValue);
  const [currentLookupColumn, setCurrentLookupColumn] = useState<string | undefined>(data.params.lookupColumn);
  const [currentReturnColumn, setCurrentReturnColumn] = useState<string | undefined>(data.params.returnColumn);

  const [upstreamHeaders, setUpstreamHeaders] = useState<string[]>([]);
  const [upstreamError, setUpstreamError] = useState<string | null>(null);

  // 分離資料處理邏輯
  const processUpstreamData = React.useCallback(() => {
    const upstreamEdge = edges.find((e) => e.target === id);
    if (upstreamEdge) {
      const upstreamNode = nodes.find((n) => n.id === upstreamEdge.source);
      if (upstreamNode?.data.outputData) {
        if (upstreamNode.data.outputData.length > 0 && typeof upstreamNode.data.outputData[0] === 'object' && upstreamNode.data.outputData[0] !== null) {
          setUpstreamHeaders(Object.keys(upstreamNode.data.outputData[0]));
          setUpstreamError(null);
          return upstreamNode.data.outputData;
        }
      }
    }
    setUpstreamHeaders([]);
    setUpstreamError("無上游節點連接或無輸出資料。");
    return null;
  }, [edges, id, nodes]);

  // 處理上游資料的更新
  useEffect(() => {
    const upstreamData = processUpstreamData();
    if (upstreamData && currentLookupValue && currentLookupColumn && currentReturnColumn) {
      const processedData = processVlookupData(upstreamData, {
        lookupValue: currentLookupValue,
        lookupColumn: currentLookupColumn,
        returnColumn: currentReturnColumn
      });
      
      const currentNode = nodes.find(n => n.id === id);
      if (currentNode && JSON.stringify(processedData) !== JSON.stringify(currentNode.data.outputData)) {
        updateNode(id, { outputData: processedData });
      }
    }
  }, [processUpstreamData, currentLookupValue, currentLookupColumn, currentReturnColumn, id, nodes, updateNode]);

  // 更新節點參數
  useEffect(() => {
    updateNode(id, { 
      params: { 
        lookupValue: currentLookupValue, 
        lookupColumn: currentLookupColumn, 
        returnColumn: currentReturnColumn 
      } 
    });
  }, [id, currentLookupValue, currentLookupColumn, currentReturnColumn, updateNode]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateNode(id, { customName: e.target.value });
  };

  return (
    <div className={`bg-white border-2 ${selected ? 'border-blue-500' : 'border-gray-300'} rounded-lg w-64 p-3 shadow-md`}>
      <Handle type="target" position={Position.Top} id="a" className="!bg-teal-500" />
      
      <div className="flex items-center mb-2">
        <div className="mr-2 text-green-500">
         <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="11" x2="11" y1="8" y2="14"/><line x1="8" x2="14" y1="11" y2="11"/></svg>
        </div>
        <Input 
          type="text" 
          value={data.customName} 
          onChange={handleNameChange} 
          className="font-semibold text-gray-700 text-sm p-1 border-none focus:ring-0 shadow-none"
          placeholder="VLOOKUP 節點"
        />
      </div>

      {upstreamError ? (
        <p className="text-xs text-red-500 p-2 bg-red-50 rounded">{upstreamError}</p>
      ) : upstreamHeaders.length > 0 ? (
        <div className="space-y-2 text-sm">
          {/* 輸入查找值 (lookup_value) */}
          <Input
            type="text"
            placeholder="輸入查找值 (要找什麼)"
            className="w-full h-9"
            value={currentLookupValue || ''}
            onChange={(e) => setCurrentLookupValue(e.target.value)}
          />

          {/* 選擇在哪一欄查找 (table_array 的查找欄) */}
          <Select value={currentLookupColumn} onValueChange={(v: string) => setCurrentLookupColumn(v)}>
            <SelectTrigger className="w-full h-9">
              <SelectValue placeholder="選擇查找欄位 (來源資料的哪一欄)" />
            </SelectTrigger>
            <SelectContent>
              {upstreamHeaders.map((h) => (
                <SelectItem key={`lookup-col-${h}`} value={h}>
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 選擇要回傳的欄位 (col_index_num) */}
          <Select value={currentReturnColumn} onValueChange={(v: string) => setCurrentReturnColumn(v)}>
            <SelectTrigger className="w-full h-9">
              <SelectValue placeholder="選擇回傳欄位 (找到後回傳哪一欄)" />
            </SelectTrigger>
            <SelectContent>
              {upstreamHeaders.map((h) => (
                <SelectItem key={`return-col-${h}`} value={h}>
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <p className="text-xs text-gray-400 p-2 bg-gray-50 rounded">等待上游資料或上游無欄位資訊...</p>
      )}

      {data.outputData && (
        <p className="text-xs text-green-600 mt-2">
          預計輸出: {Array.isArray(data.outputData) ? data.outputData.length : 'N/A'} 筆資料
        </p>
      )}

      <Handle type="source" position={Position.Bottom} id="b" className="!bg-teal-500" />
    </div>
  );
} 