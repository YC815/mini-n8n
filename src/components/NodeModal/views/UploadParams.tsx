"use client";

import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";
import { useWorkflowStore } from "@/store/workflowStore";
import { WorkflowNode } from "@/types/workflow";

interface UploadParamsProps {
  node: WorkflowNode;
}

export default function UploadParams({ node }: UploadParamsProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { updateNode } = useWorkflowStore();
  
  // 從 node.data.params 初始化 state
  const [fileName, setFileName] = useState<string>(
    node.data.params?.fileName || ""
  );
  const [sheetNames, setSheetNames] = useState<string[]>(
    node.data.params?.sheetNames || []
  );
  const [selectedSheet, setSelectedSheet] = useState<string>(
    node.data.params?.selectedSheet || ""
  );
  // 存儲 ArrayBuffer，但不直接顯示，僅用於重新選擇 sheet 時的解析
  const [arrayBuffer, setArrayBuffer] = useState<ArrayBuffer | null>(node.data.params?.arrayBuffer || null);

  // 當 node.data.params 變化時，同步更新內部 state (例如，從外部載入工作流時)
  useEffect(() => {
    setFileName(node.data.params?.fileName || "");
    setSheetNames(node.data.params?.sheetNames || []);
    setSelectedSheet(node.data.params?.selectedSheet || "");
    setArrayBuffer(node.data.params?.arrayBuffer || null);
  }, [node.data.params]);

  // 當使用者重新選檔
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const newFileName = file.name;
    setFileName(newFileName);

    const fileBuffer = await file.arrayBuffer();
    setArrayBuffer(fileBuffer); // 保存新的 ArrayBuffer

    const workbook = XLSX.read(fileBuffer, { type: "array" });
    const wsNames = workbook.SheetNames; // e.g. ["Sheet1", "Sheet2"]
    setSheetNames(wsNames);
    
    const firstSheet = wsNames[0] || "";
    setSelectedSheet(firstSheet);

    if (firstSheet) {
      // 解析第一張表並更新 outputData
      const worksheet = workbook.Sheets[firstSheet];
      const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
      updateNode(node.id, {
        ...node.data,
        outputData: jsonData,
        params: {
          ...node.data.params,
          fileName: newFileName,
          arrayBuffer: fileBuffer, // 更新存儲的 ArrayBuffer
          sheetNames: wsNames,
          selectedSheet: firstSheet,
        },
      });
    } else {
      // 如果沒有工作表，清空 outputData 和相關 params
      updateNode(node.id, {
        ...node.data,
        outputData: undefined,
        params: {
          ...node.data.params,
          fileName: newFileName,
          arrayBuffer: fileBuffer,
          sheetNames: [],
          selectedSheet: "",
        },
      });
    }
  };

  // 當使用者在下拉選單選擇工作表時，重新解析該表並存到 outputData
  const handleSheetSelect = async (sheet: string) => {
    setSelectedSheet(sheet);
    
    if (!arrayBuffer) { // 使用 state 中的 arrayBuffer
        console.error("ArrayBuffer is missing for sheet selection.");
        return;
    }

    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const worksheet = workbook.Sheets[sheet];
    const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
    
    updateNode(node.id, {
        ...node.data,
        outputData: jsonData,
        params: { ...node.data.params, selectedSheet: sheet, fileName, sheetNames, arrayBuffer }, //確保 fileName, sheetNames, arrayBuffer 也被儲存
    });
  };

  const rowCount =
    Array.isArray(node.data.outputData) && node.data.outputData.length > 0
      ? node.data.outputData.length - 1 // 減去標頭行
      : 0;

  return (
    <div>
      <div className="mb-4">
        <Button
          size="sm"
          variant="outline"
          onClick={() => inputRef.current?.click()}
        >
          重新選擇檔案
        </Button>
        <input
          type="file"
          accept=".xlsx,.xls,.csv" // 增加 .csv 支援
          ref={inputRef}
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {fileName && (
        <p className="text-sm mb-2">
          已匯入檔案：<span className="font-medium">{fileName}</span>
        </p>
      )}

      {sheetNames.length > 0 && (
        <div className="mb-4">
          <label className="text-sm mb-1 block">選擇工作表：</label>
          <select
            className="border rounded px-2 py-1 w-full text-sm bg-white dark:bg-gray-800 dark:text-white"
            value={selectedSheet}
            onChange={(e) => handleSheetSelect(e.target.value)}
          >
            {sheetNames.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )}

      {rowCount > 0 ? (
        <p className="text-sm text-green-600">
          已匯入 <span className="font-medium">{rowCount}</span> 筆資料 (不含標頭)
        </p>
      ) : fileName ? (
        <p className="text-sm text-yellow-600">此工作表可能無資料，或尚未選擇工作表。</p>
      ): (
        <p className="text-sm text-gray-400">尚未選擇任何資料表</p>
      )}
    </div>
  );
} 