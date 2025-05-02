import React, { useEffect, useMemo, useCallback } from 'react';
import { ChatInputForm } from './ChatInputForm';
import { ChatMessageArea } from './ChatMessageArea';
import { useChatState } from '@/hooks/useChatState';
import { useChatListManagement } from '@/hooks/useChatListManagement';
import { useDiscourseIntegration } from '@/hooks/useDiscourseIntegration';
import { InitialOptionObject } from './AIAssistant';
import { NegationEdge } from '../graph/NegationEdge';
import {
    ReactFlow,
    useNodesState,
    useEdgesState,
    MiniMap,
    Controls,
    Background,
    ReactFlowProvider,
    Node,
    Edge,
    BackgroundVariant,
    Handle,
    Position,
    Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useTheme } from "next-themes";
import { ViewpointGraph } from "@/atoms/viewpointAtoms";
import { debounce } from 'lodash';
import { cn } from '@/lib/cn';

const TopicNode = ({ data }: { data: { label: string } }) => (
    <div className="relative bg-background border-2 rounded-lg p-4 min-h-28 w-64 border-muted-foreground/60 dark:border-muted-foreground/40">
        <Handle
            type="target"
            position={Position.Top}
            id="topic-top-target"
            className="!w-2 !h-2 !bg-primary opacity-50"
        />
        <div className="text-sm font-medium">{data.label}</div>
        <Handle
            type="source"
            position={Position.Bottom}
            id="topic-bottom-source"
            className="!w-2 !h-2 !bg-primary opacity-50"
        />
    </div>
);

const PointLikeNode = ({ data }: { data: { label: string; type: 'ai' | 'user' } }) => (
    <div className={`relative bg-background border-2 min-h-28 w-64 ${data.type === 'ai' ? 'rounded-none' : 'rounded-lg border-l-4'
        } border-muted-foreground/60 dark:border-muted-foreground/40`}>
        <Handle
            type="target"
            position={Position.Top}
            id="point-top-target"
            className="!w-2 !h-2 !bg-primary opacity-50"
        />
        <div className="p-4">
            <div className="text-sm">{data.label}</div>
        </div>
        <Handle
            type="source"
            position={Position.Bottom}
            id="point-bottom-source"
            className="!w-2 !h-2 !bg-primary opacity-50"
        />
    </div>
);

const nodeTypes = {
    topic: TopicNode,
    point: PointLikeNode,
};

const edgeTypes = {
    negation: NegationEdge,
};

const initialNodes: Node[] = [
    {
        id: 'topic',
        type: 'topic',
        data: { label: 'Rationale Topic Placeholder' },
        position: { x: 250, y: 0 },
    },
    {
        id: 'ai-suggestion',
        type: 'point',
        data: { label: 'AI Suggestion Placeholder', type: 'ai' },
        position: { x: 100, y: 200 },
    },
    {
        id: 'user-point',
        type: 'point',
        data: { label: 'User Point 1 from Chat', type: 'user' },
        position: { x: 400, y: 200 },
    },
];

const initialEdges: Edge[] = [
    {
        id: 'e-topic-ai',
        source: 'topic',
        target: 'ai-suggestion',
        type: 'negation',
        sourceHandle: 'topic-bottom-source',
        targetHandle: 'point-top-target',
    },
    {
        id: 'e-topic-user',
        source: 'topic',
        target: 'user-point',
        type: 'negation',
        sourceHandle: 'topic-bottom-source',
        targetHandle: 'point-top-target',
    },
];

const RationaleVisualFeed = () => {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const { theme } = useTheme();

    return (
        <div className="h-full w-full">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                panOnDrag={true}
                zoomOnScroll={true}
                zoomOnPinch={true}
                zoomOnDoubleClick={true}
                nodesDraggable={true}
                nodesConnectable={false}
                elementsSelectable={true}
                proOptions={{ hideAttribution: true }}
                minZoom={0.2}
                colorMode={theme as any}
            >
                <Background
                    bgColor="hsl(var(--background))"
                    color="hsl(var(--muted))"
                    variant={BackgroundVariant.Dots}
                />

                <Panel position="bottom-left" className="m-2">
                    <div className="relative bottom-[120px] mb-4">
                        <Controls />
                    </div>
                </Panel>

                <Panel position="bottom-right" className="mr-4 mb-4">
                    <div className="relative bottom-[120px]">
                        <MiniMap
                            nodeStrokeWidth={3}
                            zoomable
                            pannable
                            className="[&>svg]:w-[120px] [&>svg]:h-[90px] sm:[&>svg]:w-[200px] sm:[&>svg]:h-[150px]"
                        />
                    </div>
                </Panel>
            </ReactFlow>
        </div>
    );
};

interface RationaleCreatorProps {
    onClose: () => void;
    chatState: ReturnType<typeof useChatState>;
    chatList: ReturnType<typeof useChatListManagement>;
    discourse: ReturnType<typeof useDiscourseIntegration>;
    isAuthenticated: boolean;
    isInitializing: boolean;
    currentSpace: string | null;
    isMobile: boolean;
    showGraph: boolean;
    initialGraph: ViewpointGraph;
    onGraphChange: (newGraph: ViewpointGraph) => void;
    canvasEnabled: boolean;
}

