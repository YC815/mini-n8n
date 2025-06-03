"use client";

import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useWorkflowStore } from "@/store/workflowStore";
import { exportExcel } from "@/lib/excelUtils"; // 確保此函數已在 excelUtils.ts 中定義
import { WorkflowNode, NodeOutput } from "@/types/workflow";
import { convertToArray } from "@/lib/workflowUtils";

interface ExportParamsProps {
  node: WorkflowNode;
}

export default function ExportParams({ node }: ExportParamsProps) {
  const { nodes, edges, updateNode } = useWorkflowStore();
  const { params } = node.data;
  
  const initialFileName = (params?.fileName as string) || "mini-n8n-output";
  const [fileName, setFileName] = useState<string>(initialFileName);

  // 找到上游節點和其數據
  const upstreamEdge = edges.find((e) => e.target === node.id);
  const upstreamNode = upstreamEdge ? nodes.find((n) => n.id === upstreamEdge.source) : undefined;
  const upstreamData = upstreamNode?.data.outputData as NodeOutput | undefined;
  const upstreamNodeName = upstreamNode?.data.customName || (upstreamNode ? `節點 ${upstreamNode.id.substring(0,4)}` : "未連接");

  // 當 fileName 變更，同步更新 store.params
  useEffect(() => {
    updateNode(node.id, { ...node.data, params: { ...params, fileName } });
  }, [fileName, node.id, updateNode, params, node.data]);

  // 當 node.data.params 從外部變化時 (例如，載入工作流)，同步本地 state
  useEffect(() => {
    setFileName((node.data.params?.fileName as string) || "mini-n8n-output");
  }, [node.data.params]);

  const handleDownload = () => {
    if (!upstreamData || upstreamData.length === 0) {
      // 可以在此處使用更友好的提示方式，例如 toast 通知
      alert("上游節點沒有數據可供下載，或者數據為空。");
      return;
    }
    if (!fileName.trim()) {
      alert("請輸入有效的下載檔案名稱。");
      return;
    }
    try {
      const arrayData = convertToArray(upstreamData);
      exportExcel(arrayData, fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`);
    } catch (error) {
      console.error("Error during Excel export:", error);
      alert("匯出 Excel 失敗，請檢查控制台錯誤訊息。");
    }
  };

  return (
    <div>
      <div className="mb-4">
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
          上游節點：
          <span className={`font-medium ${upstreamNode ? 'text-blue-600 dark:text-blue-400' : 'text-red-500'}`}>
            {upstreamNodeName}
          </span>
        </p>
        {(!upstreamNode || !upstreamData || upstreamData.length === 0) && (
          <p className="text-xs text-yellow-600 dark:text-yellow-400">
            { !upstreamNode ? "請先連接一個上游節點。" : "上游節點目前沒有輸出資料可供下載。"}
          </p>
        )}
      </div>

      <div className="mb-4">
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">下載檔名</label>
        <Input
          type="text"
          placeholder="輸入檔名 (將存為 .xlsx)"
          className="w-full mt-1 h-10 bg-white dark:bg-gray-800 dark:text-white"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
        />
        <p className="text-xs text-gray-500 mt-1">檔案將以 .xlsx 格式下載。</p>
      </div>

      <Button
        size="sm"
        // variant="outline" // 改為主要按鈕樣式
        onClick={handleDownload}
        disabled={!upstreamData || upstreamData.length === 0 || !fileName.trim()}
        className="bg-green-600 hover:bg-green-700 text-white dark:bg-green-500 dark:hover:bg-green-600"
      >
        下載結果 (Excel)
      </Button>
    </div>
  );
} 