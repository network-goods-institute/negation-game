import React, { memo, useState, ReactNode, Fragment } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { PointReference } from '@/components/chatbot/visual/PointReference';
import { SuggestionBlock } from '../chatbot/visual/SuggestionBlock';
import { SourceCitation } from '@/components/chatbot/visual/SourceCitation';

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
const sourceCiteRegex = /\(Source:\s*(Rationale|Endorsed Points?|Discourse Post)\s*(?:"([^"\n]+?)"\s*)?ID:([\w\s,:;-]+)\)/;
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

const blockSuggestPointRegex = /\[Suggest Point\]>\s*([\s\S]*)/;
const blockSuggestNegationRegex = /\[Suggest Negation For:(\d+)\]>\s*([\s\S]*)/;

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
        } else if (match[11]) { // Matched sourceCiteRegex
            const sourceTypeRaw = match[12]; // Raw captured type (e.g., "Endorsed Point", "Endorsed Points")
            const sourceTitle = match[13];
            const sourceIdString = match[14]; // Raw string containing potentially multiple IDs and labels
            console.log("[Markdown Debug] Matched Source Citation Block:", match[0]);
            console.log("[Markdown Debug] Extracted full sourceIdString:", sourceIdString);

            const sourceType: 'Rationale' | 'Endorsed Point' | 'Discourse Post' =
                sourceTypeRaw === 'Endorsed Points' ? 'Endorsed Point' : sourceTypeRaw as any;

            if (sourceIdString && sourceType) {
                // Improved ID extraction: Find all digits sequences within the raw string
                const extractedIds = sourceIdString.match(/\d+/g) || [];
                console.log("[Markdown Debug] Extracted numeric IDs:", extractedIds);

                extractedIds.forEach((numericId, index) => {
                    console.log(`[Markdown Debug] Processing numericId[${index}]:`, numericId);

                    let rawContent: string | undefined = undefined;
                    let htmlContent: string | undefined = undefined;
                    if (sourceType === 'Discourse Post') {
                        const message = storedMessages.find(m => String(m.id) === numericId);
                        rawContent = message?.raw;
                        htmlContent = message?.content;
                    }

                    // Now passing only the numeric string to SourceCitation
                    parts.push(<SourceCitation
                        key={`cite-${numericId}-${keyIndex++}`}
                        type={sourceType}
                        id={numericId}
                        title={extractedIds.length === 1 && sourceType !== 'Discourse Post' ? sourceTitle : undefined} // Only use title if single ID
                        rawContent={rawContent}
                        htmlContent={htmlContent}
                        space={space}
                        discourseUrl={discourseUrl}
                    />);
                    if (index < extractedIds.length - 1) {
                        parts.push(<Fragment key={`space-${keyIndex++}`}> </Fragment>); // Keep space between multiple citations
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
                const rawText = getRawText(children);
                // Block Suggestion: Point
                const pointMatch = blockSuggestPointRegex.exec(rawText);
                if (pointMatch) {
                    const suggestionText = rawText.replace(blockSuggestPointRegex, '$1').trim();
                    return <SuggestionBlock type="point" text={suggestionText} space={space} />;
                }
                // Block Suggestion: Negation
                const negationMatch = blockSuggestNegationRegex.exec(rawText);
                if (negationMatch) {
                    const suggestionText = rawText.replace(blockSuggestNegationRegex, '$2').trim();
                    const targetPointId = parseInt(negationMatch[1], 10);
                    return <SuggestionBlock type="negation" targetId={targetPointId} text={suggestionText} space={space} />;
                }
                // Inline tags and other content
                const processedChildren = renderTextWithInlineTags(rawText, space, discourseUrl, storedMessages);
                return <p {...props}>{processedChildren}</p>;
            },
            li: ({ node, children, ...props }: StandardComponentProps) => {
                // Helper to extract direct text from an AST node's paragraph children.
                // This aims to get text that is directly part of the LI, not in nested lists.
                const getDirectTextFromNode = (astNode: any): string => {
                    let text = '';
                    if (astNode && astNode.children) {
                        for (const childNode of astNode.children) {
                            // Only consider paragraphs that are direct children of the li
                            if (childNode.type === 'paragraph') {
                                for (const grandChildNode of childNode.children || []) {
                                    if (grandChildNode.type === 'text') {
                                        text += grandChildNode.value || '';
                                    }
                                }
                                text += '\n'; // Add a newline to respect paragraph structure within the li
                            } else if (childNode.type === 'text') {
                                // Less common for li direct children, but possible
                                text += childNode.value || '';
                            }
                            // Importantly, we DO NOT recurse into childNode.type === 'list' here
                        }
                    }
                    return text.trim();
                };

                const directContentOfLi = getDirectTextFromNode(node);

                // Case 1: LI's direct content IS a Point Suggestion block
                const pointMatch = blockSuggestPointRegex.exec(directContentOfLi);
                if (pointMatch && directContentOfLi.startsWith('[Suggest Point]>')) {
                    const suggestionText = directContentOfLi.replace(blockSuggestPointRegex, '$1').trim();
                    console.log('[MemoizedMarkdown LI Debug] Point Matched:', { directContentOfLi, suggestionText });
                    return (
                        <li {...props}>
                            <SuggestionBlock type="point" text={suggestionText} space={space} />
                        </li>
                    );
                }

                // Case 2: LI's direct content IS a Negation Suggestion block
                const negationMatch = blockSuggestNegationRegex.exec(directContentOfLi);
                if (negationMatch && directContentOfLi.startsWith('[Suggest Negation For:')) {
                    const suggestionText = directContentOfLi.replace(blockSuggestNegationRegex, '$2').trim();
                    const targetId = parseInt(negationMatch[1], 10);
                    console.log('[MemoizedMarkdown LI Debug] Negation Matched:', { directContentOfLi, targetId, suggestionText });
                    return (
                        <li {...props}>
                            <SuggestionBlock type="negation" targetId={targetId} text={suggestionText} space={space} />
                        </li>
                    );
                }

                // Case 3: LI is NOT a suggestion block itself.
                // Its content (`children` prop from react-markdown) needs to be rendered.
                // This content might be:
                //   - A <p> element (which our p renderer will handle, including its inline tags)
                //   - Plain text strings (which need inline tag processing here)
                //   - Nested <ul>/<ol> elements (react-markdown handles nesting, eventually calling this li renderer again)
                if (directContentOfLi.includes("[Suggest Negation For:") || directContentOfLi.includes("[Suggest Point]>")) {
                    console.log('[MemoizedMarkdown LI Debug] Suggestion-like DIRECT text NOT Matched as primary content:', { directContentOfLi, children });
                }

                const processedChildren = React.Children.map(children, child => {
                    if (typeof child === 'string') {
                        // If a direct child of li (passed by react-markdown) is a string, process it for inline tags.
                        return renderTextWithInlineTags(child, space, discourseUrl, storedMessages);
                    }
                    // If child is a React element (e.g., a <p> handled by our p_renderer, or a nested list), pass it through.
                    // Our custom <p> renderer will call renderTextWithInlineTags for its content.
                    // Nested lists will have their <li> items processed by this same logic.
                    return child;
                });

                return <li {...props}>{processedChildren}</li>;
            },
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