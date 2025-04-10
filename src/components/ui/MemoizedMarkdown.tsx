import { memo, useMemo, useState, ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from './button';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

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

interface CodeComponentProps {
    node?: any;
    inline?: boolean;
    className?: string;
    children?: ReactNode;
    [key: string]: any;
}

export const MemoizedMarkdown = memo(
    ({ content, id, isUserMessage }: { content: string; id: string; isUserMessage?: boolean }) => {
        return (
            <div className={cn(
                "prose dark:prose-invert max-w-none [&_p]:text-base [&_li]:text-base [&_code]:text-base",
                isUserMessage && "prose-invert [&_*]:text-white"
            )}>
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        code: ({ node, inline, className, children, ...props }: CodeComponentProps) => {
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
                        pre: ({ children }) => children,
                    }}
                >
                    {content}
                </ReactMarkdown>
            </div>
        );
    }
);

MemoizedMarkdown.displayName = 'MemoizedMarkdown'; 