import { NegationEdge } from "@/components/graph/NegationEdge";
import { PointNode } from "@/components/graph/PointNode";
import { Button } from "@/components/ui/button";
import {
  Background,
  BackgroundVariant,
  ColorMode,
  Controls,
  Edge,
  MiniMap,
  Node,
  Panel,
  ReactFlow,
  ReactFlowProps,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import { XIcon } from "lucide-react";
import { nanoid } from "nanoid";
import { useTheme } from "next-themes";
import { useMemo } from "react";

export interface GraphViewProps extends ReactFlowProps {
  rootPointId: number;
  onClose?: () => void;
  closeButtonClassName?: string;
}

export const GraphView = ({ ...props }: GraphViewProps) => (
  <ReactFlowProvider>
    <InnerGraphView {...props} />
  </ReactFlowProvider>
);

export const InnerGraphView = ({
  rootPointId,
  onClose,
  closeButtonClassName,
  ...props
}: GraphViewProps) => {
  const {} = useReactFlow();

  const initialNodes = useMemo(() => {
    return [
      {
        id: nanoid(),
        position: { x: 100, y: 100 },
        type: "point",
        data: { pointId: rootPointId, expandOnInit: true },
      },
    ];
  }, [rootPointId]);
  const [nodes, , onNodesChange] = useNodesState<Node>(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState<Edge>([]);
  const { theme } = useTheme();

  const nodeTypes = useMemo(() => ({ point: PointNode }), []);
  const edgeTypes = useMemo(() => ({ negation: NegationEdge }), []);

  return (
    <ReactFlow
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      nodes={nodes}
      onNodesChange={onNodesChange}
      edges={edges}
      onEdgesChange={onEdgesChange}
      panOnScroll
      zoomOnPinch
      minZoom={0.2}
      colorMode={theme as ColorMode}
      proOptions={{ hideAttribution: true }}
      {...props}
    >
      {!!onClose && (
        <Panel position="top-right" className={closeButtonClassName}>
          <Button size="icon" variant={"ghost"} onClick={onClose}>
            <XIcon />
          </Button>
        </Panel>
      )}
      <Background
        bgColor="hsl(var(--background))"
        color="hsl(var(--muted))"
        variant={BackgroundVariant.Dots}
      />
      <MiniMap zoomable pannable />
      <Controls />
    </ReactFlow>
  );
};
