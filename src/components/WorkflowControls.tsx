"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { useWorkflowStore } from "@/store/workflowStore";

export default function WorkflowControls() {
  const { executeWorkflow, isExecuting } = useWorkflowStore();

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4">
      <Button
        onClick={executeWorkflow}
        disabled={isExecuting}
        className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-lg"
      >
        {isExecuting ? "執行中..." : "開始執行"}
      </Button>
    </div>
  );
} 