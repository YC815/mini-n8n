"use client";

import React, { useEffect, useState } from "react";
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
import { NodeOutput, MergeParams } from "@/types/workflow";

interface MergeNodeData {
  customName: string;
  params: MergeParams;
  outputData?: NodeOutput;
}

export default function MergeNode({ id, data, selected }: NodeProps<MergeNodeData>) {
  const { nodes, edges, updateNode } = useWorkflowStore();

  const [joinKey, setJoinKey] = useState<string | undefined>(data.params.joinColKey);
  const [commonHeaders, setCommonHeaders] = useState<string[]>([]);
  const [upstreamError, setUpstreamError] = useState<string | null>(null);

  useEffect(() => {
    const incomingEdges = edges.filter((e) => e.target === id);
    const sourceNodeIds = incomingEdges.map(e => e.source);

    let headersA: string[] = [];
    let headersB: string[] = [];
    let errorMsg: string | null = null;

    if (sourceNodeIds.length < 2) {
      errorMsg = "需要至少兩個上游節點進行合併。";
    } else {
      const nodeA = nodes.find(n => n.id === sourceNodeIds[0]);
      const nodeB = nodes.find(n => n.id === sourceNodeIds[1]);

      if (nodeA && nodeA.data.outputData && nodeA.data.outputData.length > 0 && Object.keys(nodeA.data.outputData[0]).length > 0) {
        headersA = Object.keys(nodeA.data.outputData[0]);
      } else {
        errorMsg = (errorMsg || "") + "第一個上游節點無有效資料或欄位。 ";
      }

      if (nodeB && nodeB.data.outputData && nodeB.data.outputData.length > 0 && Object.keys(nodeB.data.outputData[0]).length > 0) {
        headersB = Object.keys(nodeB.data.outputData[0]);
      } else {
        errorMsg = (errorMsg || "") + "第二個上游節點無有效資料或欄位。 ";
      }
    }
    
    setUpstreamError(errorMsg);

    if (headersA.length > 0 && headersB.length > 0) {
      const currentCommonHeaders = headersA.filter(h => headersB.includes(h));
      setCommonHeaders(currentCommonHeaders);
      
      if (currentCommonHeaders.length === 1) {
        if (joinKey !== currentCommonHeaders[0]) {
            setJoinKey(currentCommonHeaders[0]);
        }
      } else if (currentCommonHeaders.length > 1 && joinKey && !currentCommonHeaders.includes(joinKey)) {
        setJoinKey(undefined);
      } else if (currentCommonHeaders.length === 0) {
        setJoinKey(undefined);
      }
      
    } else {
      setCommonHeaders([]);
      setJoinKey(undefined);
    }

  }, [id, nodes, edges, joinKey]);

  useEffect(() => {
    const currentParams = data.params || {};
    if (currentParams.joinColKey !== joinKey || currentParams.joinType !== 'left') {
        updateNode(id, { params: { ...currentParams, joinColKey: joinKey, joinType: 'left' } });
    }
  }, [id, joinKey, updateNode, data.params]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateNode(id, { customName: e.target.value });
  };

  return (
    <div className={`bg-white border-2 ${selected ? 'border-blue-500' : 'border-gray-300'} rounded-lg w-64 p-3 shadow-md`}>
      <Handle type="target" position={Position.Top} id="a" isConnectableStart={false} className="!bg-teal-500" />
      
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

      {upstreamError && !commonHeaders.length && (!nodes.find(n => n.id === edges.find(e => e.target === id)?.source)?.data.outputData || nodes.find(n => n.id === edges.find(e => e.target === id)?.source)?.data.outputData?.length === 0) ? (
        <p className="text-xs text-red-500 p-2 bg-red-50 rounded">{upstreamError}</p>
      ) : commonHeaders.length > 0 ? (
        <div className="space-y-2 text-sm">
          <Select value={joinKey || ""} onValueChange={(value) => setJoinKey(value === "" ? undefined : value)}>
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
          <p className="text-xs text-gray-500">合併方式: Left Join</p> 
        </div>
      ) : upstreamError ? (
        <p className="text-xs text-red-500 p-2 bg-red-50 rounded">{upstreamError}</p>
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