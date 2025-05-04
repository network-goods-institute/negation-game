import { cn } from "@/lib/cn";
import {
  Handle,
  Node,
  NodeProps,
  Position,
  useReactFlow,
} from "@xyflow/react";
import { ArrowDownIcon } from "lucide-react";
import { nanoid } from 'nanoid';

/**
 * Simplified StatementNode for RationaleCreator Preview
 */

export type PreviewStatementNodeData = {
  statement: string;
};

export type PreviewStatementNode = Node<PreviewStatementNodeData, "statement">;

export interface PreviewStatementNodeProps extends Omit<NodeProps, "data"> {
  data: PreviewStatementNodeData;
  positionAbsoluteX: number;
  positionAbsoluteY: number;
}

export const PreviewStatementNode = ({
  data: { statement },
  id,
  positionAbsoluteX,
  positionAbsoluteY,
}: PreviewStatementNodeProps) => {
  const { addNodes, addEdges } = useReactFlow();

  const handleAddClick = () => {
    const newNodeId = `previewaddpoint-${nanoid()}`;
    addNodes({
      id: newNodeId,
      type: "addPoint",
      position: {
        x: positionAbsoluteX,
        y: positionAbsoluteY + 100,
      },
      data: {
        parentId: id,
      },
    });
    addEdges({
      id: `edge-${nanoid()}`,
      source: id,
      sourceHandle: `${id}-add-handle`,
      target: newNodeId,
      targetHandle: `${newNodeId}-target`,
      type: 'negation'
    });
  };

  return (
    <div
      className={cn(
        "relative bg-accent rounded-md border-2 min-h-18 w-96 flex items-center p-4 justify-center flex-grow"
      )}
    >
      {/* Incoming Connection Handle (Hidden Dot) */}
      <Handle
        type="target"
        position={Position.Top}
        id={`${id}-target`}
        className="opacity-0 pointer-events-none"
        isConnectable={true}
      />

      <p className="text-accent-foreground font-bold">{statement}</p>

      <Handle
        type="source"
        position={Position.Bottom}
        id={`${id}-add-handle`}
        className="pb-1 pt-0.5 px-2 translate-y-[100%] -translate-x-1/2 size-fit bg-muted text-center border-border border-2 rounded-b-full pointer-events-auto !cursor-pointer"
        isConnectable={false}
        onClick={handleAddClick}
      >
        <ArrowDownIcon className="size-4" />
      </Handle>
    </div>
  );
};
