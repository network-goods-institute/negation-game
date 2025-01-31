import { useEditMode } from "@/components/graph/EditModeContext";
import { cn } from "@/lib/cn";
import {
  Handle,
  Node,
  NodeProps,
  Position,
  useHandleConnections,
  useReactFlow,
  useUpdateNodeInternals,
} from "@xyflow/react";
import { PlusIcon } from "lucide-react";
import { nanoid } from "nanoid";
import { useEffect } from "react";

export type StatementNodeData = {
  statement: string;
};

export type StatementNode = Node<StatementNodeData, "statement">;

export interface StatementNodeProps extends Omit<NodeProps, "data"> {
  data: StatementNodeData;
}

export const StatementNode = ({
  data: { statement },
  id,
  positionAbsoluteX,
  positionAbsoluteY,
}: StatementNodeProps) => {
  const incomingConnections = useHandleConnections({
    type: "target",
    nodeId: id,
  });

  const { addEdges, addNodes } = useReactFlow();
  const editing = useEditMode();

  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, incomingConnections.length, updateNodeInternals]);

  return (
    <div
      className={cn(
        "relative bg-accent rounded-md border-2 min-h-18 w-96 flex items-center p-4 justify-center  flex-grow"
      )}
    >
      <Handle
        id={`${id}-statement-incoming-handle`}
        type="target"
        data-editing={editing}
        className={cn(
          "-z-10 translate-y-[100%]  size-fit bg-muted text-center border-border  border-2  rounded-b-full pointer-events-auto",
          editing && "pb-1 pt-0.5 px-2 -translate-x-1/2 !cursor-pointer"
        )}
        isConnectableStart={false}
        position={Position.Bottom}
        onClick={
          editing
            ? () => {
                const answerId = nanoid();
                addNodes({
                  id: answerId,
                  type: "addPoint",
                  position: {
                    x: positionAbsoluteX,
                    y: positionAbsoluteY + 100,
                  },
                  data: { parentId: id },
                });
                addEdges({
                  id: nanoid(),
                  source: answerId,
                  target: id,
                });
              }
            : undefined
        }
      >
        {editing && <PlusIcon className="size-4" />}
      </Handle>

      <p className="text-accent-foreground font-bold">{statement}</p>
    </div>
  );
};
