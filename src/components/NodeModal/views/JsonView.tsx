import { NodeOutput } from "@/types/workflow";

export default function JsonView({ data }: { data: NodeOutput[] }) {
  return (
    <pre className="text-xs bg-white p-2 rounded overflow-auto">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
} 