"use client";

import React, { useEffect, useState } from "react";
import { Select, SelectTrigger, SelectValue, SelectItem, SelectContent } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useWorkflowStore } from "@/store/workflowStore";
import { WorkflowNode } from "@/types/workflow";
import { vlookupRows } from "@/lib/workflowUtils"; // 確保此函數已在 workflowUtils.ts 中定義

interface VlookupParamsProps {
  node: WorkflowNode;
  headers: string[]; // 從 NodeModal 傳過來的所有上游欄位 (目前 VLOOKUP 只處理單一上游)
}

export default function VlookupParams({ node, headers }: VlookupParamsProps) {
  const { updateNode, nodes, edges } = useWorkflowStore();
  const { params } = node.data;

  const initialSearchColKey = params?.searchColKey || "";
  const initialLookupColKey = params?.lookupColKey || "";
  const initialSearchKey = params?.searchKey || ""; // 在您的設計中，searchKey 是用戶輸入的值，不是欄位
  const initialOutputColName = params?.outputColName || "VLOOKUP_Result"; // 新增：定義 VLOOKUP 結果輸出到哪一欄，預設名稱

  const [searchColKey, setSearchColKey] = useState<string>(initialSearchColKey);
  const [lookupColKey, setLookupColKey] = useState<string>(initialLookupColKey);
  const [searchKey, setSearchKey] = useState<string>(initialSearchKey);
  const [outputColName, setOutputColName] = useState<string>(initialOutputColName);

  // 處理從左側面板點擊加入的欄位 (addField)
  useEffect(() => {
    if (params?.addField) {
      let newSearchColKey = searchColKey;
      let newLookupColKey = lookupColKey;

      if (!searchColKey) {
        newSearchColKey = params.addField;
        setSearchColKey(params.addField);
      } else if (!lookupColKey) {
        newLookupColKey = params.addField;
        setLookupColKey(params.addField);
      }
      // 清除 addField 並更新 params
      updateNode(node.id, {
        ...node.data,
        params: {
          ...params,
          addField: null,
          searchColKey: newSearchColKey,
          lookupColKey: newLookupColKey,
        },
      });
    }
  }, [params?.addField, searchColKey, lookupColKey, node.id, updateNode, params, node.data]);

  // 當 VLOOKUP 相關參數改變時，更新 store 並執行運算
  useEffect(() => {
    const currentParams = {
      ...params, // 保留 params 中其他可能存在的欄位
      searchColKey,
      lookupColKey,
      searchKey,
      outputColName,
    };
    delete currentParams.addField; // 確保 addField 已被處理

    updateNode(node.id, {
      ...node.data,
      params: currentParams,
    });

    // 執行即時預覽
    const upstreamEdge = edges.find((e) => e.target === node.id);
    if (!upstreamEdge) {
      updateNode(node.id, { ...node.data, outputData: undefined });
      return;
    }
    const upstreamNode = nodes.find((n) => n.id === upstreamEdge.source);
    const upstreamData = upstreamNode?.data.outputData as any[][] | undefined;

    if (upstreamData && searchColKey && lookupColKey && searchKey !== "" && outputColName) {
      try {
        const newOutput = vlookupRows(upstreamData, {
          searchColKey,
          lookupColKey,
          searchKey, // 這是用戶輸入的要查找的值
          outputColumnName: outputColName, // 傳遞給 vlookupRows
        });
        updateNode(node.id, { ...node.data, outputData: newOutput, params: currentParams });
      } catch (error) {
        console.error("Error during VLOOKUP:", error);
        updateNode(node.id, { ...node.data, outputData: undefined, params: currentParams });
      }
    } else {
      updateNode(node.id, { ...node.data, outputData: undefined, params: currentParams });
    }
  }, [searchColKey, lookupColKey, searchKey, outputColName, node.id, updateNode, nodes, edges, node.data, params]);

  // 當 node.data.params 從外部變化時 (例如，載入工作流)，同步本地 state
  useEffect(() => {
    setSearchColKey(node.data.params?.searchColKey || "");
    setLookupColKey(node.data.params?.lookupColKey || "");
    setSearchKey(node.data.params?.searchKey || "");
    setOutputColName(node.data.params?.outputColName || "VLOOKUP_Result");
  }, [node.data.params]);

  return (
    <div>
      {/* 搜尋欄位選擇 */}
      <div className="mb-4">
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">搜尋欄位 (Search In)</label>
        <Select 
          value={searchColKey} 
          onValueChange={(value) => {
            setSearchColKey(value);
            updateNode(node.id, { 
              ...node.data, 
              params: { ...node.data.params, searchColKey: value }
            });
          }}
        >
          <SelectTrigger className="w-full h-10 mt-1 bg-white dark:bg-gray-800 dark:text-white">
            <SelectValue placeholder="選擇或從左側點擊加入" />
          </SelectTrigger>
          <SelectContent>
            {headers.map((h) => (
              <SelectItem key={`search-${h}`} value={h}>{h}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!searchColKey && !params?.addField && (
             <p className="text-xs text-gray-500 mt-1">
                 提示：請選擇要在哪個欄位中進行搜尋。
             </p>
        )}
      </div>

      {/* 搜尋值輸入 */}
      {searchColKey && (
        <div className="mb-4">
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">搜尋值 (Search For)</label>
          <Input
            type="text"
            placeholder="輸入要搜尋的確切值"
            className="w-full mt-1 h-10 bg-white dark:bg-gray-800 dark:text-white"
            value={searchKey}
            onChange={(e) => setSearchKey(e.target.value)}
          />
        </div>
      )}

      {/* 回傳欄位選擇 */}
      {searchColKey && searchKey && (
        <div className="mb-4">
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">回傳欄位 (Return From)</label>
          <Select 
            value={lookupColKey} 
            onValueChange={(value) => {
              setLookupColKey(value);
              updateNode(node.id, { 
                ...node.data, 
                params: { ...node.data.params, lookupColKey: value }
              });
            }}
          >
            <SelectTrigger className="w-full h-10 mt-1 bg-white dark:bg-gray-800 dark:text-white">
              <SelectValue placeholder="選擇或從左側點擊加入" />
            </SelectTrigger>
            <SelectContent>
              {headers.map((h) => (
                <SelectItem key={`lookup-${h}`} value={h}>{h}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      {/* VLOOKUP 結果輸出欄位名稱 */}
      {searchColKey && searchKey && lookupColKey && (
        <div className="mb-4">
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">結果欄位名稱 (Output Column Name)</label>
          <Input
            type="text"
            placeholder="例如 VLOOKUP_Result"
            className="w-full mt-1 h-10 bg-white dark:bg-gray-800 dark:text-white"
            value={outputColName}
            onChange={(e) => setOutputColName(e.target.value)}
          />
        </div>
      )}

      {(!searchColKey || !searchKey || !lookupColKey) && (
        <p className="text-sm text-gray-500 mt-2">
          請依序設定：要搜尋的欄位、要搜尋的值、以及要回傳值的欄位。
        </p>
      )}
    </div>
  );
} 