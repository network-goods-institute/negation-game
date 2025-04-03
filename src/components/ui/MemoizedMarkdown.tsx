import { memo, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from './button';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

const parseMarkdownIntoBlocks = (content: string) => {


    // normalize line endings and clean up extra whitespace
    let normalizedContent = content.replace(/\r\n/g, '\n').trim();

    const codeBlocks: string[] = [];
    normalizedContent = normalizedContent.replace(/```[\s\S]*?```/g, (match) => {
        const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
        codeBlocks.push(match);
        return placeholder;
    });

    // Split into blocks preserving list structures and nested lists
    const blocks = normalizedContent
        // Split on double newlines that aren't followed by list markers or indentation
        // AND split when we encounter a list marker at the start of a line
        .split(/\n\n+(?![-*+]\s|(?:\d+\.)\s|\s+[-*+]\s)|(?=^[-*+]\s|^\d+\.\s)/m)
        .map(block => {
            // Keep list items and their indentation intact
            if (block.match(/^[-*+\s]\s|^\d+\.\s|\s+[-*+]\s/m)) {
                return block
                    .split('\n')
                    .map(line => line.trimEnd()) // Only trim end to preserve indentation
                    .filter(line => line.length > 0)
                    .join('\n');
            }
            return block.trim();
        })
        .filter(block => block.length > 0);

    // Process each block
    const processedBlocks = blocks.map(block => {
        if (block.startsWith('__CODE_BLOCK_')) {
            const index = parseInt(block.match(/__CODE_BLOCK_(\d+)__/)?.[1] || '0');
            return codeBlocks[index];
        }

        let processedBlock = block.replace(/__CODE_BLOCK_\d+__/g, '');
        return processedBlock;
    });

    return processedBlocks;
};

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

const MemoizedMarkdownBlock = memo(
    ({ content }: { content: string }) => {

        // Don't split inline formatting across blocks
        const processedContent = content
            // Join inline formatting that was split
            .replace(/\*\*\s+/g, '** ')
            .replace(/\*\s+/g, '* ')
            .replace(/_\s+/g, '_ ')
            .replace(/`\s+/g, '` ');

        return (
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    p: ({ children }) => (
                        <p className="whitespace-pre-wrap break-words my-4 leading-7">
                            {children}
                        </p>
                    ),
                    a: ({ children, href }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            {children}
                        </a>
                    ),
                    ul: ({ children }) => (
                        <ul className="my-6 list-disc list-outside ml-6 space-y-2">
                            {children}
                        </ul>
                    ),
                    ol: ({ children }) => (
                        <ol className="my-6 list-decimal list-outside ml-6 space-y-2">
                            {children}
                        </ol>
                    ),
                    li: ({ children, ...props }) => (
                        <li className="pl-2" {...props}>
                            {children}
                        </li>
                    ),
                    code: ({ className, children, ...props }) => {
                        console.log('Rendering code component:', { className, children });
                        const match = /language-(\w+)/.exec(className || '');
                        return className && match ? (
                            <CodeBlock className={className} {...props}>
                                {String(children).replace(/\n$/, '')}
                            </CodeBlock>
                        ) : (
                            <code className="bg-muted rounded px-1.5 py-0.5 text-sm" {...props}>
                                {children}
                            </code>
                        );
                    },
                    pre: ({ children }) => <>{children}</>,
                    blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-muted pl-4 italic my-6">
                            {children}
                        </blockquote>
                    ),
                    h1: ({ children }) => (
                        <h1 className="text-2xl font-bold mt-8 mb-4">
                            {children}
                        </h1>
                    ),
                    h2: ({ children }) => (
                        <h2 className="text-xl font-semibold mt-6 mb-4">
                            {children}
                        </h2>
                    ),
                    h3: ({ children }) => (
                        <h3 className="text-lg font-medium mt-4 mb-3">
                            {children}
                        </h3>
                    ),
                }}
            >
                {processedContent}
            </ReactMarkdown>
        );
    },
    (prevProps, nextProps) => prevProps.content === nextProps.content
);

MemoizedMarkdownBlock.displayName = 'MemoizedMarkdownBlock';

export const MemoizedMarkdown = memo(
    ({ content, id }: { content: string; id: string }) => {
        const blocks = useMemo(() => parseMarkdownIntoBlocks(content), [content]);

        return (
            <div className="prose dark:prose-invert max-w-none text-sm space-y-6">
                {blocks.map((block, index) => (
                    <MemoizedMarkdownBlock
                        content={block}
                        key={`${id}-${index}-${block.slice(0, 20)}`}
                    />
                ))}
            </div>
        );
    }
);

MemoizedMarkdown.displayName = 'MemoizedMarkdown'; 