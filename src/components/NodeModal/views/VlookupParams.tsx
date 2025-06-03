"use client";

import React, { useEffect, useState } from "react";
import { Select, SelectTrigger, SelectValue, SelectItem, SelectContent } from "@/components/ui/select";
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

  const [searchColKey, setSearchColKey] = useState(params?.vlookup?.searchColKey || "");
  const [lookupColKey, setLookupColKey] = useState(params?.vlookup?.lookupColKey || "");
  const [searchKey, setSearchKey] = useState(params?.vlookup?.searchKey || "");
  const [outputColName, setOutputColName] = useState(params?.vlookup?.outputColName || "");

  // 處理從左側面板點擊加入的欄位 (addField)
  useEffect(() => {
    if (params?.addField) {
      let newSearchColKey = searchColKey;
      let newLookupColKey = lookupColKey;

      if (!searchColKey) {
        newSearchColKey = params.addField as string;
        setSearchColKey(params.addField as string);
      } else if (!lookupColKey) {
        newLookupColKey = params.addField as string;
        setLookupColKey(params.addField as string);
      }
      // 清除 addField 並更新 params
      updateNode(node.id, {
        ...node.data,
        params: {
          ...params,
          addField: null,
          vlookup: {
            ...params.vlookup,
            searchColKey: newSearchColKey,
            lookupColKey: newLookupColKey,
          },
        },
      });
    }
  }, [params?.addField, searchColKey, lookupColKey, node.id, updateNode, params, node.data]);

  // 當 VLOOKUP 相關參數改變時，更新 store 並執行運算
  useEffect(() => {
    const currentParams = {
      searchColKey,
      lookupColKey,
      searchKey,
      outputColName,
    };

    updateNode(node.id, {
      ...node.data,
      params: { ...node.data.params, vlookup: currentParams },
    });

    // 執行即時預覽
    const upstreamEdge = edges.find((e) => e.target === node.id);
    if (!upstreamEdge) {
      updateNode(node.id, { ...node.data, outputData: undefined });
      return;
    }
    const upstreamNode = nodes.find((n) => n.id === upstreamEdge.source);
    const upstreamData = upstreamNode?.data.outputData as (string | number | boolean)[][] | undefined;

    if (upstreamData && searchColKey && lookupColKey && searchKey !== "" && outputColName) {
      try {
        const newOutput = vlookupRows(upstreamData, {
          searchColKey,
          lookupColKey,
          searchKey,
          outputColumnName: outputColName,
        });
        const formattedOutput = newOutput.map(row => {
          const obj: Record<string, string | number | boolean> = {};
          headers.forEach((header, index) => {
            obj[header] = row[index];
          });
          return obj;
        });
        updateNode(node.id, { ...node.data, outputData: formattedOutput, params: currentParams });
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
    setSearchColKey(node.data.params?.vlookup?.searchColKey || "");
    setLookupColKey(node.data.params?.vlookup?.lookupColKey || "");
    setSearchKey(node.data.params?.vlookup?.searchKey || "");
    setOutputColName(node.data.params?.vlookup?.outputColName || "");
  }, [node.data.params]);

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
          搜尋欄位
        </label>
        <Select value={searchColKey} onValueChange={setSearchColKey}>
          <SelectTrigger className="w-full h-10 mt-1 bg-white dark:bg-gray-800 dark:text-white">
            <SelectValue placeholder="選擇搜尋欄位" />
          </SelectTrigger>
          <SelectContent>
            {headers.map((header) => (
              <SelectItem key={header} value={header}>
                {header}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
          查找欄位
        </label>
        <Select value={lookupColKey} onValueChange={setLookupColKey}>
          <SelectTrigger className="w-full h-10 mt-1 bg-white dark:bg-gray-800 dark:text-white">
            <SelectValue placeholder="選擇查找欄位" />
          </SelectTrigger>
          <SelectContent>
            {headers.map((header) => (
              <SelectItem key={header} value={header}>
                {header}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
          搜尋值
        </label>
        <input
          type="text"
          value={searchKey}
          onChange={(e) => setSearchKey(e.target.value)}
          className="w-full h-10 mt-1 px-3 py-2 bg-white dark:bg-gray-800 dark:text-white border rounded-md"
          placeholder="輸入要搜尋的值"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
          輸出欄位名稱
        </label>
        <input
          type="text"
          value={outputColName}
          onChange={(e) => setOutputColName(e.target.value)}
          className="w-full h-10 mt-1 px-3 py-2 bg-white dark:bg-gray-800 dark:text-white border rounded-md"
          placeholder="輸入新欄位名稱"
        />
      </div>
    </div>
  );
} 