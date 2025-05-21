"use client";

import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { ChatInputForm } from './ChatInputForm';
import { ChatMessageArea } from './ChatMessageArea';
import { useChatState } from '@/hooks/useChatState';
import { useChatListManagement } from '@/hooks/useChatListManagement';
import { useDiscourseIntegration } from '@/hooks/useDiscourseIntegration';
import {
    ReactFlowProvider,
    useNodesState,
    useEdgesState,
    OnNodesChange,
    OnEdgesChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { cn } from '@/lib/cn';

import { ViewpointGraph } from '@/atoms/viewpointAtoms';
import { toast } from 'sonner';
import { DuplicatePointSelectionDialog } from './DuplicatePointSelectionDialog';
import { EditMessageDialog } from './EditMessageDialog';
import TopicSelector from "@/components/TopicSelector";
import { RationaleVisualFeed } from './RationaleVisualFeed';
import { PreviewAppNode, PreviewAppEdge } from '@/types/rationaleGraph';
import { useRationaleGraphLayout } from '@/hooks/chatbot/useRationaleGraphLayout';
import { useRationaleCreation } from '@/hooks/chatbot/useRationaleCreation';
import type { PointInSpace } from "@/actions/fetchAllSpacePoints";

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
    topic,
    onTopicChange,
    allPointsInSpace,
}) => {
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
    const [editingMessageContent, setEditingMessageContent] = useState<string>("");
    const [persistedGraph, setPersistedGraph] = useState<ViewpointGraph>(graphData);
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
    const { pendingPushIds, currentChatId } = chatList;
    const isSavingGraph = !!currentChatId && pendingPushIds.has(currentChatId);

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

    const discardGraph = useCallback(() => {
        setNodes(persistedGraph.nodes as unknown as PreviewAppNode[]);
        setEdges(persistedGraph.edges as unknown as PreviewAppEdge[]);
        setGraphModified(false);
        onGraphChange(persistedGraph, true);
        chatState.currentGraphRef.current = persistedGraph;
    }, [persistedGraph, setNodes, setEdges, onGraphChange, chatState]);

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        if (chatState.generatingChats.has(chatList.currentChatId || '')) return;

        if (graphModified) {
            toast.error("Graph has unsaved changes. Save manually, or use Ctrl+Enter / Ctrl+Click on send to auto-save and send.", {
                action: {
                    label: "Save Changes",
                    onClick: saveGraph,
                },
                duration: 5000,
            });
            return;
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
                    if (e.ctrlKey || e.metaKey) {
                        saveGraph();
                        chatState.handleSubmit();
                    } else {
                        toast.error("Graph has unsaved changes. Save manually, or use Ctrl+Enter / Ctrl+Click on send to auto-save and send.", {
                            action: {
                                label: "Save Changes",
                                onClick: saveGraph,
                            },
                            duration: 5000,
                        });
                    }
                    return;
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
        const updatedNodes = (graphData.nodes as any[]).map(node => ({
            ...node,
            data: {
                ...node.data,
                allPointsInSpaceFromProps: allPointsInSpace,
            },
        }));
        setNodes(updatedNodes as unknown as PreviewAppNode[]);
        setEdges(graphData.edges as unknown as PreviewAppEdge[]);
        setPersistedGraph(graphData);
        setGraphModified(false);
    }, [graphData, allPointsInSpace, setNodes, setEdges]);

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
                    graphModified={graphModified}
                    saveGraph={saveGraph}
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