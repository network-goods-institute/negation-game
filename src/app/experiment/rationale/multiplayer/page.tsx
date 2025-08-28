"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { nanoid } from "nanoid";
import { usePrivy } from "@privy-io/react-auth";
import { Roboto_Slab } from 'next/font/google';

const robotoSlab = Roboto_Slab({ subsets: ['latin'] });

type MpDoc = { id: string; updatedAt: string; createdAt: string };

export default function MultiplayerRationaleIndexPage() {
  const { authenticated, ready, login } = usePrivy();
  const [docs, setDocs] = useState<MpDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createNew = () => {
    const id = nanoid();
    window.location.href = `/experiment/rationale/multiplayer/${id}`;
  };

  const deleteDoc = async (docId: string) => {
    if (!confirm(`Delete rationale ${docId}? This cannot be undone.`)) return;
    
    try {
      const res = await fetch(`/api/experimental/rationales/${docId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setDocs(docs.filter(d => d.id !== docId));
      } else {
        alert('Failed to delete rationale');
      }
    } catch (e) {
      alert('Failed to delete rationale');
    }
  };

  useEffect(() => {
    if (!ready || !authenticated) return;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/experimental/rationales`);
        if (!res.ok) {
          const errorText = await res.text();
          if (res.status === 401) {
            setError("Authentication required. Please log in.");
          } else if (res.status === 404) {
            setError("Multiplayer experiment is not enabled.");
          } else {
            setError(errorText || "Failed to load rationales");
          }
          return;
        }
        const json = await res.json();
        setDocs(json.docs || []);
      } catch (e: any) {
        setError(e?.message || "Failed to load rationales");
      } finally {
        setLoading(false);
      }
    })();
  }, [ready, authenticated]);

  if (!ready) {
    return (
      <div className="fixed inset-0 top-16 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="fixed inset-0 top-16 bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg border text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Login Required
          </h1>
          <p className="text-gray-600 mb-6">
            You need to be logged in to access the multiplayer rationale system.
          </p>
          <button
            onClick={login}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 top-16 bg-gray-50 ${robotoSlab.className}`}>
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Multiplayer Rationales</h1>
          <button onClick={createNew} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">New rationale</button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-gray-600">Loading rationales...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
          </div>
        ) : docs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">No rationales yet. Create the first one.</p>
            <button onClick={createNew} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Create First Rationale</button>
          </div>
        ) : (
          <ul className="space-y-2">
            {docs.map((d) => (
              <li key={d.id} className="bg-white border rounded p-3 flex items-center justify-between">
                <div>
                  <div className="font-mono text-sm">{d.id}</div>
                  <div className="text-xs text-gray-500">Updated {new Date(d.updatedAt).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/experiment/rationale/multiplayer/${d.id}`} className="px-3 py-1 rounded bg-stone-800 text-white text-xs">Open</Link>
                  <button 
                    onClick={() => deleteDoc(d.id)}
                    className="px-3 py-1 rounded bg-red-600 text-white text-xs hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
