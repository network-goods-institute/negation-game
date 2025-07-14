"use client";

import { NodeProps, Node, useReactFlow, useUpdateNodeInternals } from "@xyflow/react";
import { useState, useEffect, ChangeEvent, KeyboardEvent, useRef } from "react";
import { AutosizeTextarea, AutosizeTextAreaRef } from "@/components/ui/autosize-textarea";
import { Button } from "@/components/ui/button";
import { MessageSquareIcon, TrashIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type CommentNodeData = {
    content: string;
    _lastModified?: number;
};

export type CommentNode = Node<CommentNodeData, "comment">;

export interface CommentNodeProps extends Omit<NodeProps, "data"> {
    data: CommentNodeData;
}

export const CommentNode = ({
    id,
    data,
}: CommentNodeProps) => {
    const { content: initialContent } = data;
    const reactFlow = useReactFlow();
    const { updateNodeData, deleteElements } = reactFlow;
    const updateNodeInternals = useUpdateNodeInternals();
    const [isEditing, setIsEditing] = useState(initialContent === "");
    const [editedContent, setEditedContent] = useState(initialContent);
    const [isHovered, setIsHovered] = useState(false);
    const textareaRef = useRef<AutosizeTextAreaRef>(null);

    useEffect(() => {
        setEditedContent(initialContent);
        if (initialContent === "") {
            setIsEditing(true);
        }
    }, [initialContent, id]);

    const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
        setEditedContent(e.target.value);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSave();
        }
        if (e.key === 'Escape') {
            handleCancel();
        }
    };

    const handleSave = () => {
        if (editedContent.trim() === "") {
            handleDelete();
            return;
        }

        if (editedContent !== initialContent) {
            const newData = { content: editedContent, _lastModified: Date.now() };
            updateNodeData(id, newData);
            if (typeof (reactFlow as any).markAsModified === 'function') {
                (reactFlow as any).markAsModified();
            }
            updateNodeInternals(id);
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditedContent(initialContent);
        if (initialContent === "") {
            handleDelete();
        } else {
            setIsEditing(false);
        }
    };

    const startEditing = () => {
        setEditedContent(initialContent);
        setIsEditing(true);
    };

    const handleDelete = () => {
        deleteElements({ nodes: [{ id }] });
        if (typeof (reactFlow as any).markAsModified === 'function') {
            (reactFlow as any).markAsModified();
        }
    };

    const handleClick = () => {
        if (!isEditing) {
            startEditing();
        }
    };

    const handleBlur = () => {
        handleSave();
    };

    return (
        <div
            className={cn(
                "bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-700 shadow-md rounded-lg p-4 min-w-[250px] min-h-[100px] max-w-sm relative transition-all duration-200",
                isHovered && "shadow-lg border-blue-300 dark:border-blue-600",
                isEditing && "ring-2 ring-blue-400 dark:ring-blue-500 ring-opacity-50"
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleClick}
        >
            {/* Comment Icon Header */}
            <div className="flex items-center gap-2 mb-2">
                <MessageSquareIcon className="size-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Comment</span>
                {(isHovered || isEditing) && (
                    <div className="ml-auto flex gap-1">
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900/20"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDelete();
                            }}
                            title="Delete comment"
                        >
                            <TrashIcon className="size-3 text-red-600 dark:text-red-400" />
                        </Button>
                        {isEditing && (
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCancel();
                                }}
                                title="Cancel editing"
                            >
                                <XIcon className="size-3 text-gray-600 dark:text-gray-400" />
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Content Area */}
            {isEditing ? (
                <AutosizeTextarea
                    ref={textareaRef}
                    className="bg-transparent resize-none outline-none w-full text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 text-sm leading-relaxed border-none focus:ring-0 p-0"
                    value={editedContent}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    placeholder="Click here to add a comment..."
                    autoFocus
                />
            ) : (
                <div className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap text-sm leading-relaxed cursor-text">
                    {initialContent || (
                        <span className="text-gray-500 dark:text-gray-400 italic">
                            Click here to add a comment...
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};