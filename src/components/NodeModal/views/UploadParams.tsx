"use client";

import React, { useState, useCallback } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import { WorkflowNode } from "@/types/workflow";
import { parseExcel } from "@/lib/excelUtils";

interface UploadParamsProps {
  node: WorkflowNode;
}

export default function UploadParams({ node }: UploadParamsProps) {
  const { updateNode } = useWorkflowStore();
  const [fileName, setFileName] = useState<string>("");
  const [fileType, setFileType] = useState<string[]>([]);
  const [filePath, setFilePath] = useState<string>("");

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFileType([file.type]);
    setFilePath(file.name);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const buffer = event.target?.result as ArrayBuffer;

      try {
        const data = await parseExcel(buffer);
        updateNode(node.id, {
          ...node.data,
          outputData: data,
        });
      } catch (error) {
        console.error("Error reading Excel file:", error);
      }
    };
    reader.readAsArrayBuffer(file);
  }, [node.id, updateNode, node.data]);

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="file-upload"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          上傳 Excel 檔案
        </label>
        <div className="mt-1">
          <input
            id="file-upload"
            name="file-upload"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-violet-50 file:text-violet-700
              hover:file:bg-violet-100
              dark:file:bg-violet-900 dark:file:text-violet-200
              dark:hover:file:bg-violet-800"
          />
        </div>
      </div>

      {fileName && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            檔案名稱: {fileName}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            檔案類型: {fileType.join(", ")}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            檔案路徑: {filePath}
          </p>
        </div>
      )}
    </div>
  );
} 