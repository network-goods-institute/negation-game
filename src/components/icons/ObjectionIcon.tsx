import React from "react";

export const ObjectionIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <circle cx={12} cy={12} r={10} />
        <line x1={8} y1={16} x2={16} y2={8} />
    </svg>
); 