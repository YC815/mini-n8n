import { NodeOutput } from "@/types/workflow";

// 簡單示例：只顯示欄位名稱與型別
export default function SchemaView({ data }: { data: NodeOutput[] }) {
  if (!data.length) {
    return <p>無資料</p>;
  }
  // 假設第一筆為物件，分析其屬性
  const sample = Array.isArray(data[0]) ? data[0] : data[0];
  const keys = Array.isArray(sample) ? sample.map((_, idx) => `col${idx}`) : Object.keys(sample);
  return (
    <ul className="text-sm">
      {keys.map((key, idx) => {
        const type = Array.isArray(sample)
          ? typeof sample[idx]
          : typeof (sample as Record<string, string | number | boolean>)[key];
        return (
          <li key={key}>
            {key}: <span className="font-mono">{type}</span>
          </li>
        );
      })}
    </ul>
  );
} 