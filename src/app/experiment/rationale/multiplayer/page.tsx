"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { nanoid } from "nanoid";

type MpDoc = { id: string; updatedAt: string; createdAt: string };

export default function MultiplayerRationaleIndexPage() {
  const [docs, setDocs] = useState<MpDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const createNew = () => {
    const id = nanoid();
    window.location.href = `/experiment/rationale/multiplayer/${id}`;
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/experimental/rationales`);
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        setDocs(json.docs || []);
      } catch (e: any) {
        setError(e?.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="fixed inset-0 top-16 bg-gray-50">
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Multiplayer Rationales</h1>
          <button onClick={createNew} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">New rationale</button>
        </div>
        {loading ? (
          <p className="text-gray-600">Loading…</p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : docs.length === 0 ? (
          <p className="text-gray-600">No rationales yet. Create the first one.</p>
        ) : (
          <ul className="space-y-2">
            {docs.map((d) => (
              <li key={d.id} className="bg-white border rounded p-3 flex items-center justify-between">
                <div>
                  <div className="font-mono text-sm">{d.id}</div>
                  <div className="text-xs text-gray-500">Updated {new Date(d.updatedAt).toLocaleString()}</div>
                </div>
                <Link href={`/experiment/rationale/multiplayer/${d.id}`} className="px-3 py-1 rounded bg-stone-800 text-white text-xs">Open</Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
