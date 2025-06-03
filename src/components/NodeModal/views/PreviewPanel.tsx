"use client";

import React from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import { WorkflowNode } from "@/types/workflow";

interface Edge {
  id: string;
  source: string;
  target: string;
}

interface NodeData {
  outputData: Record<string, string | number | boolean>[] | undefined;
  params: {
    selectedSheet?: string;
    fileName?: string;
    selectedField?: string;
    operator?: string;
    filterValue?: string | number | boolean;
    searchColKey?: string;
    lookupColKey?: string;
    searchKey?: string;
    tableAId?: string;
    tableBId?: string;
    joinColKey?: string;
    joinType?: string;
  };
  customName: string;
}

interface WorkflowNodeWithData extends WorkflowNode {
  data: NodeData;
}

interface PreviewPanelProps {
  node: WorkflowNode;
}

const MAX_PREVIEW_ROWS = 5; // 連同標頭總共顯示 MAX_PREVIEW_ROWS + 1 列

export default function PreviewPanel({ node }: PreviewPanelProps) {
  const data = node.data.outputData as string[][] | undefined;

  if (node.type === "upload" && !data) {
    const rowCount = node.data.params?.selectedSheet && Array.isArray(node.data.outputData) && node.data.outputData.length > 0 
      ? node.data.outputData.length -1 
      : 0;
    const fileName = node.data.params?.fileName;
    if (fileName && rowCount > 0) {
        return (
            <div className="text-xs text-green-600 dark:text-green-400">
                <p>已成功載入檔案 {String(fileName)}。</p>
                <p>工作表 {String(node.data.params.selectedSheet)} 包含 {rowCount} 筆資料 (不含標頭)。</p>
                <p className="mt-2 text-gray-500 dark:text-gray-400">預覽將在下個節點可用。</p>
            </div>
        );
    } else if (fileName) {
        return <p className="text-xs text-yellow-600 dark:text-yellow-400">檔案 &quot;{String(fileName)}&quot; 已選擇，但目前工作表可能無資料或尚未解析。請檢查 Upload 節點參數設定。</p>;
    }
    return <p className="text-xs text-gray-500 dark:text-gray-400">請先在「參數設定」區上傳檔案並選擇工作表。</p>;
  }

  if (!data || data.length === 0) {
    let message = "尚無結果或輸出為空。";
    if (node.type === 'filter' && (!node.data.params?.selectedField || !node.data.params?.operator || node.data.params?.filterValue === undefined)) {
        message = "請設定完整的篩選條件以產生預覽。"
    } else if (node.type === 'vlookup' && (!node.data.params?.searchColKey || !node.data.params?.lookupColKey || !node.data.params?.searchKey)) {
        message = "請設定完整的 VLOOKUP 參數以產生預覽。"
    } else if (node.type === 'merge' && (!node.data.params?.tableAId || !node.data.params?.tableBId || !node.data.params?.joinColKey || !node.data.params?.joinType )) {
        message = "請選擇表格並設定完整的合併參數以產生預覽。"
    } else if (node.type === 'export') {
        const upstreamEdge = useWorkflowStore.getState().edges.find((e: Edge) => e.target === node.id);
        const upstreamNode = upstreamEdge ? useWorkflowStore.getState().nodes.find((n) => n.id === upstreamEdge.source) as WorkflowNodeWithData | undefined : undefined;
        const upstreamData = upstreamNode?.data.outputData;
        if (!upstreamData || upstreamData.length === 0) {
            message = "上游節點無資料可供下載預覽。";
        } else {
            message = `準備下載 ${upstreamData.length-1} 筆資料。點擊「下載結果」按鈕開始下載。`;
        }
    }
    return <p className="text-xs text-gray-500 dark:text-gray-400 p-1">{message}</p>;
  }

  const headerRow = data[0];
  const bodyRows = data.slice(1);
  const rowCount = bodyRows.length;
  const previewDisplayRows = bodyRows.slice(0, MAX_PREVIEW_ROWS);

  return (
    <div className="flex flex-col h-full">
      <p className="text-xs text-gray-700 dark:text-gray-300 mb-2">
        共 <span className="font-medium">{rowCount}</span> 筆資料 (不含標頭)
      </p>
      <div className="overflow-auto flex-grow"> {/* 表格區域可滾動且填滿剩餘空間 */}
        <table className="table-auto text-xs border-collapse w-full">
          <thead className="sticky top-0 bg-gray-100 dark:bg-gray-700 z-10"> {/* 表頭黏性定位 */}
            <tr>
              {headerRow.map((h: string, idx: number) => (
                <th key={idx} className="border border-gray-300 dark:border-gray-600 px-2 py-1 truncate font-semibold text-gray-700 dark:text-gray-200">
                  {String(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewDisplayRows.map((row, ri) => (
              <tr key={ri} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                {row.map((cell: string, ci: number) => (
                  <td key={ci} className="border border-gray-300 dark:border-gray-600 px-2 py-1 truncate text-gray-600 dark:text-gray-400">
                    {String(cell === null || cell === undefined ? "" : cell)} {/* 處理 null/undefined */} 
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rowCount > MAX_PREVIEW_ROWS && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex-shrink-0"> {/* 防止此提示被擠壓 */}
          僅顯示前 {MAX_PREVIEW_ROWS} 筆資料。總共 {rowCount} 筆。
        </p>
      )}
       {rowCount === 0 && data.length > 0 && (
        <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2 flex-shrink-0">
          資料已載入，但結果為空 (0 筆符合條件的資料)。
        </p>
      )}

      {/* 顯示預覽資料 */}
      {data ? (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">
            &quot;{node.data.customName || `節點 ${node.id.substring(0,4)}`}&quot;
          </p>
          <p className="text-xs text-gray-500">
            {JSON.stringify(data, null, 2)}
          </p>
        </div>
      ) : (
        <p className="text-xs text-gray-500">
          &quot;{node.data.customName || `節點 ${node.id.substring(0,4)}`}&quot; 尚無輸出資料
        </p>
      )}
    </div>
  );
} 