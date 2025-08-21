"use client";

import React from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { GraphView } from "@/components/graph/base/GraphView";

export default function GraphSection({ pointId }: { pointId: number }) {
    return (
        <ReactFlowProvider>
            <GraphView
                rootPointId={pointId}
                className="w-full h-full overflow-hidden"
                hideComments
                hideSavePanel
                hideShareButton
                canvasEnabled
            />
        </ReactFlowProvider>
    );
}


