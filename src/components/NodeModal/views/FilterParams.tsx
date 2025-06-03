"use client";

import React, { useEffect, useState } from "react";
import { Select, SelectTrigger, SelectValue, SelectItem, SelectContent } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useWorkflowStore } from "@/store/workflowStore";
import { WorkflowNode } from "@/types/workflow";
import { filterRows, convertToArray, convertToNodeOutput } from "@/lib/workflowUtils";

interface FilterParams {
  selectedField?: string;
  operator?: string;
  filterValue?: string;
  addField?: string | null;
}

type OutputDataRow = Record<string, string | number | boolean>;

interface FilterParamsProps {
  node: WorkflowNode;
  headers: string[]; // 從 NodeModal 傳過來的所有上游欄位
}

export default function FilterParams({ node, headers }: FilterParamsProps) {
  const { updateNode, nodes, edges } = useWorkflowStore();

  // 從 node.data.params 初始化 state
  const { params } = node.data as { params: FilterParams };
  const initialSelectedField = params?.selectedField || "";
  const initialOperator = params?.operator || "=";
  const initialFilterValue = params?.filterValue || "";

  const [selectedField, setSelectedField] = useState<string>(initialSelectedField);
  const [operator, setOperator] = useState<string>(initialOperator);
  const [filterValue, setFilterValue] = useState<string>(initialFilterValue);

  // 監聽來自 NodeModal 的 addField
  useEffect(() => {
    if (params?.addField) {
      setSelectedField(params.addField);
      // 清掉 store 內暫存的 addField，並將當前選中的欄位存入 params
      updateNode(node.id, {
        ...node.data,
        params: { ...params, addField: null, selectedField: params.addField },
      });
    }
  }, [params?.addField, node.id, updateNode, params, node.data]);

  // 當 selectedField/operator/filterValue 變更，就更新 store 並執行篩選
  useEffect(() => {
    // 更新 params 到 store
    const currentParams = {
      selectedField,
      operator,
      filterValue,
      ...params,
    };
    // 移除 addField，因为它已经被处理
    delete currentParams.addField;
    
    updateNode(node.id, {
      ...node.data,
      params: currentParams,
    });

    // 執行即時預覽
    const upstreamEdge = edges.find((e) => e.target === node.id);
    if (!upstreamEdge) {
      updateNode(node.id, { ...node.data, outputData: undefined });
      return;
    }
    const upstreamNode = nodes.find((n) => n.id === upstreamEdge.source);
    const upstreamData = upstreamNode?.data.outputData as OutputDataRow[] | undefined;

    if (upstreamData && selectedField && operator && filterValue !== "") {
      try {
        // 將 OutputDataRow[] 轉換為 (string | number | boolean)[][]
        const tableData = convertToArray(upstreamData);
        const newOutput = filterRows(tableData, {
          filter: {
            field: selectedField,
            operator: operator as "equals" | "greater" | "less" | "contains",
            value: filterValue
          }
        });
        // 將結果轉換回 OutputDataRow[]
        const convertedOutput = convertToNodeOutput(newOutput);
        updateNode(node.id, { ...node.data, outputData: convertedOutput, params: currentParams });
      } catch (error) {
        console.error("Error during filtering:", error);
        updateNode(node.id, { ...node.data, outputData: undefined, params: currentParams });
      }
    } else {
      updateNode(node.id, { ...node.data, outputData: undefined, params: currentParams });
    }
  }, [selectedField, operator, filterValue, node.id, updateNode, nodes, edges, node.data, params]);
  
  // 當 node.data.params 從外部變化時 (例如，載入工作流)，同步本地 state
  useEffect(() => {
    const nodeParams = node.data.params as FilterParams;
    setSelectedField(nodeParams?.selectedField || "");
    setOperator(nodeParams?.operator || "=");
    setFilterValue(nodeParams?.filterValue || "");
  }, [node.data.params]);


  return (
    <div>
      <div className="mb-4">
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">篩選欄位</label>
        <Select 
          value={selectedField} 
          onValueChange={(value) => {
            setSelectedField(value);
            // 當用戶直接從下拉選擇欄位時，也更新 params.selectedField
            updateNode(node.id, { 
              ...node.data, 
              params: { ...node.data.params, selectedField: value }
            });
          }}
        >
          <SelectTrigger className="w-full h-10 mt-1 bg-white dark:bg-gray-800 dark:text-white">
            <SelectValue placeholder="請從左側選擇或點此選擇欄位" />
          </SelectTrigger>
          <SelectContent>
            {headers.length > 0 ? (
              headers.map((h) => (
                <SelectItem key={h} value={h}>
                  {h}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="disabled" disabled>無可用欄位</SelectItem>
            )}
          </SelectContent>
        </Select>
        {!selectedField && !params?.addField && (
             <p className="text-xs text-gray-500 mt-1">
                 提示：您可以從左側欄位列表點擊一個欄位，或在此直接選擇。
             </p>
        )}
      </div>

      {selectedField && (
        <>
          <div className="mb-4">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">運算子</label>
            <Select value={operator} onValueChange={setOperator}>
              <SelectTrigger className="w-full h-10 mt-1 bg-white dark:bg-gray-800 dark:text-white">
                <SelectValue placeholder="選擇運算子" />
              </SelectTrigger>
              <SelectContent>
                {["=", ">", "<", ">=", "<=", "!=", "contains", "!contains", "startsWith", "endsWith"].map((op) => (
                  <SelectItem key={op} value={op}>
                    {op}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mb-4">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">篩選值</label>
            <Input
              type="text"
              placeholder="輸入篩選值"
              className="w-full mt-1 h-10 bg-white dark:bg-gray-800 dark:text-white"
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
            />
          </div>
        </>
      )}
    </div>
  );
} 