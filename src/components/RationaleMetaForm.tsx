import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import TopicSelector from '@/components/TopicSelector';
import { cn } from '@/lib/cn';
import { DEFAULT_SPACE } from '@/constants/config';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export interface RationaleMetaFormProps {
    title: string;
    onTitleChange: (value: string) => void;
    isTitleEditing?: boolean;
    onTitleEdit?: () => void;
    onTitleBlur?: () => void;
    description: string;
    onDescriptionChange: (value: string) => void;
    isDescriptionEditing?: boolean;
    onDescriptionEdit?: () => void;
    onDescriptionBlur?: () => void;
    topic: string;
    onTopicChange: (value: string) => void;
    topics: { id: number; name: string }[];
    currentSpace: string;
    isNew?: boolean;
    canEdit?: boolean;
    renderCopiedFromLink?: React.ReactNode;
    showEditButtons?: boolean;
    titleModified?: boolean;
    descriptionModified?: boolean;
    renderHeader?: React.ReactNode;
}

export default function RationaleMetaForm({
    title,
    onTitleChange,
    isTitleEditing = false,
    onTitleEdit,
    onTitleBlur,
    description,
    onDescriptionChange,
    isDescriptionEditing = false,
    onDescriptionEdit,
    onDescriptionBlur,
    topic,
    onTopicChange,
    currentSpace,
    isNew = false,
    canEdit = false,
    renderCopiedFromLink,
    showEditButtons = false,
    titleModified = false,
    descriptionModified = false,
    renderHeader,
}: RationaleMetaFormProps) {
    const displayDescription = description || (canEdit ? 'Click edit to add a description...' : 'No description');
    return (
        <div className="flex flex-col p-2 gap-0">
            {isTitleEditing || isNew ? (
                <>
                    {isNew && <label htmlFor="rationale-title" className="text-sm font-medium mb-1">Title</label>}
                    <Input
                        id="rationale-title"
                        value={title}
                        onChange={(e) => onTitleChange(e.target.value)}
                        placeholder="Enter title"
                        autoFocus
                        onBlur={onTitleBlur}
                    />
                </>
            ) : (
                <div className="relative">
                    {showEditButtons && !isTitleEditing && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0"
                            onClick={onTitleEdit}
                        >
                            Edit{titleModified ? '*' : ''}
                        </Button>
                    )}
                    <div
                        className={cn("cursor-pointer", canEdit && showEditButtons && "pt-4", isTitleEditing && "hidden")}
                        onClick={canEdit ? onTitleEdit : undefined}
                        onDoubleClick={canEdit ? onTitleEdit : undefined}
                    >
                        <h2 className="font-semibold pr-16">
                            {title}{titleModified ? '*' : ''}
                        </h2>
                    </div>
                </div>
            )}
            {renderCopiedFromLink && <div className="mt-1">{renderCopiedFromLink}</div>}
            {renderHeader && <div className="mt-2">{renderHeader}</div>}
            <Separator className="my-2" />
            {isNew && (
                <>
                    {/* Description label and markdown support for new viewpoints */}
                    <div className="flex items-baseline gap-2">
                        <label htmlFor="rationale-description" className="text-sm font-medium">Description</label>
                        <span className="text-muted-foreground text-xs">(Markdown supported)</span>
                    </div>
                </>
            )}
            {isDescriptionEditing ? (
                <Textarea
                    id="rationale-description"
                    value={description}
                    onChange={(e) => onDescriptionChange(e.target.value)}
                    placeholder="Enter description"
                    autoFocus
                    onBlur={onDescriptionBlur}
                    className="min-h-[200px] mb-4"
                />
            ) : (
                <div className="relative">
                    {showEditButtons && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0"
                            onClick={onDescriptionEdit}
                        >
                            Edit{descriptionModified ? '*' : ''}
                        </Button>
                    )}
                    <div
                        className={cn("cursor-text border rounded-md p-4 prose dark:prose-invert text-muted-foreground max-w-none", isDescriptionEditing && "hidden")}
                        onClick={canEdit ? onDescriptionEdit : undefined}
                    >
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {description || (canEdit ? 'Click to add a description...' : 'No description')}
                        </ReactMarkdown>
                    </div>
                </div>
            )}
            <Separator className="my-2" />
            <TopicSelector
                currentSpace={currentSpace || DEFAULT_SPACE}
                value={topic}
                onChange={onTopicChange}
                wrapperClassName="pt-2 pb-2"
                showLabel={false}
            />
        </div>
    );
} 