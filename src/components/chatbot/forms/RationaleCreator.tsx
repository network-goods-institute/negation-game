"use client";

import React, { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import { ChatInputForm } from './ChatInputForm';
import { ChatMessageArea } from '../header/ChatMessageArea';
import { useChatState } from '@/hooks/chat/useChatState';
import { useChatListManagement } from '@/hooks/chat/useChatListManagement';
import { useDiscourseIntegration } from '@/hooks/data/useDiscourseIntegration';
import {
    ReactFlowProvider,
    useNodesState,
    useEdgesState,
    OnNodesChange,
    OnEdgesChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { cn } from '@/lib/utils/cn';

import { ViewpointGraph } from '@/atoms/viewpointAtoms';
import { toast } from 'sonner';
import { DuplicatePointSelectionDialog } from '../dialogs/DuplicatePointSelectionDialog';
import { EditMessageDialog } from '../dialogs/EditMessageDialog';
import TopicSelector from '@/components/inputs/TopicSelector';
import { RationaleVisualFeed } from '../visual/RationaleVisualFeed';
import { PreviewAppNode, PreviewAppEdge } from '@/types/rationaleGraph';
import { useRationaleGraphLayout } from '@/hooks/chatbot/useRationaleGraphLayout';
import { useRationaleCreation } from '@/hooks/chatbot/useRationaleCreation';
import type { PointInSpace } from "@/actions/points/fetchAllSpacePoints";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, Save } from 'lucide-react';

export interface RationaleCreatorProps {
    onClose: () => void;
    chatState: ReturnType<typeof useChatState>;
    chatList: ReturnType<typeof useChatListManagement>;
    discourse: ReturnType<typeof useDiscourseIntegration>;
    isAuthenticated: boolean;
    isInitializing: boolean;
    currentSpace: string | null;
    isMobile: boolean;
    showGraph: boolean;
    graphData: ViewpointGraph;
    onGraphChange: (newGraph: ViewpointGraph, immediateSave: boolean) => void;
    canvasEnabled: boolean;
    description: string;
    onDescriptionChange: (desc: string) => void;
    linkUrl?: string;
    onLinkUrlChange?: (url: string) => void;
    topic: string;
    onTopicChange: (topic: string) => void;
    allPointsInSpace?: PointInSpace[];
}

export const RationaleCreator: React.FC<RationaleCreatorProps> = (props) => {
    return (
        <ReactFlowProvider>
            <RationaleCreatorInner {...props} />
        </ReactFlowProvider>
    );
};

const RationaleCreatorInner: React.FC<RationaleCreatorProps> = ({
    chatState,
    chatList,
    discourse,
    isAuthenticated,
    isInitializing,
    currentSpace,
    isMobile,
    showGraph,
    graphData,
    onGraphChange,
    canvasEnabled,
    description,
    linkUrl,
    onLinkUrlChange,
    topic,
    onTopicChange,
    allPointsInSpace,
}) => {
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
    const [editingMessageContent, setEditingMessageContent] = useState<string>("");
    const [persistedGraph, setPersistedGraph] = useState<ViewpointGraph>(graphData);
    const prevPersistedGraphRef = useRef<ViewpointGraph>(graphData);
    const initialNodes = useMemo(() => {
        return (graphData.nodes as any[]).map(node => ({
            ...node,
            data: {
                ...node.data,
                allPointsInSpaceFromProps: allPointsInSpace,
            },
        }));
    }, [graphData.nodes, allPointsInSpace]);

    const initialEdges = useMemo(() => graphData.edges as unknown as PreviewAppEdge[], [graphData.edges]);

    const [nodes, setNodes, onNodesChangeReactFlow] = useNodesState<PreviewAppNode>(initialNodes as unknown as PreviewAppNode[]);
    const [edges, setEdges, onEdgesChangeReactFlow] = useEdgesState<PreviewAppEdge>(initialEdges);
    const [graphModified, setGraphModified] = useState(false);
    const [aiPrevGraph, setAIPrevGraph] = useState<ViewpointGraph | null>(null);
    const { pendingPushIds, currentChatId } = chatList;
    const isSavingGraph = !!currentChatId && pendingPushIds.has(currentChatId);
    const skipAIPrevGraphRef = useRef(false);

    useRationaleGraphLayout({
        graphData,
        nodes,
        edges,
        setNodes,
        setEdges,
    });

    const memoizedPersistedGraphNodes = useMemo(() => persistedGraph.nodes, [persistedGraph.nodes]);
    const memoizedPersistedGraphEdges = useMemo(() => persistedGraph.edges, [persistedGraph.edges]);

    const {
        isCreating: isCreatingRationale,
        isDuplicateDialogOpen,
        conflictingPoints,
        handleCreateRationale,
        handleResolveDuplicates,
        closeDuplicateDialog,
    } = useRationaleCreation({
        isAuthenticated,
        currentSpace,
        description,
        topic,
        persistedGraphNodes: memoizedPersistedGraphNodes,
        persistedGraphEdges: memoizedPersistedGraphEdges,
    });

    const handleCreateClick = useCallback((...args: any[]) => {
        handleCreateRationale();
    }, [handleCreateRationale]);

    const handleNodesChange: OnNodesChange<PreviewAppNode> = useCallback((changes) => {
        onNodesChangeReactFlow(changes);
        setGraphModified(true);
    }, [onNodesChangeReactFlow]);

    const handleEdgesChange: OnEdgesChange<PreviewAppEdge> = useCallback((changes) => {
        onEdgesChangeReactFlow(changes);
        setGraphModified(true);
    }, [onEdgesChangeReactFlow]);

    const saveGraph = useCallback(() => {
        // Mark this update as a manual save so we don't treat it as an AI suggestion
        skipAIPrevGraphRef.current = true;
        const currentGraph: ViewpointGraph = {
            nodes: nodes as any,
            edges: edges as any,
            description: description,
            linkUrl: linkUrl,
            topic: topic,
        };
        setPersistedGraph(currentGraph);
        onGraphChange(currentGraph, true);
        chatState.currentGraphRef.current = currentGraph;
        setGraphModified(false);
    }, [nodes, edges, onGraphChange, chatState, description, linkUrl, topic]);

    const [linkSaved, setLinkSaved] = useState(false);
    const handleSaveLink = useCallback(() => {
        saveGraph();
        setLinkSaved(true);
        toast.success("Link saved!");
        setTimeout(() => setLinkSaved(false), 2000);
    }, [saveGraph]);

    const discardGraph = useCallback(() => {
        setNodes(persistedGraph.nodes as unknown as PreviewAppNode[]);
        setEdges(persistedGraph.edges as unknown as PreviewAppEdge[]);
        setGraphModified(false);
        // Do not sync on discard; only UI reset
        chatState.currentGraphRef.current = persistedGraph;
    }, [persistedGraph, setNodes, setEdges, chatState]);

    const revertAISuggestion = useCallback(() => {
        if (aiPrevGraph) {
            setNodes(aiPrevGraph.nodes as unknown as PreviewAppNode[]);
            setEdges(aiPrevGraph.edges as unknown as PreviewAppEdge[]);
            setPersistedGraph(aiPrevGraph);
            // Do not sync on revert; only UI reset
            chatState.currentGraphRef.current = aiPrevGraph;
            setAIPrevGraph(null);
        }
    }, [aiPrevGraph, setNodes, setEdges, chatState]);

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        if (chatState.generatingChats.has(chatList.currentChatId || '')) return;

        if (graphModified) {
            saveGraph();
        }

        if (e.type === 'submit' || (e.nativeEvent && (e.nativeEvent as SubmitEvent).type === 'submit')) {
            chatState.handleSubmit(e as React.FormEvent<HTMLFormElement>);
        } else {
            chatState.handleSubmit();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (chatState.message.trim() && !chatState.generatingChats.has(chatList.currentChatId || '')) {
                if (graphModified) {
                    saveGraph();
                }
                chatState.handleSubmit();
            }
        }
    };

    const handleTriggerEdit = (index: number, content: string) => {
        setEditingMessageIndex(index);
        setEditingMessageContent(content);
        setShowEditDialog(true);
    };

    useEffect(() => {
        const initDesc = graphData.description || '';
        const initLink = (graphData as any).linkUrl || '';
        if ((description !== initDesc || linkUrl !== initLink) && !graphModified) {
            setGraphModified(true);
        }
    }, [description, linkUrl, graphData, graphModified]);

    useEffect(() => {
        const initTopic = graphData.topic || '';
        if (topic !== initTopic && !graphModified) {
            setGraphModified(true);
        }
    }, [topic, graphData.topic, graphModified]);

    useEffect(() => {
        const prevGraph = prevPersistedGraphRef.current;
        setNodes((prevNodes) => {
            const updated = (graphData.nodes as any[]).map((node) => {
                const existing = (prevNodes as any[]).find((n) => n.id === node.id);
                return {
                    ...node,
                    position: existing?.position ?? node.position,
                    data: {
                        ...node.data,
                        allPointsInSpaceFromProps: allPointsInSpace,
                    },
                };
            });
            return updated as PreviewAppNode[];
        });
        setEdges(graphData.edges as unknown as PreviewAppEdge[]);
        // Only mark AI suggestion when not a manual save
        if (skipAIPrevGraphRef.current) {
            skipAIPrevGraphRef.current = false;
        } else if (!graphModified && prevGraph && prevGraph !== graphData) {
            setAIPrevGraph(prevGraph);
        }
        prevPersistedGraphRef.current = graphData;
        setPersistedGraph(graphData);
        setGraphModified(false);
        // We intentionally omit setters and graphModified from deps to avoid unnecessary effect runs
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [graphData, allPointsInSpace]);

    // Reset AI suggestion history when switching chats
    useEffect(() => {
        setAIPrevGraph(null);
    }, [chatList.currentChatId]);

    return (
        <div className="flex flex-1 overflow-hidden h-full">
            {/* Chat Area Container */}
            <div
                className={cn(
                    "flex flex-col overflow-hidden transition-all duration-300 ease-in-out h-full",
                    isMobile && canvasEnabled && "w-0 opacity-0 pointer-events-none",
                    isMobile && !canvasEnabled && "w-full",
                    !isMobile && !showGraph && "w-full",
                    !isMobile && showGraph && "w-1/3 border-r"
                )}
            >
                <div className="px-4 py-2">
                    <TopicSelector
                        currentSpace={currentSpace || ""}
                        value={topic}
                        onChange={(newTopic: string) => {
                            onTopicChange(newTopic);
                            setGraphModified(true);
                        }}
                        wrapperClassName=""
                        triggerClassName="w-full"
                        showLabel={false}
                    />
                </div>
                <div className="px-4 py-2">
                    <div className="relative w-full">
                        <Input
                            type="url"
                            placeholder="Paste sDiscourse Link"
                            value={linkUrl || ""}
                            onChange={(e) => onLinkUrlChange?.(e.target.value)}
                            className="pr-12 h-14 bg-yellow-100 dark:bg-yellow-900 border-yellow-400 border-2 focus:ring-2 focus:ring-yellow-500"
                        />
                        <Button
                            size="icon"
                            variant="ghost"
                            className="absolute right-2 top-1/2 -translate-y-1/2"
                            onClick={handleSaveLink}
                            disabled={!graphModified}
                            title={linkSaved ? "Saved" : "Save link"}
                        >
                            {linkSaved
                                ? <Check className="h-5 w-5 text-green-500" />
                                : <Save className="h-5 w-5" />
                            }
                        </Button>
                    </div>
                </div>
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
                    hideSettings={true}
                />
            </div>

            {/* Graph Area Container */}
            <div
                className={cn(
                    "flex-1 overflow-hidden h-full transition-all duration-300 ease-in-out",
                    isMobile && canvasEnabled && "w-full",
                    isMobile && !canvasEnabled && "w-0 opacity-0 pointer-events-none",
                    !isMobile && showGraph && "opacity-100",
                    !isMobile && !showGraph && "opacity-0 w-0 pointer-events-none"
                )}
            >
                {((isMobile && canvasEnabled) || (!isMobile && showGraph)) && (
                    <RationaleVisualFeed
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={handleNodesChange}
                        onEdgesChange={handleEdgesChange}
                        onSaveGraph={saveGraph}
                        onDiscard={discardGraph}
                        onRevertAISuggestion={revertAISuggestion}
                        showRevertAISuggestion={!!aiPrevGraph}
                        graphModified={graphModified}
                        isSaving={isSavingGraph}
                        isCreatingRationale={isCreatingRationale}
                        onCreateRationaleClick={handleCreateClick}
                    />
                )}
            </div>
            <DuplicatePointSelectionDialog
                isOpen={isDuplicateDialogOpen}
                onOpenChange={closeDuplicateDialog}
                conflicts={conflictingPoints}
                onResolve={handleResolveDuplicates}
            />
            {/* Edit Message Dialog */}
            <EditMessageDialog
                open={showEditDialog}
                onOpenChange={(open) => {
                    if (!open) {
                        setShowEditDialog(false);
                        setEditingMessageIndex(null);
                        setEditingMessageContent("");
                    }
                }}
                initialContent={editingMessageContent}
                onSave={(newContent) => {
                    if (editingMessageIndex !== null) {
                        chatState.handleSaveEdit(editingMessageIndex, newContent);
                    }
                }}
            />
        </div>
    );
}; 