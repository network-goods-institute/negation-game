"use client";

import {
  initialViewpointGraph,
  viewpointGraphAtom,
  viewpointReasoningAtom,
  viewpointStatementAtom,
} from "@/app/s/[space]/viewpoint/viewpointAtoms";
import { useEffect, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Dynamic } from "@/components/utils/Dynamic";
import {
  DEFAULT_SPACE,
  PLACEHOLDER_REASONING,
  PLACEHOLDER_STATEMENT,
} from "@/constants/config";
import { useBasePath } from "@/hooks/useBasePath";
import { cn } from "@/lib/cn";
import { usePointData } from "@/queries/usePointData";
import { useSpace } from "@/queries/useSpace";
import { useUser } from "@/queries/useUser";
import { usePrivy } from "@privy-io/react-auth";
import { useMediaQuery } from "@uidotdev/usehooks";
import { ReactFlowProvider, useReactFlow } from "@xyflow/react";
import { useAtom } from "jotai";
import { NetworkIcon } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import tailwind from "@/../tailwind.config";
import { EditModeProvider } from "@/components/graph/EditModeContext";
import { useGraphPoints } from "@/components/graph/useGraphPoints";
import { usePublishViewpoint } from "@/mutations/usePublishViewpoint";
import { useRouter } from "next/navigation";

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

function ViewpointPageContent() {
  const basePath = useBasePath();
  const { push } = useRouter();

  const space = useSpace();
  const { data: user } = useUser();
  const [canvasEnabled, setCanvasEnabled] = useAtom(canvasEnabledAtom);
  const isMobile = useMediaQuery(`(max-width: ${tailwind.theme.screens.sm})`);

  const { updateNodeData } = useReactFlow();
  const reactFlow = useReactFlow<AppNode>();
  const [graph, setGraph] = useAtom(viewpointGraphAtom);
  const points = useGraphPoints();

  const [statement, setStatement] = useAtom(viewpointStatementAtom);
  const [reasoning, setReasoning] = useAtom(viewpointReasoningAtom);
  useEffect(() => {
    updateNodeData("statement", {
      statement: statement.length > 0 ? statement : PLACEHOLDER_STATEMENT,
    });
  }, [statement, updateNodeData]);

  const { mutateAsync: publishViewpoint, isPending: isPublishing } =
    usePublishViewpoint();
  const canPublish = useMemo(() => {
    return (
      statement.length > 0 && reasoning.length > 0 && graph.edges.length > 0
    );
  }, [graph, statement, reasoning]);

  const [hoveredPointId, setHoveredPointId] = useAtom(hoveredPointIdAtom);

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

            <h1 className="text-sm font-bold">New Viewpoint</h1>

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
                size={"sm"}
                className="rounded-full w-24"
                disabled={!canPublish || isPublishing}
                rightLoading={isPublishing}
                onClick={async () => {
                  try {
                    const id = await publishViewpoint({
                      title: statement,
                      description: reasoning,
                      graph,
                    });

                    push(`${basePath}/viewpoint/${id}`);

                    setTimeout(() => {
                      setReasoning("");
                      setStatement("");
                      setGraph(initialViewpointGraph);
                    }, 0);
                  } catch (error) {
                    console.error("Failed to publish viewpoint:", error);
                  }
                }}
              >
                Publish
              </AuthenticatedActionButton>
            </div>
          </div>
          <Separator />

          <div className="flex flex-col p-2 gap-2">
            <Label className="ml-1">Title</Label>
            <Input
              placeholder={PLACEHOLDER_STATEMENT}
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
            />

            <Label className="ml-1">
              By{" "}
              <span className="font-bold text-sm text-yellow-500">
                {user?.username}
              </span>
            </Label>

            <div>
              <Label className="ml-1">Description</Label>{" "}
              <span className="text-muted-foreground text-xs">
                (Markdown supported)
              </span>
            </div>
            <div className="grid  grid-cols-1 grid-rows-1 ">
              <Textarea
                className="relative col-[1/1] h-full row-[1/1] opacity-0 focus-within:opacity-100"
                value={reasoning}
                onChange={(e) => setReasoning(e.target.value)}
                placeholder={PLACEHOLDER_REASONING}
              />
              <div className="border prose prose-invert max-w-none [&>p]:mb-4 [&>p]:leading-7 [&>h1]:mt-8 [&>h1]:mb-4 [&>h2]:mt-6 [&>h2]:mb-4 [&>h3]:mt-4 [&>h3]:mb-2 [&>ul]:mb-4 [&>ul]:ml-6 [&>ol]:mb-4 [&>ol]:ml-6 [&>li]:mb-2 [&>blockquote]:border-l-4 [&>blockquote]:border-muted [&>blockquote]:pl-4 [&>blockquote]:italic rounded-md px-3 py-2 text-sm col-[1/1] row-[1/1] selection:invisible overflow-x-clip">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {reasoning}
                </ReactMarkdown>
              </div>
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
            reactFlow.setNodes(graph.nodes);
            reactFlow.setEdges(graph.edges);
            reactFlow.fitView();
          }}
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
          statement={statement}
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

export default function NewViewpointPage() {
  const { user: privyUser } = usePrivy();
  return (
    <EditModeProvider editMode={true}>
      <OriginalPosterProvider originalPosterId={privyUser?.id}>
        <ReactFlowProvider>
          <ViewpointPageContent />
        </ReactFlowProvider>
      </OriginalPosterProvider>
    </EditModeProvider>
  );
}
