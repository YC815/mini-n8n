"use client";

import React, { useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useWorkflowStore } from "@/store/workflowStore";
import { WorkflowNode } from "@/types/workflow";
import FilterParams from "./views/FilterParams";
import VlookupParams from "./views/VlookupParams";
import MergeParams from "./views/MergeParams";
import UploadParams from "./views/UploadParams";
import ExportParams from "./views/ExportParams";
import PreviewPanel from "./views/PreviewPanel";

export default function NodeModal() {
  const {
    nodes,
    edges,
    currentEditingNodeId,
    modalVisible,
    updateNode,
  } = useWorkflowStore();

  // 將所有 Hooks 移到頂層
  const node = useMemo(() => 
    nodes.find((n) => n.id === currentEditingNodeId),
    [nodes, currentEditingNodeId]
  );

  const upstreamEdges = useMemo(() => 
    edges.filter((e) => e.target === currentEditingNodeId),
    [edges, currentEditingNodeId]
  );

  const upstreamNodeIds = useMemo(() => 
    upstreamEdges.map((e) => e.source),
    [upstreamEdges]
  );

  const upstreamNodes = useMemo(() => 
    nodes.filter((n) => upstreamNodeIds.includes(n.id)),
    [nodes, upstreamNodeIds]
  );

  const allUpstreamHeaders = useMemo(() => {
    return Array.from(
      new Set(
        upstreamNodes.flatMap((up) => {
          const data = up.data.outputData;
          if (!Array.isArray(data) || data.length === 0) {
            return [];
          }
          const headers = data[0];
          if (!Array.isArray(headers)) {
            return [];
          }
          return headers.map((h) => String(h));
        })
      )
    );
  }, [upstreamNodes]);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (node) {
      updateNode(node.id, { ...node.data, customName: e.target.value });
    }
  }, [node, updateNode]);

  const handleClose = useCallback(() => {
    useWorkflowStore.setState({ modalVisible: false });
  }, []);

  // 如果 modal 不可見或沒有選中節點，就不 render
  if (!modalVisible || !currentEditingNodeId || !node) {
    return null;
  }

  // -------------- Modal 三區塊主結構 --------------
  return (
    <Dialog open={modalVisible} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
    }}>
      <DialogContent 
        className="w-[800px] max-w-full h-[600px] overflow-hidden p-0 flex flex-col"
        aria-describedby="node-modal-description"
      >
        <DialogHeader className="border-b">
          <DialogTitle className="px-4 py-2">
            <input
              type="text"
              value={node.data.customName || ''}
              onChange={handleNameChange}
              className="text-lg font-semibold border-b border-transparent focus:border-blue-500 focus:outline-none w-full bg-transparent"
            />
          </DialogTitle>
          <DialogClose className="absolute right-4 top-4 text-gray-500 hover:text-gray-700">
            &times;
          </DialogClose>
        </DialogHeader>

        <div id="node-modal-description" className="sr-only">
          節點設定對話框，用於配置節點的參數和查看預覽結果
        </div>

        <div className="flex flex-1 h-full overflow-hidden">
          {/* 左側：來源列表 (Input 區塊) */}
          <div className="w-1/4 border-r overflow-y-auto p-2">
            <p className="text-sm font-medium mb-2">來源節點</p>
            {upstreamNodes.map((up) => {
              const data = up.data.outputData;
              if (!Array.isArray(data) || data.length === 0) {
                return (
                  <div key={up.id} className="mb-4">
                    <p className="text-xs font-medium">{up.data.customName}</p>
                    <div className="ml-2 mt-1 text-xs text-gray-600">
                      <p className="text-xs text-gray-400">暫無上游資料</p>
                    </div>
                  </div>
                );
              }

              const headers = data[0];
              if (!Array.isArray(headers)) {
                return (
                  <div key={up.id} className="mb-4">
                    <p className="text-xs font-medium">{up.data.customName}</p>
                    <div className="ml-2 mt-1 text-xs text-gray-600">
                      <p className="text-xs text-gray-400">資料格式不正確</p>
                    </div>
                  </div>
                );
              }

              const headerStrings = headers.map((h) => String(h));
              
              return (
                <div key={up.id} className="mb-4">
                  <p className="text-xs font-medium">{up.data.customName}</p>
                  <div className="ml-2 mt-1 text-xs text-gray-600">
                    {headerStrings.length > 0 ? (
                      headerStrings.map((h) => (
                        <button
                          key={h}
                          className="block mb-1 px-2 py-0.5 bg-gray-100 rounded hover:bg-gray-200 text-left w-full truncate"
                          onClick={() => {
                            updateNode(node.id, {
                              ...node.data,
                              params: {
                                ...node.data.params,
                                addField: h,
                              },
                            });
                          }}
                        >
                          {h}
                        </button>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400">暫無上游資料</p>
                    )}
                  </div>
                </div>
              );
            })}
            {upstreamNodes.length === 0 && node.type !== 'upload' && (
              <p className="text-xs text-gray-400">無上游節點連接</p>
            )}
          </div>

          {/* 中間：參數設定區 */}
          <div className="w-2/4 overflow-y-auto p-4">
            {(() => {
              switch (node.type) {
                case "upload":
                  return <UploadParams node={node} />;
                case "filter":
                  return (
                    <FilterParams
                      node={node}
                      headers={allUpstreamHeaders}
                    />
                  );
                case "vlookup":
                  return (
                    <VlookupParams
                      node={node}
                      headers={allUpstreamHeaders}
                    />
                  );
                case "merge":
                  return (
                    <MergeParams
                      node={node}
                      upstreamNodes={upstreamNodes}
                    />
                  );
                case "export":
                  return <ExportParams node={node} />;
                default:
                  return <p>未支援的節點類型: {node.type}</p>;
              }
            })()}
          </div>

          {/* 右側：Output 區塊 (即時預覽) */}
          <div className="w-1/4 border-l overflow-y-auto p-2">
            <p className="text-sm font-medium mb-2">Output 預覽</p>
            <PreviewPanel node={node} />
          </div>
        </div>

        <DialogFooter className="border-t">
          <div className="px-4 py-2 text-right">
            <button
              className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={handleClose}
            >
              確認
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 