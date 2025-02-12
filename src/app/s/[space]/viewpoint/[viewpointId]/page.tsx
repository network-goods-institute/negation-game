"use client";

import {
  viewpointGraphAtom,
  viewpointReasoningAtom,
  viewpointStatementAtom,
} from "@/app/s/[space]/viewpoint/viewpointAtoms";
import { canvasEnabledAtom } from "@/atoms/canvasEnabledAtom";
import { hoveredPointIdAtom } from "@/atoms/hoveredPointIdAtom";
import { AppNode } from "@/components/graph/AppNode";
import { GraphView } from "@/components/graph/GraphView";
import {
  OriginalPosterProvider,
  useOriginalPoster,
} from "@/components/graph/OriginalPosterContext";
import { NegateDialog } from "@/components/NegateDialog";
import { PointCard } from "@/components/PointCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AuthenticatedActionButton, Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Dynamic } from "@/components/utils/Dynamic";
import { DEFAULT_SPACE } from "@/constants/config";
import { useBasePath } from "@/hooks/useBasePath";
import { cn } from "@/lib/cn";
import { usePointData } from "@/queries/usePointData";
import { useSpace } from "@/queries/useSpace";
import { useUser } from "@/queries/useUser";
import { usePrivy } from "@privy-io/react-auth";
import { useMediaQuery } from "@uidotdev/usehooks";
import { ReactFlowProvider, useReactFlow } from "@xyflow/react";
import { useAtom, useSetAtom } from "jotai";
import { GroupIcon, NetworkIcon, SplitIcon } from "lucide-react";
import React from 'react';
import { useEffect, useState } from "react";
import dynamic from 'next/dynamic';
import remarkGfm from 'remark-gfm';
import { use } from "react";

import tailwind from "@/../tailwind.config";
import { useGraphPoints } from "@/components/graph/useGraphPoints";
import { Loader } from "@/components/ui/loader";
import { useViewpoint } from "@/queries/useViewpoint";
import { useRouter } from "next/navigation";

// Create dynamic ReactMarkdown component
const DynamicMarkdown = dynamic(() => import('react-markdown'), {
  loading: () => <div className="animate-pulse h-32 bg-muted/30 rounded-md" />,
  ssr: false // Disable server-side rendering
});

function PointCardWrapper({
  point,
  className,
}: {
  point: { pointId: number; parentId?: number | string };
  className?: string;
}) {
  const { data: pointData } = usePointData(point.pointId);
  const { originalPosterId } = useOriginalPoster();

  if (!pointData)
    return (
      <div className={cn("h-32 w-full bg-muted animate-pulse", className)} />
    );

  return (
    <PointCard
      className={className}
      pointId={point.pointId}
      content={pointData.content}
      createdAt={pointData.createdAt}
      cred={pointData.cred}
      favor={pointData.favor}
      amountSupporters={pointData.amountSupporters}
      amountNegations={pointData.amountNegations}
      originalPosterId={originalPosterId}
    />
  );
}

