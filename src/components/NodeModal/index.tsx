"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  // DialogTrigger, // DialogTrigger は使わないため削除
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useWorkflowStore } from "@/store/workflowStore";
import { NodeOutput } from "@/types/workflow";
import JsonView from "./views/JsonView";
import SchemaView from "./views/SchemaView";
import TableView from "./views/TableView";

export default function NodeModal() {
  const {
    nodes,
    edges,
    excelData,
    currentEditingNodeId,
    modalVisible,
    updateNode,
    closeModal, // closeModal を store から取得 (後で store に追加する)
  } = useWorkflowStore();

  // selectedView の型を string に変更し、初期値を "json" に設定
  const [selectedView, setSelectedView] = useState<string>("json");

  // Dialog の open/onOpenChange を制御するためにローカルステートを追加
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(modalVisible);
  }, [modalVisible]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeModal(); // store の closeModal を呼ぶ
    }
    setIsOpen(open);
  };

  if (!isOpen || !currentEditingNodeId) { // modalVisible の代わりに isOpen を使用
    return null;
  }

  const node = nodes.find((n) => n.id === currentEditingNodeId)!;

  // node が見つからない場合の早期リターン
  if (!node) {
    console.error(`Node with id ${currentEditingNodeId} not found.`);
    closeModal();
    return null;
  }

  // 收集前序節點資料：先找出 edges 中所有連到此 node 的 source nodes
  const upstreamNodeIds = edges
    .filter((e) => e.target === node.id)
    .map((e) => e.source);
  
  // upstreamData の初期値を空配列に設定
  let upstreamData: NodeOutput[] = [];
  if (upstreamNodeIds.length > 0) {
    upstreamData = nodes
      .filter((n) => upstreamNodeIds.includes(n.id))
      .map((n) => n.data.outputData) //  excelData を直接参照せず、outputData を優先
      .filter(data => data !== undefined); // outputData が undefined の場合は除外
  }
  // もし fileUpload ノードで、かつ outputData がなければ、excelData を表示
  if (node.type === 'fileUpload' && (!node.data.outputData || node.data.outputData.length === 0) && excelData.length > 0) {
    // 將 excelData 轉換為 NodeOutput 格式
    const typedExcelData = excelData as (string | number | boolean)[][];
    const headers = typedExcelData[0] as string[];
    const convertedData = typedExcelData.slice(1).map(row => {
      const obj: Record<string, string | number | boolean> = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });
    upstreamData = [convertedData];
  }
  // upstreamData がそれでも空の場合は、空の配列の配列を JsonView などに渡す
  if (upstreamData.length === 0 && node.type !== 'fileUpload') { // Trigger以外のノードで入力がない場合
    upstreamData = [[]];
  }


  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[80vw] md:max-w-[70vw] lg:max-w-[60vw] xl:max-w-[50vw]"> {/* Dialog の幅を調整 */}
        <DialogHeader>
          <DialogTitle>編輯節點：{node.data.customName}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 max-h-[70vh] overflow-y-auto"> {/* 高さ制限とスクロール */} 
          {/* 左側：前序節點資料檢視 */}
          <div className="w-full md:w-1/2 bg-gray-50 p-2 rounded">
            <Tabs defaultValue={selectedView} onValueChange={(value) => setSelectedView(value)} className="flex flex-col h-full"> {/* Tabs に flex-col と h-full を追加 */}
              <TabsList>
                <TabsTrigger value="json">JSON</TabsTrigger>
                <TabsTrigger value="schema">Schema</TabsTrigger>
                <TabsTrigger value="table">Table</TabsTrigger>
              </TabsList>
              <TabsContent value="json" className="flex-grow overflow-auto"> {/* flex-grow と overflow-auto を追加 */}
                <JsonView data={upstreamData.length > 0 ? upstreamData : [[]]} />
              </TabsContent>
              <TabsContent value="schema" className="flex-grow overflow-auto"> {/* flex-grow と overflow-auto を追加 */}
                <SchemaView data={upstreamData.length > 0 ? upstreamData : [[]]} />
              </TabsContent>
              <TabsContent value="table" className="flex-grow overflow-auto"> {/* flex-grow と overflow-auto を追加 */}
                <TableView data={upstreamData.length > 0 ? upstreamData : [[]]} />
              </TabsContent>
            </Tabs>
          </div>
          {/* 右側：本節點參數設定 */}
          <div className="w-full md:w-1/2 p-2">
            <label className="block mb-2 font-medium">自訂名稱：</label>
            <input
              type="text"
              className="w-full border p-1 rounded mb-4"
              value={node.data.customName}
              onChange={(e) =>
                updateNode(node.id, { customName: e.target.value })
              }
            />
            {/* 根據 node.type 不同顯示不同參數輸入元件，例如 FilterNode 顯示欄位與條件選擇 */}
            {node.type === "filter" && (
              <div>
                <p className="text-sm text-gray-500">篩選節點參數設定 (待實作)</p>
                {/* 範例：選擇要篩選的欄位、條件、值 */}
                {/* 可以用 shadcn/ui 的 Select、Input 等 */}
              </div>
            )}
             {node.type === "fileUpload" && (
              <div>
                <p className="text-sm text-gray-500">檔案上傳節點 (無參數)</p>
              </div>
            )}
            {node.type === "vlookup" && (
              <div>
                <p className="text-sm text-gray-500">VLOOKUP 節點參數設定 (待實作)</p>
              </div>
            )}
            {node.type === "merge" && (
              <div>
                <p className="text-sm text-gray-500">合併節點參數設定 (待實作)</p>
              </div>
            )}
            {node.type === "export" && (
              <div>
                <p className="text-sm text-gray-500">結果下載節點 (無參數)</p>
              </div>
            )}
            {/* 其餘節點的參數設定類似 */}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 