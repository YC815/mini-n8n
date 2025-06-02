import { NodeOutput } from "@/types/workflow";

export default function TableView({ data }: { data: NodeOutput[] }) {
  if (!data.length) return <p>無資料</p>;
  if (Array.isArray(data[0])) {
    // 二維陣列
    return (
      <div className="overflow-auto">
        <table className="table-auto border-collapse w-full">
          <tbody>
            {data.map((row, ri) => (
              <tr key={ri}>
                {Object.values(row).map((cell, ci) => (
                  <td key={ci} className="border p-1 text-xs">
                    {String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  // 物件陣列
  const columns = Object.keys(data[0]);
  return (
    <div className="overflow-auto">
      <table className="table-auto border-collapse w-full">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col} className="border bg-gray-100 p-1 text-xs">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, ri) => (
            <tr key={ri}>
              {columns.map((col) => (
                <td key={col} className="border p-1 text-xs">
                  {String(row[col as keyof typeof row])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 