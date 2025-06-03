"use client";

import React, { useMemo, useCallback } from "react";
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
import { FilterParams, WorkflowNodeData } from "@/types/workflow";

export default function FilterNode({ id, data, selected }: NodeProps<WorkflowNodeData>) {
  const { nodes, edges, updateNode } = useWorkflowStore();

  // 使用 useMemo 來記憶化上游節點的資料
  const upstreamData = useMemo(() => {
    const upstreamEdge = edges.find((e) => e.target === id);
    if (!upstreamEdge) {
      return { headers: [], error: "無上游節點連接。" };
    }

    const upstreamNode = nodes.find((n) => n.id === upstreamEdge.source);
    if (!upstreamNode?.data.outputData) {
      return { headers: [], error: "上游節點未連接或無輸出資料。" };
    }

    const firstRow = upstreamNode.data.outputData[0];
    if (!firstRow || typeof firstRow !== 'object') {
      return { headers: [], error: "上游節點無資料輸出行或輸出格式不符。" };
    }

    return { headers: Object.keys(firstRow), error: null };
  }, [id, nodes, edges]);

  // 使用 useCallback 記憶化更新函數
  const handleFieldChange = useCallback((newField: string) => {
    updateNode(id, {
      ...data,
      params: {
        ...data.params,
        filter: {
          ...data.params.filter,
          field: newField
        }
      }
    });
  }, [id, data, updateNode]);

  const handleOperatorChange = useCallback((newOperator: string) => {
    updateNode(id, {
      ...data,
      params: {
        ...data.params,
        filter: {
          ...data.params.filter,
          operator: newOperator as FilterParams["operator"]
        }
      }
    });
  }, [id, data, updateNode]);

  const handleValueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    updateNode(id, {
      ...data,
      params: {
        ...data.params,
        filter: {
          ...data.params.filter,
          value: newValue
        }
      }
    });
  }, [id, data, updateNode]);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    updateNode(id, {
      ...data,
      customName: newName
    });
  }, [id, data, updateNode]);

  // 取用時這樣寫
  const filterParams = data.params.filter || {};

  // 例如
  const fieldValue = filterParams.field || '';
  const operatorValue = filterParams.operator || '';
  const valueValue = filterParams.value || '';
  const customNameValue = data.customName || '';

  return (
    <div className={`bg-white border-2 ${selected ? 'border-blue-500' : 'border-gray-300'} rounded-lg w-64 p-3 shadow-md`}>
      <Handle type="target" position={Position.Top} id="a" className="!bg-teal-500" />
      
      <div className="flex items-center mb-2">
        <div className="mr-2 text-purple-500">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/></svg>
        </div>
        <Input 
          type="text" 
          value={customNameValue}
          onChange={handleNameChange} 
          className="font-semibold text-gray-700 text-sm p-1 border-none focus:ring-0 shadow-none"
          placeholder="篩選節點"
        />
      </div>

      {upstreamData.error ? (
        <p className="text-xs text-red-500 p-2 bg-red-50 rounded">{upstreamData.error}</p>
      ) : upstreamData.headers.length > 0 ? (
        <div className="space-y-2 text-sm">
          <Select 
            value={fieldValue} 
            onValueChange={handleFieldChange}
          >
            <SelectTrigger className="w-full h-9">
              <SelectValue placeholder="選擇篩選欄位" />
            </SelectTrigger>
            <SelectContent>
              {upstreamData.headers.map((h) => (
                <SelectItem key={h} value={h}>
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select 
            value={operatorValue} 
            onValueChange={handleOperatorChange}
          >
            <SelectTrigger className="w-full h-9">
              <SelectValue placeholder="選擇運算子" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="equals">等於 (=)</SelectItem>
              <SelectItem value="greater">大於 (&gt;)</SelectItem>
              <SelectItem value="less">小於 (&lt;)</SelectItem>
              <SelectItem value="contains">包含 (contains)</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="text"
            placeholder="輸入篩選值"
            className="w-full h-9"
            value={valueValue}
            onChange={handleValueChange}
          />
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