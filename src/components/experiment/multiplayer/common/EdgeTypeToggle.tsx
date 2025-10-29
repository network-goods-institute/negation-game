import React from 'react';

interface EdgeTypeToggleProps {
  edgeType: string;
  onToggle: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export const EdgeTypeToggle: React.FC<EdgeTypeToggleProps> = ({
  edgeType,
  onToggle,
  onMouseEnter,
  onMouseLeave,
}) => {
  const isSupportEdge = edgeType === "support";
  const isNegationEdge = edgeType === "negation";
  const activeEdgeLabel = isSupportEdge ? "Supports" : isNegationEdge ? "Negates" : null;
  const activeEdgeTone = isSupportEdge ? "text-emerald-600" : isNegationEdge ? "text-rose-600" : "text-stone-500";

  return (
    <div className="flex items-center gap-3 text-xs select-none relative">
      {activeEdgeLabel && (
        <span className={`font-bold tracking-tight ${activeEdgeTone}`}>{activeEdgeLabel}</span>
      )}
      <div
        data-testid="toggle-edge-type"
        role="button"
        tabIndex={0}
        data-interactive="true"
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-gray-300/50 shadow-inner transition-all duration-200 ${
          edgeType === "support" ? "bg-gradient-to-r from-emerald-400 to-emerald-500" : "bg-gradient-to-r from-rose-400 to-rose-500"
        }`}
        onClickCapture={(e) => { e.stopPropagation(); onToggle(); }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div className={`pointer-events-none flex items-center justify-center h-5 w-5 rounded-full bg-white shadow-md transition-all duration-200 ${
          edgeType === "support" ? "translate-x-5" : "translate-x-0.5"
        }`}>
          <div style={{ position: "relative", width: "12px", height: "12px" }}>
            {edgeType === "support" ? (
              <>
                <div style={{ position: "absolute", left: "50%", top: "50%", width: "10px", height: "2px", backgroundColor: "#10b981", transform: "translate(-50%, -50%) rotate(0deg)", borderRadius: "1px" }} />
                <div style={{ position: "absolute", left: "50%", top: "50%", width: "10px", height: "2px", backgroundColor: "#10b981", transform: "translate(-50%, -50%) rotate(90deg)", borderRadius: "1px" }} />
              </>
            ) : (
              <div style={{ position: "absolute", left: "50%", top: "50%", width: "10px", height: "2px", backgroundColor: "#f43f5e", transform: "translate(-50%, -50%) rotate(0deg)", borderRadius: "1px" }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
