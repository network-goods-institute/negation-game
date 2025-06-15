"use client";

import { NodeProps, Node, useReactFlow, useUpdateNodeInternals } from "@xyflow/react";
import { useState, useEffect, ChangeEvent, KeyboardEvent, useRef, FocusEvent } from "react";
import { AutosizeTextarea } from "@/components/ui/autosize-textarea";
import { Button } from "@/components/ui/button";
import { PencilIcon, SaveIcon, TrashIcon } from "lucide-react";

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
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(initialContent);
    const saveButtonRef = useRef<HTMLButtonElement>(null);
    const deleteButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        setEditedContent(initialContent);
    }, [initialContent, id]);

    const handleTextareaBlur = (event: FocusEvent<HTMLTextAreaElement>) => {
        if (event.relatedTarget === saveButtonRef.current || event.relatedTarget === deleteButtonRef.current) {
            return;
        }
        handleSave();
    };

    const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
        setEditedContent(e.target.value);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSave();
        }
    };

    const handleSave = () => {
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

    return (
        <div className="bg-gray-100 dark:bg-gray-700 border-l-4 border-gray-300 dark:border-gray-500 shadow-sm rounded-md p-4 min-w-[200px] min-h-[120px] max-w-xs relative">
            <div className="absolute top-2 right-2 flex gap-1">
                <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    ref={deleteButtonRef}
                    onClick={handleDelete}
                    title="Delete comment"
                >
                    <TrashIcon className="size-4 text-destructive" />
                </Button>
                <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    ref={saveButtonRef}
                    onClick={isEditing ? handleSave : startEditing}
                    title={isEditing ? "Save comment" : "Edit comment"}
                >
                    {isEditing ? <SaveIcon className="size-4" /> : <PencilIcon className="size-4" />}
                </Button>
            </div>
            {isEditing ? (
                <AutosizeTextarea
                    className="bg-transparent resize-none outline-none w-full text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 pt-8 pb-4 pr-16"
                    value={editedContent}
                    onChange={handleChange}
                    onBlur={handleTextareaBlur}
                    onKeyDown={handleKeyDown}
                    placeholder="Add comment..."
                    autoFocus
                />
            ) : (
                <div className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap text-base leading-relaxed pt-8 pb-1 pr-16">
                    {initialContent || <span className="text-gray-500 dark:text-gray-400 italic">Add comment...</span>}
                </div>
            )}
        </div>
    );
};