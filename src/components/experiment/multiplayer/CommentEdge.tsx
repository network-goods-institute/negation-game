import React from "react";
import { EdgeProps } from "@xyflow/react";
import { BaseEdge } from "./common/BaseEdge";

export const CommentEdge: React.FC<EdgeProps> = (props) => {
    return <BaseEdge {...props} edgeType="comment" />;
};

export default CommentEdge;
