import FlowCanvas from "@/components/FlowCanvas";
import Sidebar from "@/components/Sidebar";
import NodeModal from "@/components/NodeModal";
import WorkflowJsonControls from "@/components/WorkflowJsonControls";
import WorkflowControls from "@/components/WorkflowControls";

export default function Home() {
  return (
    <div className="flex flex-row min-h-screen">
      <Sidebar />
      <main className="flex-grow relative">
        <FlowCanvas />
        <NodeModal />
        <WorkflowJsonControls />
        <WorkflowControls />
      </main>
    </div>
  );
}
