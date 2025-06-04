import { AddPointNode } from "@/components/graph/nodes/AddPointNode";
import { PointNode } from "@/components/graph/nodes/PointNode";
import { StatementNode } from "@/components/graph/nodes/StatementNode";
import { CommentNode } from "@/components/graph/nodes/CommentNode";

export type AppNode = PointNode | StatementNode | AddPointNode | CommentNode;