function ViewpointPageContent({ viewpointId }: { viewpointId: string }) {
  const basePath = useBasePath();
  const { push } = useRouter();

  const space = useSpace();
  const { data: user } = useUser();
  const [canvasEnabled, setCanvasEnabled] = useAtom(canvasEnabledAtom);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640); // 640px is tailwind's sm breakpoint
    };

    // Check initially
    checkMobile();

    // Add resize listener
    window.addEventListener('resize', checkMobile);

    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const points = useGraphPoints();

  const { updateNodeData } = useReactFlow();
  const reactFlow = useReactFlow<AppNode>();
  const { data: viewpoint } = useViewpoint(viewpointId);

  const setGraph = useSetAtom(viewpointGraphAtom);
  const setStatement = useSetAtom(viewpointStatementAtom);
  const setReasoning = useSetAtom(viewpointReasoningAtom);

  const [hoveredPointId, setHoveredPointId] = useAtom(hoveredPointIdAtom);

  if (!viewpoint)
    return (
      <div className="flex-grow flex items-center justify-center">
        <Loader className="size-12" />
      </div>
    );

  const { title, description, graph, author } = viewpoint;

  return (
    <main className="relative flex-grow sm:grid sm:grid-cols-[1fr_minmax(200px,600px)_1fr] md:grid-cols-[0_minmax(200px,400px)_1fr] bg-background">
      <div className="w-full sm:col-[2] flex flex-col border-x pb-10 overflow-auto">
        <div className="relative flex-grow bg-background">
          <div className="sticky top-0 z-10 w-full flex items-center justify-between gap-3 px-4 py-3 bg-background/70 backdrop-blur">
            {space?.data && space.data.id !== DEFAULT_SPACE ? (
              <div className="flex items-center gap-1">
                <>
                  <Avatar className="border-4 border-background size-8">
                    {space.data.icon && (
                      <AvatarImage
                        src={space.data.icon}
                        alt={`s/${space.data.id} icon`}
                      />
                    )}
                    <AvatarFallback className="text-xl font-bold text-muted-foreground">
                      {space.data.id.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-md  font-semibold">
                    s/{space.data.id}
                  </span>
                </>
              </div>
            ) : (
              <div />
            )}

            <h1 className="text-sm font-bold">
              <GroupIcon className="inline stroke-1 size-5 align-text-bottom" />{" "}
              Viewpoint
            </h1>

            <div className="flex gap-sm items-center text-muted-foreground">
              <Button
                size={"icon"}
                variant={canvasEnabled ? "default" : "outline"}
                className="rounded-full p-2 size-9 sm:hidden"
                onClick={() => {
                  setCanvasEnabled(true);
                }}
              >
                <NetworkIcon className="" />
              </Button>
              <AuthenticatedActionButton
                variant={"outline"}
                className="rounded-full p-2 size-9 active:scale-95 transition-transform"
                size={"icon"}
                onClick={() => {
                  setReasoning("");
                  setStatement(title + " (fork)");
                  setGraph(graph);
                  push(`${basePath}/viewpoint/new`);
                }}
              >
                <SplitIcon />
              </AuthenticatedActionButton>
            </div>
          </div>
          <Separator />

          <div className="flex flex-col p-2 gap-0">
            <h2 className="font-semibold">{title}</h2>

            <span className="text-muted-foreground text-sm">
              by{" "}
              <span className="font-bold text-sm text-yellow-500">
                {author}
              </span>
            </span>

            <Separator className="my-2" />

            <div className="prose dark:prose-invert max-w-none [&>p]:mb-4 [&>p]:leading-7 [&>h1]:mt-8 [&>h1]:mb-4 [&>h2]:mt-6 [&>h2]:mb-4 [&>h3]:mt-4 [&>h3]:mb-2 [&>ul]:mb-4 [&>ul]:ml-6 [&>ol]:mb-4 [&>ol]:ml-6 [&>li]:mb-2 [&>blockquote]:border-l-4 [&>blockquote]:border-muted [&>blockquote]:pl-4 [&>blockquote]:italic">
              <DynamicMarkdown remarkPlugins={[remarkGfm]}>
                {description}
              </DynamicMarkdown>
            </div>
          </div>
          <div className="relative flex flex-col">
            <span className="text-muted-foreground text-xs uppercase font-semibold tracking-widest w-full p-2 border-y text-center">
              Points
            </span>
            <Dynamic>
              {points.map((point) => (
                <PointCardWrapper
                  key={`${point.pointId}-card`}
                  point={point}
                  className={cn(
                    "border-b",
                    hoveredPointId === point.pointId &&
                    "shadow-[inset_0_0_0_2px_hsl(var(--primary))]"
                  )}
                />
              ))}
            </Dynamic>
          </div>
        </div>
      </div>

      <Dynamic>
        <GraphView
          onInit={(reactFlow) => {
            if (viewpoint?.graph) {
              reactFlow.setNodes(viewpoint.graph.nodes);
              reactFlow.setEdges(viewpoint.graph.edges);
              reactFlow.fitView();
            }
          }}
          defaultNodes={viewpoint?.graph.nodes}
          defaultEdges={viewpoint?.graph.edges}
          onClose={
            isMobile
              ? () => {
                setCanvasEnabled(false);
              }
              : undefined
          }
          onNodesChange={() => {
            const { viewport, ...graph } = reactFlow.toObject();
            setGraph(graph);
          }}
          onEdgesChange={() => {
            const { viewport, ...graph } = reactFlow.toObject();
            setGraph(graph);
          }}
          statement={title}
          className={cn(
            "!fixed md:!sticky inset-0 top-[var(--header-height)] md:inset-[reset]  !h-[calc(100vh-var(--header-height))] md:top-[var(--header-height)] md: !z-10 md:z-auto",
            !canvasEnabled && isMobile && "hidden"
          )}
        />
      </Dynamic>

      <NegateDialog />
    </main>
  );
}

export default function NewViewpointPage({
  params,
}: {
  params: Promise<{ viewpointId: string; space: string }>;
}) {
  const { user: privyUser } = usePrivy();
  const { viewpointId } = use(params);
  return (
    <OriginalPosterProvider originalPosterId={privyUser?.id}>
      <ReactFlowProvider>
        <ViewpointPageContent viewpointId={viewpointId} />
      </ReactFlowProvider>
    </OriginalPosterProvider>
  );
}
