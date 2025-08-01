'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { encodeId } from '@/lib/negation-game/encodeId';

interface Props { sourceUrl: string; }

export default function ScrollSourceEmbedClient({ sourceUrl }: Props) {
    const router = useRouter();
    const [status, setStatus] = useState<'loading' | 'error' | 'prompt'>('loading');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (!sourceUrl) {
            setStatus('error');
            setErrorMsg('No source URL provided');
            return;
        }
        const run = async () => {
            try {
                const res = await fetch(`/api/embed/topic-detector?source=${encodeURIComponent(sourceUrl)}`);
                if (!res.ok) throw new Error(`Detector failed ${res.status}`);
                const data = await res.json();
                if (data.found) {
                    if (data.type === 'rationale') {
                        let rationaleId = data.rationaleId;

                        let match = rationaleId.match(/\/rationale\/([a-zA-Z0-9_-]+)/);
                        if (match) {
                            rationaleId = match[1];
                        } else if (rationaleId.includes('http')) {
                            const parts = rationaleId.split('/');
                            rationaleId = parts[parts.length - 1];
                        }

                        router.replace(`/embed/rationale/${rationaleId}`);
                    } else if (data.type === 'topic' && data.topicId) {
                        const tid = data.topicId as string;
                        const encoded = /^\d+$/.test(tid) ? encodeId(Number(tid)) : tid;
                        router.replace(`/embed/topic/${encoded}`);
                    }
                } else {
                    setStatus('prompt');
                }
            } catch (err: any) {
                setStatus('error');
                setErrorMsg(err.message);
            }
        };
        run();
    }, [sourceUrl, router]);

    const sanitizeText = (text: string) => {
        if (!text || typeof text !== 'string') return 'New Topic';

        return text
            .replace(/[<>&"'`(){}[\]\\|;:]/g, '') // Remove HTML/JS injection and other dangerous chars
            .replace(/[^\w\s-]/g, '') // Keep only alphanumeric, spaces, hyphens
            .replace(/\s+/g, ' ') // Normalize whitespace
            .substring(0, 100) // Limit length
            .trim();
    };

    const isValidUrl = (url: string): boolean => {
        if (!url || typeof url !== 'string') return false;

        try {
            const parsedUrl = new URL(url);
            const hostname = parsedUrl.hostname.toLowerCase();

            if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                return false;
            }

            if (hostname === 'forum.scroll.io') return true;

            // Allow localhost for development
            if (process.env.NODE_ENV !== 'production' &&
                (hostname === 'localhost' || hostname === '127.0.0.1')) {
                return true;
            }

            return false;
        } catch {
            return false;
        }
    };

    const handleCreate = async () => {
        try {
            if (!isValidUrl(sourceUrl)) {
                setStatus('error');
                setErrorMsg('Invalid source URL. Only forum.scroll.io URLs are allowed.');
                return;
            }

            setStatus('loading');
            let title = 'New Topic';
            const m = sourceUrl.match(/\/t\/([^/]+)/);
            if (m && m[1]) {
                try {
                    const decodedTitle = decodeURIComponent(m[1]);
                    const sanitizedTitle = sanitizeText(decodedTitle);
                    if (sanitizedTitle.length > 0) {
                        title = sanitizedTitle
                            .replace(/-/g, ' ')
                            .replace(/\b\w/g, c => c.toUpperCase());
                    }
                } catch (e) {
                    console.warn('Failed to decode URL component:', e);
                }
            }

            const res = await fetch('/api/embed/create-topic', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sourceUrl, title })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || 'Failed to create topic');
            }

            const data = await res.json();
            if (!data.topicId) {
                throw new Error('Invalid response from server');
            }

            router.replace(`/embed/topic/${data.topicId}`);
        } catch (err: any) {
            setStatus('error');
            setErrorMsg(err.message || 'An unexpected error occurred');
        }
    };

    if (status === 'loading') return (
        <div style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            padding: '24px 20px',
            textAlign: 'center',
            color: '#1e293b',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '180px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
            <div
                style={{
                    width: '40px',
                    height: '40px',
                    border: '3px solid #e2e8f0',
                    borderTop: '3px solid #3b82f6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginBottom: '20px'
                }}
            />
            <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '6px', letterSpacing: '-0.025em' }}>
                Analyzing Post
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
                Detecting topics and rationales
            </div>
            <style>
                {`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}
            </style>
        </div>
    );
    if (status === 'error') return (
        <div style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            padding: '24px 20px',
            textAlign: 'center',
            color: '#dc2626',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
        }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
            <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Something went wrong</div>
            <div style={{ fontSize: '13px', color: '#7f1d1d' }}>{errorMsg}</div>
        </div>
    );
    return (
        <div style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            maxWidth: '480px',
            margin: '0 auto',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '32px 24px',
            background: '#f8fafc',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
            <div style={{ fontSize: '32px', marginBottom: '16px', opacity: 0.6 }}>💡</div>
            <h3 style={{
                marginBottom: '12px',
                fontSize: '18px',
                fontWeight: '600',
                color: '#1e293b',
                letterSpacing: '-0.025em'
            }}>Negation Game × Scroll</h3>
            <p style={{
                marginBottom: '24px',
                fontSize: '14px',
                color: '#64748b',
                lineHeight: '1.5'
            }}>This proposal is not yet a topic in Negation Game.</p>
            <button
                onClick={handleCreate}
                style={{
                    background: '#10b981',
                    color: '#fff',
                    padding: '12px 24px',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    fontFamily: 'inherit',
                    boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)',
                    transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                    e.currentTarget.style.background = '#059669';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(16, 185, 129, 0.3)';
                }}
                onMouseOut={(e) => {
                    e.currentTarget.style.background = '#10b981';
                    e.currentTarget.style.transform = 'translateY(0px)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(16, 185, 129, 0.2)';
                }}
            >
                Create Topic
            </button>
        </div>
    );
} 