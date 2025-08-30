'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function NewMultiplayerRationalePage() {
    const router = useRouter();
    const [title, setTitle] = React.useState('');
    const [error, setError] = React.useState<string | null>(null);

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        const t = title.trim();
        if (!t) {
            setError('Please enter a title');
            return;
        }
        // Use timestamp-based id; title passed via query for initial seed
        const id = `m-${Date.now()}`;
        const q = new URLSearchParams({ title: t }).toString();
        router.push(`/experiment/rationale/multiplayer/${encodeURIComponent(id)}?${q}`);
    };

    return (
        <div className="fixed inset-0 top-16 bg-gray-50 flex items-center justify-center p-6">
            <form onSubmit={handleCreate} className="bg-white border rounded-lg shadow p-6 w-full max-w-md">
                <h1 className="text-lg font-semibold mb-3">Create Multiplayer Rationale</h1>
                <label className="block text-sm text-stone-700 mb-1">Title</label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); if (error) setError(null); }}
                    placeholder="Enter rationale title"
                    className="w-full border rounded px-3 py-2 mb-2"
                    autoFocus
                />
                {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
                <div className="flex gap-2 justify-end mt-2">
                    <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50" disabled={!title.trim()}>Create</button>
                </div>
            </form>
        </div>
    );
}


