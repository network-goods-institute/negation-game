import React from 'react';

interface MindchangeEditorProps {
  value: number;
  isSaving: boolean;
  edgeType?: string;
  onValueChange: (value: number) => void;
  onSave: () => void;
  onCancel: () => void;
  onClear?: () => void;
}

export const MindchangeEditor: React.FC<MindchangeEditorProps> = ({
  value,
  isSaving,
  edgeType,
  onValueChange,
  onSave,
  onCancel,
  onClear,
}) => {
  const isSupportEdge = edgeType === 'support';
  const isNegationEdge = edgeType === 'negation';

  return (
    <div className="flex items-center gap-3 transition-all duration-200 ease-out">
      <div className="relative flex items-center">
        <input
          type="number"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) onValueChange(Math.max(0, Math.min(100, Math.round(n))));
          }}
          className="w-20 border rounded px-2 py-1 text-xs pr-5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="absolute right-2 text-xs text-gray-500 pointer-events-none">%</span>
      </div>
      <button
        className="relative w-6 h-6 rounded-full overflow-hidden transition-all hover:opacity-80 active:scale-95 bg-white border-2 border-gray-300"
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          e.stopPropagation();
          const options = [10, 50, 100];
          const currentIndex = options.indexOf(value);
          const nextIndex = (currentIndex + 1) % options.length;
          onValueChange(options[nextIndex]);
        }}
        title="Toggle percentage"
      >
        <div
          className={`absolute bottom-0 left-0 right-0 transition-all duration-200 ${
            isSupportEdge ? 'bg-gradient-to-t from-emerald-500 to-emerald-400' :
            isNegationEdge ? 'bg-gradient-to-t from-rose-500 to-rose-400' :
            'bg-gradient-to-t from-blue-500 to-blue-400'
          }`}
          style={{ height: `${value}%` }}
        />
      </button>
      <button
        className="px-3 py-1.5 bg-gradient-to-b from-gray-800 to-gray-900 text-white rounded-lg text-xs font-semibold shadow-md hover:shadow-lg hover:from-gray-700 hover:to-gray-800 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
        onClick={(e) => { e.stopPropagation(); onSave(); }}
        disabled={isSaving}
      >
        {isSaving && (
          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
        )}
        {isSaving ? 'Saving...' : 'Save'}
      </button>
      <button
        className="px-3 py-1.5 border-2 border-gray-300 rounded-lg text-xs font-semibold hover:bg-gray-100 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); onCancel(); }}
        disabled={isSaving}
      >
        Cancel
      </button>
      {onClear && (
        <button
          className="px-3 py-1.5 border-2 border-rose-300 text-rose-700 rounded-lg text-xs font-semibold hover:bg-rose-50 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); if (!isSaving) onClear(); }}
          disabled={isSaving}
        >
          Clear
        </button>
      )}
    </div>
  );
};
