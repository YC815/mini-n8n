"use client";

import React, { useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useWorkflowStore } from "@/store/workflowStore";
import { WorkflowNode, WorkflowEdge } from "@/types/workflow"; // 確保型別被正確匯入

interface WorkflowData {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  // 可以考慮加入其他需要保存的 workflow 相關狀態，例如 excelDataMap 的 key (如果需要)
}

function downloadJson(data: WorkflowData, filename: string) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".json") ? filename : `${filename}.json`;
  document.body.appendChild(a); // 需要 append 到 body 才能在 Firefox 中正常運作
  a.click();
  document.body.removeChild(a); // 清理
  URL.revokeObjectURL(url);
}

export default function WorkflowJsonControls() {
  const { nodes, edges, replaceWorkflow, setNodes, setEdges } = useWorkflowStore(); // 新增 setNodes, setEdges
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleDownload = useCallback(() => {
    const workflow: WorkflowData = { nodes, edges }; // 從 store 中獲取最新的 nodes 和 edges
    downloadJson(workflow, "mini-n8n-workflow.json");
  }, [nodes, edges]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as WorkflowData;
      
      // 基礎的驗證，確保 nodes 和 edges 是陣列
      if (
        !parsed ||
        !Array.isArray(parsed.nodes) ||
        !Array.isArray(parsed.edges)
      ) {
        alert("無效的 Workflow JSON 檔案格式。");
        return;
      }
      // 更細緻的型別檢查 (可選，但推薦)
      // 例如檢查每個 node 是否有 id, type, position, data 等必要欄位
      // parsed.nodes.forEach(node => { /* ... validation ... */ });
      // parsed.edges.forEach(edge => { /* ... validation ... */ });

      // replaceWorkflow(parsed.nodes, parsed.edges); 
      // 考慮到 React Flow 的內部狀態，直接呼叫 setNodes 和 setEdges 可能更直接
      setNodes(parsed.nodes);
      setEdges(parsed.edges);
      alert("Workflow 已成功載入！");

    } catch (err) {
      console.error("解析 JSON 錯誤:", err);
      alert("讀取或解析 JSON 檔案時發生錯誤。");
    } finally {
      if (inputRef.current) inputRef.current.value = ""; // 清空 file input
    }
  }, [setNodes, setEdges]); // replaceWorkflow 替換為 setNodes, setEdges

  const handleUploadClick = () => {
    inputRef.current?.click();
  };

  return (
    <div className="fixed top-4 right-4 flex space-x-2 z-50 bg-white p-2 rounded-md shadow-lg">
      <Button onClick={handleDownload} variant="outline" size="sm" className="hover:bg-gray-100">
        下載 JSON
      </Button>
      <input
        type="file"
        accept=".json"
        className="hidden"
        ref={inputRef}
        onChange={handleFileChange}
      />
      <Button onClick={handleUploadClick} variant="outline" size="sm" className="hover:bg-gray-100">
        上傳 JSON
      </Button>
    </div>
  );
} 