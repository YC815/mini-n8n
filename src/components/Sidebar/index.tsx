"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { useWorkflowStore } from "@/store/workflowStore";
import { WorkflowNode } from "@/types/workflow";

export default function Sidebar() {
  const { addNode } = useWorkflowStore();

  const handleAddNode = (type: string) => {
    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type,
      position: { x: 50, y: 50 }, // 預設放在畫布左上方，後續可拖曳
      data: { customName: `${type} 節點`, params: {} },
    };
    addNode(newNode);
  };

  return (
    <div className="w-48 bg-white p-4 space-y-2 border-r">
      <p className="font-semibold">新增節點：</p>
      <Button onClick={() => handleAddNode("fileUpload")}>
        檔案上傳 Trigger
      </Button>
      <Button onClick={() => handleAddNode("filter")}>篩選 Filter</Button>
      <Button onClick={() => handleAddNode("vlookup")}>
        VLOOKUP 節點
      </Button>
      <Button onClick={() => handleAddNode("merge")}>合併 Merge</Button>
      <Button onClick={() => handleAddNode("export")}>
        結果下載 Export
      </Button>
    </div>
  );
} 