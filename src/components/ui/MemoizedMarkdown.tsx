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

const pointRefRegex = /\[Point:(\d+)(?:\s+"([^"\n]+)")?\]/;
const rationaleRefRegex = /\[Rationale:([\w-]+)(?:\s+"([^"\n]+)")?\]/;
const discoursePostRefRegex = /\[Discourse Post:(\d+)(?:\s+"([^"\n]+)")?\]/;
// Regex to match (Source: Type "Title" ID:ID) or (Source: Type ID:ID Title/Topic:"Title")
const sourceCiteRegex = /\(Source:\s*(Rationale|Endorsed Point|Discourse Post)\s*(?:(?:"([^"\n]+)"\s*ID:([\w-]+))|(?:(?:ID:)?([\w-]+)(?:\s*(?:Title|Topic):"([^"\n]+)")?))\)/;
const inlineRationaleRefRegex = /Rationale\s+"([^"]+)"\s+\(ID:([\w-]+)\)/;
const combinedInlineRegex = new RegExp(
    `(${pointRefRegex.source})|(${rationaleRefRegex.source})|(${discoursePostRefRegex.source})|(${sourceCiteRegex.source})|(${inlineRationaleRefRegex.source})`,
    'g'
);

const suggestTagRegex = /^\[(Suggest Point|Suggest Negation For:(\d+))\]>/;

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

    while ((match = combinedInlineRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(<Fragment key={`text-${keyIndex++}`}>{text.substring(lastIndex, match.index)}</Fragment>);
        }

        if (match[1]) { // Point Reference
            const pointId = parseInt(match[2], 10);
            const snippet = match[3];
            parts.push(<PointReference key={`point-${pointId}-${keyIndex++}`} id={pointId} snippet={snippet} space={space} />);
        } else if (match[4]) { // Rationale Reference
            const rationaleId = match[5];
            const snippet = match[6];
            parts.push(<PointReference key={`rationale-${rationaleId}-${keyIndex++}`} id={rationaleId as any} snippet={snippet} space={space} />);
        } else if (match[7]) { // Discourse Post Reference [Discourse Post:ID]
            const postId = match[8];
            const message = storedMessages.find(m => String(m.id) === String(postId));
            parts.push(<SourceCitation
                key={`discourse-${postId}-${keyIndex++}`}
                type="Discourse Post"
                id={postId}
                title={undefined}
                rawContent={message?.raw}
                htmlContent={message?.content}
                space={space}
                discourseUrl={discourseUrl}
            />);
        } else if (match[10]) { // Source Citation (Source: ...)
            const sourceType = match[11] as 'Rationale' | 'Endorsed Point' | 'Discourse Post';
            const sourceTitle = match[12] || match[15];
            const sourceId = match[13] || match[14];
            if (sourceId) {
                let rawContent: string | undefined = undefined;
                let htmlContent: string | undefined = undefined;
                if (sourceType === 'Discourse Post') {
                    const message = storedMessages.find(m => String(m.id) === String(sourceId));
                    rawContent = message?.raw;
                    htmlContent = message?.content;
                }
                parts.push(<SourceCitation
                    key={`cite-${sourceId}-${keyIndex++}`}
                    type={sourceType}
                    id={sourceId}
                    title={sourceType !== 'Discourse Post' ? sourceTitle : undefined}
                    rawContent={rawContent}
                    htmlContent={htmlContent}
                    space={space}
                    discourseUrl={discourseUrl}
                />);
            }
        } else if (match[16]) { // Inline Rationale Reference
            const rationaleTitle = match[17];
            const rationaleId = match[18];
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

        const customRenderers = {
            // Custom renderer for paragraphs
            p: ({ node, children, ...props }: StandardComponentProps) => {
                // Check if the first child is text and starts with a suggestion tag
                const firstChild = node?.children?.[0];
                if (firstChild && firstChild.type === 'text') {
                    const textValue = firstChild.value || '';
                    const suggestMatch = textValue.match(suggestTagRegex);
                    if (suggestMatch) {
                        const type = suggestMatch[1] === 'Suggest Point' ? 'point' : 'negation';
                        const targetId = suggestMatch[2] ? parseInt(suggestMatch[2], 10) : undefined;
                        let suggestionText = textValue.substring(suggestMatch[0].length).trimStart();
                        if (node.children.length > 1) {
                            suggestionText += node.children.slice(1).map((n: any) => n.value || '').join('');
                        }
                        return <SuggestionBlock type={type} targetId={targetId} text={suggestionText} />;
                    }
                }

                // Default paragraph rendering, but process children for inline tags
                const processedChildren = React.Children.map(children, (child) => {
                    if (typeof child === 'string') {
                        return renderTextWithInlineTags(child, space, discourseUrl, storedMessages);
                    }
                    return child;
                });
                return <p {...props}>{processedChildren}</p>;
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