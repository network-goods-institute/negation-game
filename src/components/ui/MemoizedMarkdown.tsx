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
const sourceCiteRegex = /\(Source:\s*(Rationale|Endorsed Point|Discourse Post)\s*ID:([\w-]+)(?:\s*Title:"([^"\n]+)")?\)/;
const combinedInlineRegex = new RegExp(
    `(${pointRefRegex.source})|(${rationaleRefRegex.source})|(${sourceCiteRegex.source})`,
    'g'
);

const suggestTagRegex = /^\[(Suggest Point|Suggest Negation For:(\d+))\]>/;

// Function to parse text nodes and replace tags with components
const renderTextWithInlineTags = (text: string): ReactNode[] => {
    const parts: ReactNode[] = [];
    let lastIndex = 0;
    let match;
    let keyIndex = 0; // For unique keys

    // Reset regex lastIndex before each use
    combinedInlineRegex.lastIndex = 0;

    while ((match = combinedInlineRegex.exec(text)) !== null) {
        // Add preceding text if any
        if (match.index > lastIndex) {
            parts.push(<Fragment key={`text-${keyIndex++}`}>{text.substring(lastIndex, match.index)}</Fragment>);
        }

        // Check which type of tag matched
        if (match[1]) { // Point Reference match (Groups 2, 3)
            const pointId = parseInt(match[2], 10);
            const snippet = match[3];
            parts.push(<PointReference key={`point-${pointId}-${keyIndex++}`} id={pointId} snippet={snippet} />);
        } else if (match[4]) { // Rationale Reference match (Groups 5, 6)
            const rationaleId = match[5];
            const snippet = match[6];
            // Render Rationale using PointReference component, passing ID as string
            parts.push(<PointReference key={`rationale-${rationaleId}-${keyIndex++}`} id={rationaleId as any} snippet={snippet} />);
        } else if (match[7]) { // Source Citation match (Groups 8, 9, 10)
            const sourceType = match[8] as 'Rationale' | 'Endorsed Point' | 'Discourse Post';
            const sourceId = match[9];
            const sourceTitle = match[10];
            parts.push(<SourceCitation key={`cite-${sourceId}-${keyIndex++}`} type={sourceType} id={sourceId} title={sourceTitle} />);
        }

        lastIndex = match.index + match[0].length;
    }

    // Add remaining text after the last match
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

export const MemoizedMarkdown = memo(
    ({ content, id, isUserMessage }: { content: string; id: string; isUserMessage?: boolean }) => {

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
                        // Get text after the tag, potentially merging subsequent text nodes
                        let suggestionText = textValue.substring(suggestMatch[0].length).trimStart();
                        if (node.children.length > 1) {
                            suggestionText += node.children.slice(1).map((n: any) => n.value || '').join('');
                        }
                        // Render SuggestionBlock instead of the paragraph
                        return <SuggestionBlock type={type} targetId={targetId} text={suggestionText} />;
                    }
                }

                // Default paragraph rendering, but process children for inline tags
                const processedChildren = React.Children.map(children, (child) => {
                    if (typeof child === 'string') {
                        return renderTextWithInlineTags(child);
                    }
                    // Potentially handle nested components if needed, basic case for now
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