import React from 'react';

export const BoardLoading: React.FC = () => {
  return (
    <div className="fixed inset-0 top-16 bg-gray-50/80 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(249, 250, 251, 0.8)' }}>
      <div className="text-center bg-white/80 px-6 py-4 rounded-lg border shadow-sm">
        <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <div className="text-sm text-gray-600">Loading board…</div>
      </div>
    </div>
  );
};
