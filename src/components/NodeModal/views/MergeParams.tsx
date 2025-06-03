"use client";

import React, { useEffect, useState } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import { WorkflowNode } from "@/types/workflow";
import { mergeTables } from "@/lib/workflowUtils"; // 確保此函數已在 workflowUtils.ts 中定義
import { Select, SelectTrigger, SelectValue, SelectItem, SelectContent } from "@/components/ui/select";

interface MergeParamsProps {
  node: WorkflowNode;
  upstreamNodes: WorkflowNode[]; // 從 NodeModal 傳下來，可能有多個
}

export default function MergeParams({ node, upstreamNodes }: MergeParamsProps) {
  const { updateNode } = useWorkflowStore();
  const { params } = node.data;

  // 初始化 state，考慮到 Merge 節點可能有多個上游，但 UI 上先只處理前兩個
  const initialTableAId = params?.tableAId || (upstreamNodes[0]?.id || "");
  const initialTableBId = params?.tableBId || (upstreamNodes[1]?.id || "");
  const initialJoinColKey = params?.joinColKey || "";
  const initialJoinType = params?.joinType || "inner"; // 'inner' | 'left' | 'right' | 'full'

  const [tableAId, setTableAId] = useState<string>(initialTableAId);
  const [tableBId, setTableBId] = useState<string>(initialTableBId);
  const [joinColKey, setJoinColKey] = useState<string>(initialJoinColKey);
  const [joinType, setJoinType] = useState<string>(initialJoinType);

  const tableA = upstreamNodes.find(un => un.id === tableAId);
  const tableB = upstreamNodes.find(un => un.id === tableBId);

  const dataA = tableA?.data.outputData as any[][] | undefined;
  const dataB = tableB?.data.outputData as any[][] | undefined;

  // 監聽來自 NodeModal 的 addField (如果需要透過點擊左側欄位來設定 Join Key)
  useEffect(() => {
    if (params?.addField) {
      // 假設 addField 優先設置 joinColKey
      setJoinColKey(params.addField);
      updateNode(node.id, {
        ...node.data,
        params: { ...params, addField: null, joinColKey: params.addField },
      });
    }
  }, [params?.addField, node.id, updateNode, params, node.data]);

  // 當合併相關參數改變，更新 store 並執行合併
  useEffect(() => {
    const currentParams = {
      ...params,
      tableAId,
      tableBId,
      joinColKey,
      joinType,
    };
    delete currentParams.addField;

    updateNode(node.id, {
      ...node.data,
      params: currentParams,
    });

    if (dataA && dataB && joinColKey && joinType) {
      try {
        const newOutput = mergeTables(
          dataA, // mergeTables 預期第一個參數為 tableA 的 data
          dataB, // mergeTables 預期第二個參數為 tableB 的 data
          joinColKey, 
          joinType
        );
        updateNode(node.id, { ...node.data, outputData: newOutput, params: currentParams });
      } catch (error) {
        console.error("Error during merge:", error);
        updateNode(node.id, { ...node.data, outputData: undefined, params: currentParams });
      }
    } else {
      updateNode(node.id, { ...node.data, outputData: undefined, params: currentParams });
    }
  }, [tableAId, tableBId, joinColKey, joinType, node.id, updateNode, dataA, dataB, params, node.data]);

  // 當 node.data.params 或 upstreamNodes 變化時同步 state
  useEffect(() => {
    setTableAId(node.data.params?.tableAId || (upstreamNodes[0]?.id || ""));
    setTableBId(node.data.params?.tableBId || (upstreamNodes[1]?.id || ""));
    setJoinColKey(node.data.params?.joinColKey || "");
    setJoinType(node.data.params?.joinType || "inner");
  }, [node.data.params, upstreamNodes]);

  // 計算 TableA 和 TableB 各自的欄位，以及共同欄位 (用於 Join Key 選擇)
  const headersA = Array.isArray(dataA) && dataA.length > 0 ? (dataA[0] as any[]).map(String) : [];
  const headersB = Array.isArray(dataB) && dataB.length > 0 ? (dataB[0] as any[]).map(String) : [];
  const commonHeaders = headersA.filter(h => headersB.includes(h));
  // 如果希望 Join Key 可以是任一表的任一欄位（例如用於 full outer join 且 key 不同名時），可以用下面的
  // const allPossibleJoinKeys = Array.from(new Set([...headersA, ...headersB]));

  return (
    <div>
      {upstreamNodes.length < 2 && (
        <p className="text-sm text-red-500 mb-4">
          合併操作至少需要兩個上游節點。請連接至少兩個來源節點。
        </p>
      )}

      {/* 選擇 Table A */}
      <div className="mb-4">
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">表格 A (左表)</label>
        <Select 
            value={tableAId} 
            onValueChange={(value) => {
                setTableAId(value);
                if (value === tableBId) setTableBId(""); // 防止選同一個表
            }}
            disabled={upstreamNodes.length === 0}
        >
          <SelectTrigger className="w-full h-10 mt-1 bg-white dark:bg-gray-800 dark:text-white">
            <SelectValue placeholder="選擇表格 A" />
          </SelectTrigger>
          <SelectContent>
            {upstreamNodes.map(un => (
              <SelectItem key={`tableA-${un.id}`} value={un.id} disabled={un.id === tableBId}>
                {un.data.customName || `節點 ${un.id.substring(0,4)}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 選擇 Table B */}
      <div className="mb-4">
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">表格 B (右表)</label>
        <Select 
            value={tableBId} 
            onValueChange={(value) => {
                setTableBId(value);
                if (value === tableAId) setTableAId(""); // 防止選同一個表
            }}
            disabled={upstreamNodes.length === 0}
        >
          <SelectTrigger className="w-full h-10 mt-1 bg-white dark:bg-gray-800 dark:text-white">
            <SelectValue placeholder="選擇表格 B" />
          </SelectTrigger>
          <SelectContent>
            {upstreamNodes.map(un => (
              <SelectItem key={`tableB-${un.id}`} value={un.id} disabled={un.id === tableAId}>
                {un.data.customName || `節點 ${un.id.substring(0,4)}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {tableA && tableB && (
        <>
          <div className="mb-4">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">合併方式 (Join Type)</label>
            <Select value={joinType} onValueChange={setJoinType}>
              <SelectTrigger className="w-full h-10 mt-1 bg-white dark:bg-gray-800 dark:text-white">
                <SelectValue placeholder="選擇合併方式" />
              </SelectTrigger>
              <SelectContent>
                {[{value: "inner", label: "Inner Join (交集)"}, {value: "left", label: "Left Join (以左表為主)"}, {value: "right", label: "Right Join (以右表為主)"}, {value: "full", label: "Full Outer Join (聯集)"}].map(jt => (
                  <SelectItem key={jt.value} value={jt.value}>{jt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mb-4">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">連結欄位 (Join Key)</label>
            <Select 
                value={joinColKey} 
                onValueChange={setJoinColKey}
                disabled={!dataA || !dataB}    
            >
              <SelectTrigger className="w-full h-10 mt-1 bg-white dark:bg-gray-800 dark:text-white">
                <SelectValue placeholder={commonHeaders.length > 0 ? "選擇連結欄位" : "請先確保兩表皆有資料"} />
              </SelectTrigger>
              <SelectContent>
                {/* 這裡使用 commonHeaders，如果需要選擇非共同欄位，則需要修改邏輯 */}
                {commonHeaders.length > 0 ? (
                    commonHeaders.map(h => (
                        <SelectItem key={`joinKey-${h}`} value={h}>{h}</SelectItem>
                    ))
                ) : (
                    <SelectItem value="disabled" disabled>
                        {headersA.length === 0 || headersB.length === 0 ? "選定表格無欄位資料" : "兩表無共同欄位" }
                    </SelectItem>
                )}
              </SelectContent>
            </Select>
            {params?.addField && (
                <p className="text-xs text-gray-500 mt-1">
                    已從左側加入欄位：{params.addField} (若適用)
                </p>
            )}
            {commonHeaders.length === 0 && headersA.length > 0 && headersB.length > 0 && (
                 <p className="text-xs text-yellow-600 mt-1">
                    提示：選取的兩個表格之間沒有共同的欄位名稱可供 Join Key 選擇。請檢查欄位名稱或考慮不需要 Join Key 的合併方式 (如 Cross Join，目前未支援)。
                 </p>
            )}
          </div>
        </>
      )}
       {(!tableA || !tableB) && upstreamNodes.length >=2 && (
        <p className="text-sm text-gray-500 mt-2">
          請選擇要合併的表格 A 和表格 B。
        </p>
      )}
    </div>
  );
} 