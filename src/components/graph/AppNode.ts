import { AddPointNode } from "@/components/graph/AddPointNode";
import { PointNode } from "@/components/graph/PointNode";
import { StatementNode } from "@/components/graph/StatementNode";

export type AppNode = PointNode | StatementNode | AddPointNode;
