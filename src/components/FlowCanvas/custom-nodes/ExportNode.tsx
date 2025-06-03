"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWorkflowStore } from "@/store/workflowStore";
import { exportExcel } from "@/lib/excelUtils"; 
import { NodeOutput, WorkflowNode } from "@/types/workflow";
import { convertToArray } from "@/lib/workflowUtils"; // 用於將 NodeOutput 轉為 excelUtils 期望的格式

interface ExportNodeData {
  customName: string;
  params: { fileName?: string }; // 允許用戶自訂下載檔案名
  outputData?: NodeOutput; // ExportNode 通常不修改 outputData，只使用上游的
}

export default function ExportNode({ id, data, selected }: NodeProps<ExportNodeData>) {
  const { nodes, edges, updateNode } = useWorkflowStore();
  const [upstreamData, setUpstreamData] = useState<NodeOutput | null>(null);
  const [upstreamError, setUpstreamError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // 從 data.params 中獲取 fileName，如果未定義則使用 data.customName 或預設名稱
  const [fileName, setFileName] = useState<string>(
    data.params.fileName || data.customName || "mini-n8n-result"
  );

  useEffect(() => {
    const upstreamEdge = edges.find((e) => e.target === id);
    if (upstreamEdge) {
      const upstreamNode = nodes.find((n) => n.id === upstreamEdge.source);
      if (upstreamNode && upstreamNode.data.outputData) {
        setUpstreamData(upstreamNode.data.outputData);
        setUpstreamError(null);
        // 當上游資料變化時，如果用戶沒有自訂過檔案名，可以考慮更新預設檔案名
        // if (!data.params.fileName) {
        //   setFileName(upstreamNode.data.customName ? `${upstreamNode.data.customName}_export` : 'export_result');
        // }
      } else {
        setUpstreamData(null);
        setUpstreamError("上游節點未連接或無輸出資料。");
      }
    } else {
      setUpstreamData(null);
      setUpstreamError("無上游節點連接。");
    }
  }, [id, nodes, edges, data.params.fileName]);

  const handleFileNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileName(e.target.value);
    updateNode(id, { params: { ...data.params, fileName: e.target.value } });
  };
  
  const handleCustomNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateNode(id, { customName: e.target.value });
    // 如果 fileName 是基於 customName 生成的，且用戶未手動修改 fileName，則同步更新
    if (!data.params.fileName || data.params.fileName === data.customName) {
        setFileName(e.target.value || "mini-n8n-result");
        updateNode(id, { params: { ...data.params, fileName: e.target.value || "mini-n8n-result" } });
    }
  };

  const handleDownload = useCallback(async () => {
    if (!upstreamData) {
      alert("沒有可下載的資料。");
      return;
    }
    setIsDownloading(true);
    try {
      // workflowUtils 中的 convertToArray 將 NodeOutput (Record<string,any>[]) 
      // 轉換為 (string | number | boolean)[][] 給 exportExcel
      const arrayData = convertToArray(upstreamData);
      await exportExcel(arrayData, fileName || "mini-n8n-result");
    } catch (error) {
      console.error("Download error:", error);
      alert("下載失敗，請檢查控制台錯誤訊息。");
    }
    setIsDownloading(false);
  }, [upstreamData, fileName]);

  return (
    <div className={`bg-white border-2 ${selected ? 'border-blue-500' : 'border-gray-300'} rounded-lg w-64 p-3 shadow-md`}>
      <Handle type="target" position={Position.Top} id="a" className="!bg-teal-500" />
      
      <div className="flex items-center mb-2">
        <div className="mr-2 text-teal-500">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
        </div>
        <Input 
          type="text" 
          value={data.customName} 
          onChange={handleCustomNameChange} 
          className="font-semibold text-gray-700 text-sm p-1 border-none focus:ring-0 shadow-none"
        />
      </div>

      {upstreamError && (
         <p className="text-xs text-red-500 p-2 bg-red-50 rounded mb-2">{upstreamError}</p>
      )}

      <div className="space-y-2 text-sm mb-2">
        <label htmlFor={`fileName-${id}`} className="block text-xs font-medium text-gray-700">下載檔名 (.xlsx):</label>
        <Input
          id={`fileName-${id}`}
          type="text"
          placeholder="輸入下載檔名"
          className="w-full h-9"
          value={fileName}
          onChange={handleFileNameChange}
        />
      </div>

      <Button
        size="sm"
        variant="outline"
        onClick={handleDownload}
        disabled={!upstreamData || isDownloading || !!upstreamError}
        className="w-full"
      >
        {isDownloading ? (
           <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
             <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
             <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
           </svg>
        ) : (
          '下載結果'
        )}
      </Button>

      {/* ExportNode 通常是流程終點，所以不需要 Source Handle 
      <Handle type="source" position={Position.Bottom} id="b" className="!bg-teal-500" /> 
      */}
    </div>
  );
} 