export const RationaleCreator: React.FC<RationaleCreatorProps> = ({
    onClose,
    chatState,
    chatList,
    discourse,
    isAuthenticated,
    isInitializing,
    currentSpace,
    isMobile,
    showGraph,
    initialGraph,
    onGraphChange,
    canvasEnabled,
}) => {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialGraph.nodes || []);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialGraph.edges || []);

    const handleGraphChange = useCallback(() => {
        const currentGraph: ViewpointGraph = { nodes, edges };
        onGraphChange(currentGraph);
    }, [nodes, edges, onGraphChange]);

    const debouncedHandleGraphChange = useMemo(
        () => debounce(handleGraphChange, 500),
        [handleGraphChange]
    );

    useEffect(() => {
        debouncedHandleGraphChange();
        return () => debouncedHandleGraphChange.cancel();
    }, [nodes, edges, debouncedHandleGraphChange]);

    useEffect(() => {
        setNodes(initialGraph.nodes || []);
        setEdges(initialGraph.edges || []);
    }, [initialGraph, setNodes, setEdges]);

    // chatMessages and inputMessage are now managed by chatState hook
    // const [chatMessages, setChatMessages] = useState<any[]>([]);
    // const [inputMessage, setInputMessage] = useState('');
    // isGenerating is also managed by chatState
    // const [isGenerating, setIsGenerating] = useState(false);

    // TODO: Add logic specific to Rationale Creation (e.g., updating Visual Feed)

    // Example effect to potentially reset chat state or send initial message on mount
    useEffect(() => {
        // Placeholder: Maybe send an initial greeting or prompt?
        // chatState.startChatWithOption({ id: 'create', title: '...', prompt: '...' });
        console.log("RationaleCreator mounted");
        // Ensure we are using a dedicated chat session for creation if needed
        // Or clear the current chat if appropriate
        // chatState.setChatMessages([]); // Example reset
    }, []);

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (chatState.generatingChats.has(chatList.currentChatId || '')) return;
        chatState.handleSubmit(e);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (chatState.message.trim() && !chatState.generatingChats.has(chatList.currentChatId || '')) {
                chatState.handleSubmit();
            }
        }
    };

    // These are needed by ChatMessageArea but might not be directly used in this specific flow
    const handleStartChatOption = (option: InitialOptionObject) => {
        // Decide if this action should be possible/different within RationaleCreator
        console.log("Start chat option clicked in RationaleCreator:", option);
        // Maybe delegate back to AIAssistant or handle differently?
    };
    const handleTriggerEdit = (index: number, content: string) => {
        // Implement if editing needed within this flow
    };

    return (
        <div className="flex flex-1 overflow-hidden h-full">
            {/* Chat Area Container */}
            <div
                className={cn(
                    "flex flex-col overflow-hidden transition-all duration-300 ease-in-out h-full",
                    // Mobile Logic
                    isMobile && !canvasEnabled && "w-full", // Show full width chat when canvas off on mobile
                    isMobile && canvasEnabled && "w-0 opacity-0 pointer-events-none", // Hide chat when canvas on on mobile
                    // Desktop Logic
                    !isMobile && !showGraph && "w-full", // Show full width chat when graph pane off on desktop
                    !isMobile && showGraph && "w-1/3 border-r" // Show split chat when graph pane on on desktop
                )}
            >
                <ChatMessageArea
                    isInitializing={isInitializing}
                    isFetchingRationales={false}
                    chatState={chatState}
                    isGeneratingCurrent={chatState.generatingChats.has(chatList.currentChatId || '')}
                    isFetchingCurrentContext={chatState.fetchingContextChats.has(chatList.currentChatId || '')}
                    currentStreamingContent={chatState.streamingContents.get(chatList.currentChatId || '') || ''}
                    chatList={chatList}
                    discourse={discourse}
                    isAuthenticated={isAuthenticated}
                    userRationales={[]}
                    availableRationales={[]}
                    currentSpace={currentSpace}
                    isMobile={isMobile}
                    initialOptions={[]}
                    onStartChatOption={() => { }}
                    onTriggerEdit={handleTriggerEdit}
                />
                <ChatInputForm
                    message={chatState.message}
                    setMessage={chatState.setMessage}
                    isGenerating={chatState.generatingChats.has(chatList.currentChatId || '')}
                    isAuthenticated={isAuthenticated}
                    isInitializing={isInitializing}
                    isMobile={isMobile}
                    currentSpace={currentSpace}
                    onSubmit={handleFormSubmit}
                    onKeyDown={handleKeyDown}
                    onShowSettings={() => { /* Maybe disable settings here? */ }}
                />
            </div>

            {/* Graph Area Container */}
            <div
                className={cn(
                    "flex-1 overflow-hidden h-full transition-all duration-300 ease-in-out",
                    // Mobile Logic
                    isMobile && canvasEnabled && "w-full", // Show full width graph when canvas on on mobile
                    isMobile && !canvasEnabled && "w-0 opacity-0 pointer-events-none", // Hide graph when canvas off on mobile
                    // Desktop Logic
                    !isMobile && showGraph && "opacity-100", // Show graph when graph pane on on desktop
                    !isMobile && !showGraph && "opacity-0 w-0 pointer-events-none" // Hide graph when graph pane off on desktop
                )}
            >
                {((isMobile && canvasEnabled) || (!isMobile && showGraph)) && (
                    <ReactFlowProvider>
                        <RationaleVisualFeed />
                    </ReactFlowProvider>
                )}
            </div>
        </div>
    );
}; 