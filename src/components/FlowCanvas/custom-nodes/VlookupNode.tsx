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
import { VlookupParams, WorkflowNodeData } from "@/types/workflow";

interface SpecificVlookupNodeData extends Omit<WorkflowNodeData, 'params'> {
  params: VlookupParams;
}

export default function VlookupNode({ id, data, selected }: NodeProps<SpecificVlookupNodeData>) {
  const { nodes, edges, updateNode } = useWorkflowStore();

  const [lookupField, setLookupField] = useState<string | undefined>(data.params.lookupField);
  const [targetField, setTargetField] = useState<string | undefined>(data.params.targetField);
  const [returnField, setReturnField] = useState<string | undefined>(data.params.returnField);

  const [upstreamHeaders, setUpstreamHeaders] = useState<string[]>([]);
  const [upstreamError, setUpstreamError] = useState<string | null>(null);

  useEffect(() => {
    const upstreamEdge = edges.find((e) => e.target === id);
    if (upstreamEdge) {
      const upstreamNode = nodes.find((n) => n.id === upstreamEdge.source);
      if (upstreamNode && upstreamNode.data.outputData) {
        if (upstreamNode.data.outputData.length > 0 && typeof upstreamNode.data.outputData[0] === 'object' && upstreamNode.data.outputData[0] !== null) {
          setUpstreamHeaders(Object.keys(upstreamNode.data.outputData[0]));
          setUpstreamError(null);
        } else {
          setUpstreamHeaders([]);
          setUpstreamError("上游節點無資料輸出行或輸出格式不符。");
        }
      } else {
        setUpstreamHeaders([]);
        setUpstreamError("上游節點未連接或無輸出資料。");
      }
    } else {
      setUpstreamHeaders([]);
      setUpstreamError("無上游節點連接。");
    }
  }, [id, nodes, edges]);

  useEffect(() => {
    updateNode(id, { params: { vlookup: { lookupField, targetField, returnField } } });
  }, [id, lookupField, targetField, returnField, updateNode]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateNode(id, { customName: e.target.value });
  };

  return (
    <div className={`bg-white border-2 ${selected ? 'border-blue-500' : 'border-gray-300'} rounded-lg w-64 p-3 shadow-md`}>
      <Handle type="target" position={Position.Top} id="a" className="!bg-teal-500" />
      
      <div className="flex items-center mb-2">
        <div className="mr-2 text-green-500">
         <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="11" x2="11" y1="8" y2="14"/><line x1="8" x2="14" y1="11" y2="11"/></svg>
        </div>
        <Input 
          type="text" 
          value={data.customName} 
          onChange={handleNameChange} 
          className="font-semibold text-gray-700 text-sm p-1 border-none focus:ring-0 shadow-none"
          placeholder="VLOOKUP 節點"
        />
      </div>

      {upstreamError ? (
        <p className="text-xs text-red-500 p-2 bg-red-50 rounded">{upstreamError}</p>
      ) : upstreamHeaders.length > 0 ? (
        <div className="space-y-2 text-sm">
          <Select value={lookupField} onValueChange={(v: string) => setLookupField(v)}>
            <SelectTrigger className="w-full h-9">
              <SelectValue placeholder="選擇查找欄位 (Lookup Field)" />
            </SelectTrigger>
            <SelectContent>
              {upstreamHeaders.map((h) => (
                <SelectItem key={`lookup-${h}`} value={h}>
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="text"
            placeholder="輸入查找值 (Return Value/Field)"
            className="w-full h-9"
            value={returnField || ''}
            onChange={(e) => setReturnField(e.target.value)}
          />

          <Select value={targetField} onValueChange={(v: string) => setTargetField(v)}>
            <SelectTrigger className="w-full h-9">
              <SelectValue placeholder="選擇目標/回傳欄位 (Target Field)" />
            </SelectTrigger>
            <SelectContent>
              {upstreamHeaders.map((h) => (
                <SelectItem key={`target-${h}`} value={h}>
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <p className="text-xs text-gray-400 p-2 bg-gray-50 rounded">等待上游資料或上游無欄位資訊...</p>
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