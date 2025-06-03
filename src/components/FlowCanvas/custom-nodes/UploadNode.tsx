"use client";

import React, { useRef, useState, useCallback } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWorkflowStore } from "@/store/workflowStore";
import { parseExcel } from "@/lib/excelUtils";
import { NodeOutput, WorkflowNodeData } from "@/types/workflow";

// UploadNodeData を直接使用
// interface UploadNodeData {
//   customName: string;
//   params: UploadParams; // UploadParams を使用
//   outputData?: NodeOutput;
//   fileName?: string;
// }

export default function UploadNode({ id, data, selected }: NodeProps<WorkflowNodeData>) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { updateNode } = useWorkflowStore();

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    console.log("UploadNode: File selected -", file.name, "Size:", file.size);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const parsedDataArray = parseExcel(arrayBuffer);
      
      // Log parsed data for debugging encoding issues
      if (parsedDataArray && parsedDataArray.length > 0) {
        console.log("UploadNode: Parsed Excel Headers:", JSON.stringify(parsedDataArray[0]));
        if (parsedDataArray.length > 1) {
          console.log("UploadNode: Parsed Excel First Data Row:", JSON.stringify(parsedDataArray[1]));
        }
      }

      let output: NodeOutput = [];
      if (parsedDataArray.length > 0 && Array.isArray(parsedDataArray[0]) && parsedDataArray[0].length > 0) {
        const headers = parsedDataArray[0].map(String);
        output = parsedDataArray.slice(1).map(row => {
          const obj: Record<string, string | number | boolean> = {};
          headers.forEach((header, index) => {
            obj[header] = row[index];
          });
          return obj;
        });
      }
      // updateNode に渡す data は WorkflowNodeData の部分集合。保留 data.params 的使用。
      updateNode(id, { outputData: output, fileName: file.name, params: data.params }); 
    } catch (error) {
      console.error("Error parsing Excel file in UploadNode:", error);
      // 保留 data.params 的使用。
      updateNode(id, { outputData: [], fileName: file.name, params: data.params }); 
    }
    setIsLoading(false);
  }, [id, updateNode, data.params]); // 保留 data.params 在依賴數組中。

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateNode(id, { customName: e.target.value });
  };

  return (
    <div className={`bg-white border-2 ${selected ? 'border-blue-500' : 'border-gray-300'} rounded-lg w-60 p-3 shadow-md`}>
      {/* UploadNode 通常是起點，所以只保留 Source Handle 
          若允許作為流程中間節點，可以取消註解 Target Handle 
      <Handle type="target" position={Position.Top} id="a" className="!bg-teal-500"/>
      */}
      
      <div className="flex items-center mb-2">
        {/* 簡易 Icon (可替換成 SVG) */}
        <div className="mr-2 text-blue-500">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
        </div>
        <Input 
          type="text" 
          value={data.customName} 
          onChange={handleNameChange} 
          className="font-semibold text-gray-700 text-sm p-1 border-none focus:ring-0 shadow-none"
          placeholder="檔案上傳節點"
        />
      </div>

      <div className="flex flex-col space-y-2 mb-2">
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          ref={inputRef}
          onChange={handleFileChange}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            '選擇檔案'
          )}
        </Button>
        {data.fileName && (
          <p className="text-xs text-gray-500 truncate" title={data.fileName}>{data.fileName}</p>
        )}
      </div>

      {data.outputData && (
        <p className="text-xs text-green-600">
          已匯入 {Array.isArray(data.outputData) ? data.outputData.length : 'N/A'} 筆資料
        </p>
      )}
      {!data.outputData && !isLoading && data.fileName && (
         <p className="text-xs text-red-500">
           檔案解析失敗或無資料
         </p>
      )}

      <Handle type="source" position={Position.Bottom} id="b" className="!bg-teal-500" />
    </div>
  );
} 