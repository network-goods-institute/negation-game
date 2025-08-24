"use client";
import Link from "next/link";
import { nanoid } from "nanoid";

export default function MultiplayerRationaleIndexPage() {
  const createNew = () => {
    const id = nanoid();
    window.location.href = `/experiment/rationale/multiplayer/${id}`;
  };
  return (
    <div className="fixed inset-0 top-16 bg-gray-50">
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Multiplayer Rationales</h1>
        <p className="text-gray-600 mb-6">Create a new local multiplayer rationale.</p>
        <button onClick={createNew} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">New rationale</button>
      </div>
    </div>
  );
}
