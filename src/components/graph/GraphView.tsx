"use client";

import { AddPointNode } from "@/components/graph/AddPointNode";
import { AppNode } from "@/components/graph/AppNode";
import { NegationEdge } from "@/components/graph/NegationEdge";
import { PointNode } from "@/components/graph/PointNode";
import { StatementNode } from "@/components/graph/StatementNode";
import { Button } from "@/components/ui/button";
import {
  Background,
  BackgroundVariant,
  ColorMode,
  Controls,
  Edge,
  EdgeChange,
  MiniMap,
  NodeChange,
  Panel,
  ReactFlow,
  ReactFlowProps,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { XIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useMemo } from "react";

export interface GraphViewProps extends ReactFlowProps<AppNode> {
  rootPointId?: number;
  statement?: string;
  onClose?: () => void;
  closeButtonClassName?: string;
  onDeleteNode?: (nodeId: string) => void;
}

export const GraphView = ({
  rootPointId,
  statement: statement,
  onClose,
  closeButtonClassName,
  onNodesChange: onNodesChangeProp,
  onEdgesChange: onEdgesChangeProp,
  onDeleteNode,
  ...props
}: GraphViewProps) => {
  const [nodes, , onNodesChangeDefault] = useNodesState<AppNode>([]);
  const [edges, , onEdgesChangeDefault] = useEdgesState<Edge>([]);
  const { theme } = useTheme();

  const onNodesChange = useCallback(
    (nodes: NodeChange<AppNode>[]) => {
      onNodesChangeDefault(nodes);
      onNodesChangeProp?.(nodes);
    },
    [onNodesChangeDefault, onNodesChangeProp]
  );

  const onEdgesChange = useCallback(
    (edges: EdgeChange[]) => {
      onEdgesChangeDefault(edges);
      onEdgesChangeProp?.(edges);
    },
    [onEdgesChangeDefault, onEdgesChangeProp]
  );

  const nodeTypes = useMemo(
    () => ({
      point: (props: any) => (
        <PointNode {...props} onDelete={onDeleteNode} />
      ),
      statement: StatementNode,
      addPoint: AddPointNode,
    }),
    [onDeleteNode]
  );
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
      <MiniMap
        zoomable
        pannable
        className="[&>svg]:w-[120px] [&>svg]:h-[90px] sm:[&>svg]:w-[200px] sm:[&>svg]:h-[150px]"
      />
      <Controls />
    </ReactFlow>
  );
};
