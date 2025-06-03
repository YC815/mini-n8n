"use client";

import React, { useEffect, useState, useCallback } from "react";
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
import { NodeOutput, MergeParams, WorkflowNode } from "@/types/workflow";

interface MergeNodeData {
  customName: string;
  params: MergeParams;
  outputData?: NodeOutput;
}

export default function MergeNode({ id, data, selected }: NodeProps<MergeNodeData>) {
  const { nodes, edges, updateNode } = useWorkflowStore();

  const [joinKey, setJoinKey] = useState<string | undefined>(data.params.key);
  
  const [upstreamHeadersA, setUpstreamHeadersA] = useState<string[]>([]);
  const [upstreamHeadersB, setUpstreamHeadersB] = useState<string[]>([]);
  const [commonHeaders, setCommonHeaders] = useState<string[]>([]);
  const [upstreamError, setUpstreamError] = useState<string | null>(null);

  useEffect(() => {
    const incomingEdges = edges.filter((e) => e.target === id);
    const sourceNodeIds = incomingEdges.map(e => e.source);

    if (sourceNodeIds.length < 2) {
      setUpstreamError("需要至少兩個上游節點進行合併。");
      setUpstreamHeadersA([]);
      setUpstreamHeadersB([]);
      setCommonHeaders([]);
      return;
    }

    const nodeA = nodes.find(n => n.id === sourceNodeIds[0]);
    const nodeB = nodes.find(n => n.id === sourceNodeIds[1]);

    let error = null;
    let headersA: string[] = [];
    let headersB: string[] = [];

    if (nodeA && nodeA.data.outputData && nodeA.data.outputData.length > 0) {
      headersA = Object.keys(nodeA.data.outputData[0]);
    } else {
      error = (error || "") + "第一個上游節點無有效資料或欄位。 ";
    }

    if (nodeB && nodeB.data.outputData && nodeB.data.outputData.length > 0) {
      headersB = Object.keys(nodeB.data.outputData[0]);
    } else {
      error = (error || "") + "第二個上游節點無有效資料或欄位。 ";
    }
    
    setUpstreamHeadersA(headersA);
    setUpstreamHeadersB(headersB);
    setUpstreamError(error);

    if (headersA.length > 0 && headersB.length > 0) {
      setCommonHeaders(headersA.filter(h => headersB.includes(h)));
    } else {
      setCommonHeaders([]);
    }

  }, [id, nodes, edges]);

  useEffect(() => {
    // MergeNode 的 params 也可能需要包含 tableB 的來源 nodeId，如果不是固定取前兩個 incoming edge
    // 目前的 workflowUtils.ts 的 mergeTables 第二個參數是 otherTable 的 data
    // 但在卡片上，使用者應該是選 Join Key
    // otherTable 的數據應該由 executeWorkflow 階段根據連線動態傳入 mergeTables
    updateNode(id, { params: { key: joinKey } }); 
  }, [id, joinKey, updateNode]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateNode(id, { customName: e.target.value });
  };

  return (
    <div className={`bg-white border-2 ${selected ? 'border-blue-500' : 'border-gray-300'} rounded-lg w-64 p-3 shadow-md`}>
      <Handle type="target" position={Position.Top} id="a" isConnectableStart={false} className="!bg-teal-500" />
      {/* Merge 節點可以有多個輸入，但 React Flow 的 Handle 預設只畫一個。
          若要視覺上表示多個輸入點，需要自訂 Handle 或使用多個 target Handle (e.g., id="a", id="b") 
          這裡我們假設 `workflowUtils` 會處理多個輸入源的邏輯。*/}
      
      <div className="flex items-center mb-2">
        <div className="mr-2 text-orange-500">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2h-1"/><path d="M18 18h-2V7h4v5h-2Z"/><path d="m4 10 3-3 3 3"/><path d="M7 7v11"/></svg>
        </div>
        <Input 
          type="text" 
          value={data.customName} 
          onChange={handleNameChange} 
          className="font-semibold text-gray-700 text-sm p-1 border-none focus:ring-0 shadow-none"
        />
      </div>

      {upstreamError && !commonHeaders.length ? (
        <p className="text-xs text-red-500 p-2 bg-red-50 rounded">{upstreamError}</p>
      ) : commonHeaders.length > 0 ? (
        <div className="space-y-2 text-sm">
          <Select value={joinKey} onValueChange={setJoinKey}>
            <SelectTrigger className="w-full h-9">
              <SelectValue placeholder="選擇合併依據欄位 (Join Key)" />
            </SelectTrigger>
            <SelectContent>
              {commonHeaders.map((h) => (
                <SelectItem key={h} value={h}>
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {upstreamError && <p className="text-xs text-orange-500 pt-1">注意: {upstreamError}</p>}
        </div>
      ) : (
        <p className="text-xs text-gray-400 p-2 bg-gray-50 rounded">等待上游資料或無共同欄位可合併...</p>
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