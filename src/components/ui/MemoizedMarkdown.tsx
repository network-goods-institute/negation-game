import { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function parseMarkdownIntoBlocks(markdown: string): string[] {
    const normalizedContent = markdown.replace(/\r\n/g, '\n');

    return normalizedContent
        .split(/\n\s*\n/)
        .map(block => block.trim())
        .filter(block => block.length > 0);
}

const MemoizedMarkdownBlock = memo(
    ({ content }: { content: string }) => {
        const processedContent = content.replace(/\n/g, '  \n');

        return (
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    // Preserve whitespace and newlines within paragraphs
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
                    // Add proper spacing and indentation for lists
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
                    code: ({ children }) => (
                        <code className="bg-muted rounded px-1.5 py-0.5 text-sm">
                            {children}
                        </code>
                    ),
                    pre: ({ children }) => (
                        <pre className="bg-muted p-4 rounded-lg overflow-x-auto my-6 whitespace-pre text-sm">
                            {children}
                        </pre>
                    ),
                    blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-muted pl-4 italic my-6">
                            {children}
                        </blockquote>
                    ),
                    // Improve header spacing and hierarchy
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
                    <MemoizedMarkdownBlock content={block} key={`${id}-block_${index}`} />
                ))}
            </div>
        );
    }
);

MemoizedMarkdown.displayName = 'MemoizedMarkdown'; 