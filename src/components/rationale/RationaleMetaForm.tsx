import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import TopicSelector from '../inputs/TopicSelector';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useRouter, usePathname } from 'next/navigation';
import { encodeId } from '@/lib/negation-game/encodeId';
import Link from 'next/link';

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
    allowTopicEditInHeader?: boolean;
    renderCopiedFromLink?: React.ReactNode;
    showEditButtons?: boolean;
    titleModified?: boolean;
    descriptionModified?: boolean;
    renderHeader?: React.ReactNode;
    /**
     * When true, the title field (both input for new rationales and static display for existing
     * rationales) is completely hidden from the UI.
     */
    hideTitle?: boolean;
    /**
     * Controls whether the title can be edited. Defaults to true. When false the edit button and
     * associated click handlers are disabled but the title text is still rendered (unless
     * hideTitle is also true).
     */
    allowTitleEdit?: boolean;
    /**
     * When true, the TopicSelector component is not rendered. Useful for existing rationales where
     * topics should no longer be editable/visible.
     */
    hideTopicSelector?: boolean;
    /**
     * When true the topic (or a prominent TopicSelector for new rationales) is rendered in the
     * header position where the title used to live, making the topic visually dominant.
     */
    showTopicHeader?: boolean;
    /**
     * The space slug for navigation. When provided along with enableTopicNavigation, 
     * allows clicking the topic to navigate to the topic page.
     */
    spaceSlug?: string;
    /**
     * When true, makes the topic clickable to navigate to the topic page.
     * Requires spaceSlug to be provided.
     */
    enableTopicNavigation?: boolean;
    showTopicLockedHint?: boolean;
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
    topics,
    currentSpace,
    isNew = false,
    canEdit = false,
    allowTopicEditInHeader = true,
    renderCopiedFromLink,
    showEditButtons = false,
    titleModified = false,
    descriptionModified = false,
    renderHeader,
    hideTitle = false,
    allowTitleEdit = true,
    hideTopicSelector = false,
    showTopicHeader = false,
    spaceSlug,
    enableTopicNavigation = false,
    showTopicLockedHint = false,
}: RationaleMetaFormProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [isTopicClicked, setIsTopicClicked] = useState(false);
    const [isViewTopicClicked, setIsViewTopicClicked] = useState(false);

    const shouldHideTitle = hideTitle || (showTopicHeader && title === topic);

    const selectedTopic = topics.find((t: { id: number; name: string }) => t.name === topic);
    const topicId = selectedTopic?.id;

    const isOnTopicPage = React.useMemo(() => {
        if (!topicId || !spaceSlug) return false;
        const expectedPath = `/s/${spaceSlug}/topic/${encodeId(topicId)}`;
        return pathname === expectedPath;
    }, [pathname, spaceSlug, topicId]);

    useEffect(() => {
        if (isTopicClicked) {
            const timer = setTimeout(() => {
                setIsTopicClicked(false);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [isTopicClicked]);

    const handleTopicClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!enableTopicNavigation || !spaceSlug || !topicId || isOnTopicPage) {
            return;
        }

        setIsTopicClicked(true);
        router.push(`/s/${spaceSlug}/topic/${encodeId(topicId)}`);
    };

    return (
        <div className="flex flex-col p-2 gap-0">
            {showTopicHeader && (
                isNew && allowTopicEditInHeader && canEdit ? (
                    <div className="mb-4">
                        <label className="text-sm font-medium mb-1 inline-block">Topic</label>
                        <TopicSelector
                            currentSpace={currentSpace}
                            value={topic}
                            onChange={onTopicChange}
                            wrapperClassName="pt-0 pb-0"
                            showLabel={false}
                        />
                    </div>
                ) : (
                    enableTopicNavigation && spaceSlug && topicId && !isOnTopicPage ? (
                        <div className="mb-4">
                            {isTopicClicked && (
                                <div className="inline-block mr-2 size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            )}
                            <h2
                                className={cn(
                                    "font-semibold text-xl pr-16 truncate cursor-pointer",
                                    "text-blue-600 dark:text-blue-400 hover:underline"
                                )}
                                onClick={handleTopicClick}
                                title={`View topic: ${topic}`}
                            >
                                {topic || 'Untitled Topic'}
                            </h2>
                            {showTopicLockedHint && (
                                <p className="text-sm text-muted-foreground mt-1">Topic locked (copied from original rationale)</p>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                className="mt-2 w-fit text-sm"
                                onClick={() => {
                                    setIsViewTopicClicked(true);
                                    router.push(`/s/${spaceSlug}/topic/${encodeId(topicId!)}`);
                                }}
                            >
                                {isViewTopicClicked && (
                                    <span className="w-4 h-4 mr-2 flex items-center justify-center flex-shrink-0">
                                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                    </span>
                                )}
                                <span>View Topic</span>
                            </Button>
                        </div>
                    ) : (
                        <div className="mb-4">
                            <h2 className="font-semibold text-xl pr-16 truncate">
                                {topic || 'Untitled Topic'}
                            </h2>
                            {(isNew && !canEdit) || showTopicLockedHint ? (
                                <p className="text-sm text-muted-foreground mt-1">
                                    Topic locked (copied from original rationale)
                                </p>
                            ) : null}
                            {spaceSlug && topicId && !isOnTopicPage && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2 w-fit text-sm"
                                    onClick={() => {
                                        setIsViewTopicClicked(true);
                                        router.push(`/s/${spaceSlug}/topic/${encodeId(topicId)}`);
                                    }}
                                >
                                    {isViewTopicClicked && (
                                        <span className="w-4 h-4 mr-2 flex items-center justify-center flex-shrink-0">
                                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                        </span>
                                    )}
                                    <span>View Topic</span>
                                </Button>
                            )}
                        </div>
                    )
                )
            )}
            {/* Title section */}
            {!shouldHideTitle && (
                isTitleEditing || (isNew && allowTitleEdit) ? (
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
                        {allowTitleEdit && showEditButtons && !isTitleEditing && (
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
                            className={cn("cursor-pointer", allowTitleEdit && canEdit && showEditButtons && "pt-4", isTitleEditing && "hidden")}
                            onClick={allowTitleEdit && canEdit ? onTitleEdit : undefined}
                            onDoubleClick={allowTitleEdit && canEdit ? onTitleEdit : undefined}
                        >
                            <h2 className="font-semibold pr-16">
                                {title}{titleModified ? '*' : ''}
                            </h2>
                        </div>
                    </div>
                )
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
            {!hideTopicSelector && (
                <TopicSelector
                    currentSpace={currentSpace}
                    value={topic}
                    onChange={onTopicChange}
                    wrapperClassName="pt-2 pb-2"
                    showLabel={false}
                />
            )}
        </div>
    );
} 