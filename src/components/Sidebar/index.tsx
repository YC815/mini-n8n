"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { useWorkflowStore } from "@/store/workflowStore";
import { WorkflowNode, NodeParams } from "@/types/workflow";

// 輔助函式，產生唯一的節點 ID
const generateNodeId = (type: string) => `${type}-node-${Date.now()}`;

// 節點類型和預設參數的映射
const nodeTypeDefaultParams: Record<string, { defaultName: string, defaultParams: NodeParams }> = {
  upload: { defaultName: "檔案上傳", defaultParams: {} },
  filter: { defaultName: "篩選資料", defaultParams: { filter: { field: undefined, operator: undefined, value: undefined } } },
  vlookup: { defaultName: "VLOOKUP", defaultParams: { vlookup: { lookupField: undefined, targetField: undefined, returnField: undefined } } },
  merge: { defaultName: "合併資料", defaultParams: { merge: { key: undefined } } }, // otherTable 由 executeWorkflow 處理
  export: { defaultName: "結果下載", defaultParams: { fileName: "mini-n8n-output" } },
};

export default function Sidebar() {
  const { addNode } = useWorkflowStore();

  const handleAddNode = (type: string) => {
    const defaults = nodeTypeDefaultParams[type] || { defaultName: `${type} 節點`, defaultParams: {} };
    
    const newNode: WorkflowNode = {
      id: generateNodeId(type),
      type,
      position: { x: Math.random() * 200 + 50, y: Math.random() * 100 + 50 }, // 隨機放置，避免重疊
      data: {
        customName: defaults.defaultName,
        params: defaults.defaultParams,
        outputData: undefined, // 初始時無輸出資料
        // 如果是 upload 節點，可以初始化 fileName
        ...(type === 'upload' ? { fileName: undefined } : {}),
      },
    };
    addNode(newNode);
  };

  return (
    <div className="w-60 bg-gray-50 p-4 space-y-3 border-r shadow">
      <p className="text-lg font-semibold text-gray-700 mb-3">新增節點</p>
      {Object.keys(nodeTypeDefaultParams).map((type) => (
        <Button 
          key={type} 
          onClick={() => handleAddNode(type)} 
          variant="outline" 
          className="w-full justify-start text-left hover:bg-gray-100"
        >
          {/* 可以根據 type 加上 Icon */}
          {type === 'upload' && '📤 '}
          {type === 'filter' && '🔍 '}
          {type === 'vlookup' && '🔗 '}
          {type === 'merge' && '➕ '}
          {type === 'export' && '📥 '}
          {nodeTypeDefaultParams[type].defaultName}
        </Button>
      ))}
    </div>
  );
} 