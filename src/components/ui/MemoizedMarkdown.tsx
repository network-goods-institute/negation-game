import React, { memo, useState, ReactNode, Fragment } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from './button';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { PointReference } from '../chatbot/PointReference';
import { SuggestionBlock } from '../chatbot/SuggestionBlock';
import { SourceCitation } from '../chatbot/SourceCitation';

const CodeBlock = memo(({ className, children, ...props }: { className?: string; children: string }) => {
    const [copied, setCopied] = useState(false);

    // Extract language and clean up code content
    const match = /^```(\w*)\n([\s\S]*?)```\s*$/.exec(children as string);
    // If we have a match with backticks, use that, otherwise just use the raw content

    const language = match ? match[1] : className?.replace('language-', '') || '';

    // Clean up the code content - remove trailing backticks if they exist
    const code = (match ? match[2] : String(children)).replace(/```\s*$/, '').trim();

    const copyToClipboard = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative group">
            {language && (
                <div className="absolute right-2 top-2 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono">
                        {language}
                    </span>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={copyToClipboard}
                    >
                        {copied ? (
                            <CheckIcon className="h-3 w-3 text-green-500" />
                        ) : (
                            <CopyIcon className="h-3 w-3" />
                        )}
                    </Button>
                </div>
            )}
            <pre className={cn(
                "bg-muted p-4 rounded-lg overflow-x-auto my-6 text-sm",
                language && "pt-12"
            )}>
                <code className={language ? `language-${language}` : undefined} {...props}>
                    {code}
                </code>
            </pre>
        </div>
    );
});

CodeBlock.displayName = 'CodeBlock';

const pointRefRegex = /\[Point:(\d+)(?:\s+\"([^\"\n]+?)\")?\]/;
const multiPointRefRegex = /\[Point:\d+(?:,\s*Point:\d+)*\]/;
const rationaleRefRegex = /\[Rationale:([\w-]+)(?:\s+\"([^\"\n]+?)\")?\]/;
const discoursePostRefRegex = /\[Discourse Post:(\d+)\]/;
const multiDiscoursePostRefRegex = /\[Discourse Post:\d+(?:,\s*Discourse Post:\d+)*\]/;
const sourceCiteRegex = /\(Source:\s*(Rationale|Endorsed Point|Discourse Post)\s*(?:"([^"\n]+?)"\s*)?ID:([\w\s,:;-]+)\)/;
const inlineRationaleRefRegex = /Rationale\s+"([^"\n]+?)"\s+\(ID:([\w-]+)\)/;

const combinedInlineRegex = new RegExp(
    `(${multiDiscoursePostRefRegex.source})|` +
    `(${multiPointRefRegex.source})|` +
    `(${pointRefRegex.source})|` +
    `(${rationaleRefRegex.source})|` +
    `(${discoursePostRefRegex.source})|` +
    `(${sourceCiteRegex.source})|` +
    `(${inlineRationaleRefRegex.source})`,
    'g'
);

const blockSuggestPointRegex = /^\s*\[Suggest Point\]>\s*([\s\S]*)/;
const blockSuggestNegationRegex = /^\s*\[Suggest Negation For:(\d+)\]>\s*([\s\S]*)/;

type AnyDiscourseMessage = { id: number | string; raw?: string; content?: string;[key: string]: any };

const renderTextWithInlineTags = (
    text: string,
    space: string | null,
    discourseUrl: string,
    storedMessages: AnyDiscourseMessage[]
): ReactNode[] => {
    const parts: ReactNode[] = [];
    let lastIndex = 0;
    let match;
    let keyIndex = 0;

    combinedInlineRegex.lastIndex = 0;

    const digitRegex = /\d+/g;

    while ((match = combinedInlineRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(<Fragment key={`text-${keyIndex++}`}>{text.substring(lastIndex, match.index)}</Fragment>);
        }

        const fullMatchedString = match[0];

        if (match[1]) { // Matched multiDiscoursePostRefRegex (Group 1)
            let digitMatch;
            let firstDigit = true;
            digitRegex.lastIndex = 0; // Reset for this match
            while ((digitMatch = digitRegex.exec(fullMatchedString)) !== null) {
                const postId = parseInt(digitMatch[0], 10);
                if (!isNaN(postId)) {
                    const message = storedMessages.find(m => String(m.id) === String(postId));
                    if (!firstDigit) {
                        parts.push(<Fragment key={`comma-disc-${keyIndex++}`}>, </Fragment>);
                    }
                    parts.push(<SourceCitation key={`discourse-${postId}-${keyIndex++}`} type="Discourse Post" id={postId} title={undefined} rawContent={message?.raw} htmlContent={message?.content} space={space} discourseUrl={discourseUrl} />);
                    firstDigit = false;
                }
            }
        } else if (match[2]) { // Matched multiPointRefRegex (Group 2)
            let digitMatch;
            let firstDigit = true;
            digitRegex.lastIndex = 0; // Reset for this match
            while ((digitMatch = digitRegex.exec(fullMatchedString)) !== null) {
                const pointId = parseInt(digitMatch[0], 10);
                if (!isNaN(pointId)) {
                    if (!firstDigit) {
                        // Add separator before subsequent points
                        parts.push(<Fragment key={`comma-${keyIndex++}`}>, </Fragment>);
                    }
                    parts.push(<PointReference key={`point-${pointId}-${keyIndex++}`} id={pointId} space={space} />);
                    firstDigit = false;
                }
            }
        } else if (match[3]) { // Matched pointRefRegex (Group 3)
            const pointId = parseInt(match[4], 10); // ID is Group 4
            const snippet = match[5]; // Snippet is Group 5
            parts.push(<PointReference key={`point-${pointId}-${keyIndex++}`} id={pointId} snippet={snippet} space={space} />);
        } else if (match[6]) { // Matched rationaleRefRegex (Group 6)
            const rationaleId = match[7]; // ID is Group 7
            const snippet = match[8]; // Snippet is Group 8
            parts.push(<PointReference key={`rationale-${rationaleId}-${keyIndex++}`} id={rationaleId as any} snippet={snippet} space={space} />);
        } else if (match[9]) { // Matched discoursePostRefRegex (Group 9)
            const postId = match[10]; // ID is Group 10
            const message = storedMessages.find(m => String(m.id) === String(postId));
            parts.push(<SourceCitation key={`discourse-${postId}-${keyIndex++}`} type="Discourse Post" id={postId} title={undefined} rawContent={message?.raw} htmlContent={message?.content} space={space} discourseUrl={discourseUrl} />);
        } else if (match[11]) {
            const sourceType = match[12] as 'Rationale' | 'Endorsed Point' | 'Discourse Post';
            const sourceTitle = match[13];
            const sourceIdString = match[14];
            console.log("[Markdown Debug] Matched Source Citation Block:", match[0]);
            console.log("[Markdown Debug] Extracted sourceIdString:", sourceIdString);

            if (sourceIdString && sourceType) {
                const sourceIds = sourceIdString.split(',').map(id => id.trim()).filter(id => id);
                console.log("[Markdown Debug] Split sourceIds:", sourceIds);

                sourceIds.forEach((sourceId, index) => {
                    console.log(`[Markdown Debug] Processing sourceId[${index}]:`, sourceId);
                    const cleanedSourceId = sourceId.replace(/^ID:/i, '').trim();
                    console.log(`[Markdown Debug] Cleaned sourceId[${index}]:`, cleanedSourceId);

                    let rawContent: string | undefined = undefined;
                    let htmlContent: string | undefined = undefined;
                    if (sourceType === 'Discourse Post') {
                        const message = storedMessages.find(m => String(m.id) === String(cleanedSourceId));
                        rawContent = message?.raw;
                        htmlContent = message?.content;
                    }
                    parts.push(<SourceCitation
                        key={`cite-${cleanedSourceId}-${keyIndex++}`}
                        type={sourceType}
                        id={cleanedSourceId}
                        title={sourceType !== 'Discourse Post' ? sourceTitle : undefined}
                        rawContent={rawContent}
                        htmlContent={htmlContent}
                        space={space}
                        discourseUrl={discourseUrl}
                    />);
                    if (index < sourceIds.length - 1) {
                        parts.push(<Fragment key={`space-${keyIndex++}`}> </Fragment>);
                    }
                });
            } else {
                console.warn("Source citation regex matched but failed to extract parts:", match[0]);
                parts.push(<Fragment key={`text-error-${keyIndex++}`}>{match[0]}</Fragment>);
            }
        } else if (match[15]) { // Matched inlineRationaleRefRegex (Group 15)
            const rationaleTitle = match[16]; // Title is Group 16
            const rationaleId = match[17]; // ID is Group 17
            parts.push(<PointReference key={`inline-rationale-${rationaleId}-${keyIndex++}`} id={rationaleId as any} snippet={rationaleTitle} space={space} />);
        }

        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
        parts.push(<Fragment key={`text-${keyIndex++}`}>{text.substring(lastIndex)}</Fragment>);
    }

    return parts;
};

interface StandardComponentProps {
    node?: any;
    inline?: boolean;
    className?: string;
    children?: ReactNode;
    [key: string]: any;
}

interface MemoizedMarkdownProps {
    content: string;
    id: string;
    isUserMessage?: boolean;
    space: string | null;
    discourseUrl: string;
    storedMessages: AnyDiscourseMessage[];
}

export const MemoizedMarkdown = memo(
    ({ content, id, isUserMessage, space, discourseUrl, storedMessages }: MemoizedMarkdownProps) => {

        const customRenderers: import('react-markdown').Components = {
            p: ({ node, children, ...props }: StandardComponentProps) => {
                const getRawText = (nodes: any): string => {
                    if (typeof nodes === 'string') return nodes;
                    if (Array.isArray(nodes)) return nodes.map(getRawText).join('');
                    if (nodes?.props?.children) return getRawText(nodes.props.children);
                    return '';
                };

                let potentialMatchText = '';
                if (Array.isArray(children) && children.length > 0 && typeof children[0] === 'string') {
                    potentialMatchText = children[0];
                } else if (typeof children === 'string') {
                    potentialMatchText = children;
                }

                const pointMatch = blockSuggestPointRegex.exec(potentialMatchText);
                const negationMatch = blockSuggestNegationRegex.exec(potentialMatchText);

                if (pointMatch) {
                    const fullText = getRawText(children).replace(blockSuggestPointRegex, '$1').trim();
                    return <SuggestionBlock type="point" text={fullText} space={space} />;
                }

                if (negationMatch) {
                    const fullText = getRawText(children).replace(blockSuggestNegationRegex, '$2').trim();
                    const targetPointId = parseInt(negationMatch[1], 10);
                    return <SuggestionBlock type="negation" targetId={targetPointId} text={fullText} space={space} />;
                }


                const rawText = getRawText(children);
                const processedChildren = renderTextWithInlineTags(rawText, space, discourseUrl, storedMessages);
                return <p {...props}>{processedChildren}</p>;
            },
            li: ({ node, children, ...props }: StandardComponentProps) => {
                let rawText = '';
                const firstChild = node?.children?.[0];

                if (firstChild?.type === 'text') {
                    rawText = firstChild.value || '';
                } else if (firstChild?.type === 'element' && firstChild.tagName === 'p') {
                    const paragraphNode = firstChild.children?.[0];
                    if (paragraphNode?.type === 'text') {
                        rawText = paragraphNode.value || '';
                    }
                } else {
                    rawText = React.Children.toArray(children).map(child => typeof child === 'string' ? child : '').join('');
                }
                const trimmedText = rawText.trim();

                // Check for Block Suggest Negation within the list item
                const negationMatch = trimmedText.match(blockSuggestNegationRegex);
                if (negationMatch) {
                    const targetId = negationMatch[1] ? parseInt(negationMatch[1], 10) : undefined;
                    const suggestionText = negationMatch[2].trim();
                    if (suggestionText && targetId !== undefined) {
                        return (
                            <SuggestionBlock
                                key={`suggest-neg-block-li-${targetId}-${id}-${Math.random()}`}
                                type="negation"
                                targetId={targetId}
                                text={suggestionText}
                                space={space}
                            />
                        );
                    }
                }

                return <li {...props}>{children}</li>;
            },
            // Keep existing code renderer
            code: ({ node, inline, className, children, ...props }: StandardComponentProps) => {
                if (!children) return null;
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                    <CodeBlock className={className} {...props}>
                        {String(children).replace(/\n$/, '')}
                    </CodeBlock>
                ) : (
                    <code className={cn(
                        "bg-muted rounded px-1.5 py-0.5 text-sm",
                        isUserMessage ? "bg-white/20 text-white" : "bg-muted"
                    )} {...props}>
                        {children}
                    </code>
                );
            },
            pre: ({ children }: { children?: ReactNode }) => children, // Keep existing pre renderer
        };

        return (
            <div className={cn(
                "prose dark:prose-invert max-w-none [&_p]:text-base [&_li]:text-base [&_code]:text-base",
                isUserMessage && "prose-invert [&_*]:text-white"
            )}>
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]} // Remove the custom plugin
                    components={customRenderers} // Use the updated renderers
                >
                    {content}
                </ReactMarkdown>
            </div>
        );
    }
);

MemoizedMarkdown.displayName = 'MemoizedMarkdown'; 