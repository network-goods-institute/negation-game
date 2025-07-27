'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { encodeId } from '@/lib/negation-game/encodeId';

interface Props { sourceUrl: string; }

export default function SourceEmbedClient({ sourceUrl }: Props) {
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

    const handleCreate = async () => {
        try {
            setStatus('loading');
            let title = 'New Topic';
            const m = sourceUrl.match(/\/t\/([^/]+)/);
            if (m && m[1]) title = decodeURIComponent(m[1]).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            const res = await fetch('/api/embed/create-topic', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sourceUrl, title })
            });
            if (!res.ok) throw new Error('Failed to create topic');
            const data = await res.json();
            router.replace(`/embed/topic/${data.topicId}`);
        } catch (err: any) {
            setStatus('error');
            setErrorMsg(err.message);
        }
    };

    if (status === 'loading') return (
        <div style={{
            fontFamily: 'sans-serif',
            padding: 20,
            textAlign: 'center',
            color: '#1e293b',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '150px'
        }}>
            <div
                style={{
                    width: '32px',
                    height: '32px',
                    border: '3px solid #e2e8f0',
                    borderTop: '3px solid #0088cc',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginBottom: '16px'
                }}
            />
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: '4px' }}>
                Analyzing Post
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
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
    if (status === 'error') return <div style={{ fontFamily: 'sans-serif', padding: 20, textAlign: 'center', color: 'red' }}>{errorMsg}</div>;
    return (
        <div style={{ fontFamily: 'sans-serif', maxWidth: 500, margin: '40px auto', border: '1px solid #e5e7eb', borderRadius: 8, padding: 24, background: '#f8fafc', textAlign: 'center' }}>
            <h3 style={{ marginBottom: 8 }}>Negation Game × Scroll</h3>
            <p style={{ marginBottom: 16 }}>This proposal is not yet a topic in Negation Game.</p>
            <button onClick={handleCreate} style={{ background: '#10b981', color: '#fff', padding: '10px 20px', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Create Topic</button>
        </div>
    );
} 