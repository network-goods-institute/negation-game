"use client";

import React from 'react';
import { useRouter } from 'next/navigation';

export const BoardNotFound: React.FC = () => {
  const router = useRouter();

  return (
    <div className="fixed inset-0 top-16 bg-gray-50 flex items-center justify-center">
      <div className="text-center bg-white px-8 py-6 rounded-lg border shadow-sm max-w-md">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Board Not Found</h2>
        <p className="text-gray-600 mb-4">
          The board you&apos;re looking for doesn&apos;t exist or may have been deleted.
        </p>
        <button
          onClick={() => router.push('/experiment/rationale/multiplayer')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Go to Boards List
        </button>
      </div>
    </div>
  );
};
