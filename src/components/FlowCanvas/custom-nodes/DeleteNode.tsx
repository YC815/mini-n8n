"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectItem,
  SelectContent,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useWorkflowStore } from "@/store/workflowStore";
import { deleteRows, convertToArray } from "@/lib/workflowUtils";
import { NodeOutput } from "@/types/workflow";

export default function DeleteNode({ id, data }: NodeProps) {
  console.log(`DeleteNode [${id}]: Initializing with data:`, data);
  const { nodes, edges, updateNode } = useWorkflowStore();

  // ------------- 1. 取得上游輸入資料 -------------
  const upstreamEdge = edges.find((e) => e.target === id);
  const upstreamNode = nodes.find((n) => n.id === upstreamEdge?.source);
  const upstreamData = upstreamNode?.data.outputData as NodeOutput | undefined;

  // 將 Record<string, string | number | boolean>[] 格式轉換為二維陣列
  const tableData = upstreamData ? convertToArray(upstreamData) : undefined;

  // 從 tableData 取 header 列 (所有欄位名稱)
  const headers: string[] =
    Array.isArray(tableData) && tableData.length > 0
      ? (tableData[0].map((h) => String(h)) as string[])
      : [];

  useEffect(() => {
    console.log(`DeleteNode [${id}]: Upstream tableData updated:`, tableData);
  }, [tableData, id]);

  // ------------- 2. Local state 與 store 參數 -------------
  const { mode: storedMode, selectedField: storedField, operator: storedOp, filterValue: storedVal } =
    data.params?.delete || {};

  // 刪除模式：row / col
  const [mode, setMode] = useState<"row" | "col">(storedMode || "row");
  // 刪除欄位 / 刪除欄名
  const [selectedField, setSelectedField] = useState<string>(storedField || "");
  // 刪除列時用：運算子
  const [operator, setOperator] = useState<"=" | ">" | "<" | "contains">(storedOp as "=" | ">" | "<" | "contains" || "=");
  // 刪除列時用：值
  const [filterValue, setFilterValue] = useState<string>(storedVal || "");

  // 處理模式變更
  const handleModeChange = useCallback((value: "row" | "col") => {
    console.log(`DeleteNode [${id}]: Mode changed to:`, value);
    setMode(value);
    setSelectedField("");
    setOperator("=");
    setFilterValue("");
  }, [id]);

  // 處理欄位變更
  const handleFieldChange = useCallback((value: string) => {
    console.log(`DeleteNode [${id}]: Selected field changed to:`, value);
    setSelectedField(value);
  }, [id]);

  // 處理運算子變更
  const handleOperatorChange = useCallback((value: "=" | ">" | "<" | "contains") => {
    console.log(`DeleteNode [${id}]: Operator changed to:`, value);
    setOperator(value);
  }, [id]);

  // 處理值變更
  const handleValueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(`DeleteNode [${id}]: Filter value changed to:`, e.target.value);
    setFilterValue(e.target.value);
  }, [id]);

  // 預覽結果
  const [previewResult, setPreviewResult] = useState<{
    totalRows?: number;
    remainingRows?: number;
    deletedRows?: number;
    sampleDeletedValues?: string[];
    sampleValues?: string[];
  }>({});

  // ------------- 3. 同步參數到 store 並更新預覽 -------------
  useEffect(() => {
    // 只有當參數真正改變時才更新
    if (!data.params?.delete) {
      console.log(`DeleteNode [${id}]: Syncing params to store (initial):`, { mode, selectedField, operator, filterValue });
      updateNode(id, {
        params: {
          ...data.params,
          delete: { mode, selectedField, operator, filterValue }
        },
      });
      return;
    }

    const currentParams = data.params.delete;
    const hasChanged = 
      currentParams.mode !== mode ||
      currentParams.selectedField !== selectedField ||
      currentParams.operator !== operator ||
      currentParams.filterValue !== filterValue;

    if (hasChanged) {
      const timer = setTimeout(() => {
        console.log(`DeleteNode [${id}]: Syncing params to store (debounced):`, { mode, selectedField, operator, filterValue });
        updateNode(id, {
          params: {
            ...data.params,
            delete: { mode, selectedField, operator, filterValue }
          },
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [mode, selectedField, operator, filterValue, id, data.params, updateNode]);

  // 更新預覽結果的 effect
  useEffect(() => {
    if (!tableData) {
      setPreviewResult({});
      console.log(`DeleteNode [${id}]: Preview cleared (no tableData).`);
      return;
    }

    const timer = setTimeout(() => {
      let calculatedPreview = {};
      if (mode === "row" && selectedField && operator && filterValue !== "") {
        const newData = deleteRows(tableData, {
          selectedField,
          operator,
          filterValue,
        });
        const totalRows = tableData.length - 1;
        const remainingRows = newData.length - 1;
        const colIndex = tableData[0].indexOf(selectedField);
        
        const sampleDeletedValues = tableData
          .slice(1)
          .filter((row) => {
            const cell = row[colIndex];
            switch (operator) {
              case "=":
                return cell === filterValue;
              case ">":
                return cell > filterValue;
              case "<":
                return cell < filterValue;
              case "contains":
                return String(cell).toLowerCase().includes(String(filterValue).toLowerCase());
              default:
                return false;
            }
          })
          .slice(0, 3)
          .map(row => String(row[colIndex]));

        calculatedPreview = {
          totalRows,
          remainingRows,
          deletedRows: totalRows - remainingRows,
          sampleDeletedValues
        };
      } else if (mode === "col" && selectedField) {
        const totalRows = tableData.length - 1;
        const colIndex = tableData[0].indexOf(selectedField);
        const sampleValues = tableData
          .slice(1, 4)
          .map(row => String(row[colIndex]));

        calculatedPreview = {
          totalRows,
          remainingRows: totalRows,
          deletedRows: 0,
          sampleValues
        };
      } else {
        calculatedPreview = {};
      }
      setPreviewResult(calculatedPreview);
      console.log(`DeleteNode [${id}]: Preview result updated (debounced):`, calculatedPreview);
    }, 300);

    return () => clearTimeout(timer);
  }, [tableData, mode, selectedField, operator, filterValue, id]);

  // ------------- 5. 計算目前刪除狀態顯示 -------------
  let statusText = "等待設定";
  let previewText = "";
  let sampleText = "";
  
  if (tableData) {
    if (mode === "col" && selectedField) {
      statusText = `刪除欄 "${selectedField}"`;
      previewText = `預計輸出：${previewResult.remainingRows || 0} 筆資料`;
      if (previewResult.sampleValues?.length) {
        sampleText = `欄位值預覽：${previewResult.sampleValues.join(", ")}`;
      }
    } else if (
      mode === "row" &&
      selectedField &&
      operator &&
      filterValue !== ""
    ) {
      statusText = `會刪除 ${previewResult.deletedRows || 0} 列`;
      previewText = `預計輸出：${previewResult.remainingRows || 0} 筆資料`;
      if (previewResult.sampleDeletedValues?.length) {
        sampleText = `將刪除的值（前3筆）：${previewResult.sampleDeletedValues.join(", ")}`;
      }
    }
  }

  return (
    <div className="bg-white border border-gray-300 rounded-lg w-64 p-3 shadow-sm">
      {/* 上方 Handle (可接入連線) */}
      <Handle type="target" position={Position.Top} id="in" />

      {/* 1. 可編輯的節點標題 */}
      <div className="flex items-center mb-2">
        <svg
          className="w-5 h-5 text-red-500 mr-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 13h6m2 6H7a2 2 0 01-2-2V7m6-4h2a2 2 0 012 2v1H7V5a2 2 0 012-2z"
          ></path>
        </svg>
        <input
          type="text"
          value={data.customName || "刪除節點"}
          onChange={(e) =>
            updateNode(id, { customName: e.target.value })
          }
          className="flex-1 text-sm font-semibold border-b border-transparent focus:border-red-500 focus:outline-none"
        />
      </div>

      {/* 2. 刪除模式選擇 */}
      <div className="mb-2">
        <label className="text-xs font-medium">刪除模式</label>
        <Select
          value={mode}
          onValueChange={handleModeChange}
        >
          <SelectTrigger className="w-full h-8 mt-1">
            <SelectValue
              placeholder="選擇模式"
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="row">刪除列</SelectItem>
            <SelectItem value="col">刪除欄</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 3. 依模式顯示不同參數區  */}
      {mode === "row" ? (
        <>
          {/* 3.1 欄位下拉 */}
          <div className="mb-2">
            <label className="text-xs font-medium">欄位</label>
            <Select value={selectedField} onValueChange={handleFieldChange}>
              <SelectTrigger className="w-full h-8 mt-1">
                <SelectValue
                  placeholder="選擇欄位"
                />
              </SelectTrigger>
              <SelectContent>
                {headers.map((h) => (
                  <SelectItem key={h} value={h}>
                    {h}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 3.2 運算子下拉 */}
          <div className="mb-2">
            <label className="text-xs font-medium">運算子</label>
            <Select value={operator} onValueChange={handleOperatorChange}>
              <SelectTrigger className="w-full h-8 mt-1">
                <SelectValue
                  placeholder="選擇運算子"
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="=">=</SelectItem>
                <SelectItem value=">">&gt;</SelectItem>
                <SelectItem value="<">&lt;</SelectItem>
                <SelectItem value="contains">包含</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 3.3 篩選值輸入 */}
          <div className="mb-2">
            <label className="text-xs font-medium">篩選值</label>
            <Input
              type="text"
              placeholder="輸入要刪除的值"
              className="w-full mt-1"
              value={filterValue}
              onChange={handleValueChange}
            />
          </div>
        </>
      ) : (
        <>
          {/* 刪除欄模式：只剩選欄位即可 */}
          <div className="mb-2">
            <label className="text-xs font-medium">欄位</label>
            <Select
              value={selectedField}
              onValueChange={handleFieldChange}
            >
              <SelectTrigger className="w-full h-8 mt-1">
                <SelectValue
                  placeholder="選擇要刪除的欄位"
                />
              </SelectTrigger>
              <SelectContent>
                {headers.map((h) => (
                  <SelectItem key={h} value={h}>
                    {h}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {/* 5. 狀態顯示區 */}
      <div className="space-y-1">
        <p className="text-xs text-gray-600">{statusText}</p>
        {previewText && (
          <p className="text-xs text-blue-600 font-medium">{previewText}</p>
        )}
        {sampleText && (
          <p className="text-xs text-gray-500 italic">{sampleText}</p>
        )}
      </div>

      {/* 下方 Handle (可外連) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="out"
        className="mt-2"
      />
    </div>
  );
} 