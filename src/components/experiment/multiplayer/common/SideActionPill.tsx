import React from 'react';

interface SideActionPillProps {
    label: string;
    visible: boolean;
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
    colorClass?: string;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    onForceHide?: () => void;
    side?: 'left' | 'right';
}

export const SideActionPill: React.FC<SideActionPillProps> = ({
    label,
    visible,
    onClick,
    colorClass = 'bg-stone-900',
    onMouseEnter,
    onMouseLeave,
    side = 'right',
    onForceHide,
}) => {
    const leaveTimerRef = React.useRef<number | null>(null);
    const interactable = visible;
    const justifyClass = side === 'left' ? 'justify-start' : 'justify-end';
    const hoverTranslateClass = side === 'left' ? 'hover:-translate-x-0.5' : 'hover:translate-x-0.5';
    const hiddenOffsetClass = side === 'left' ? '-translate-x-1' : 'translate-x-1';

    const handleEnter = () => {
        if (leaveTimerRef.current) {
            clearTimeout(leaveTimerRef.current);
            leaveTimerRef.current = null;
        }
        if (interactable) {
            onMouseEnter?.();
        }
    };

    const handleLeave = () => {
        if (!interactable) return;
        if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
        leaveTimerRef.current = window.setTimeout(() => {
            onMouseLeave?.();
            leaveTimerRef.current = null;
        }, 140);
    };

    const sidePosClass = side === 'left' ? 'left-[-72px]' : 'right-[-96px]';
    const hiddenTranslate = side === 'left' ? '-translate-x-3 opacity-0' : '-translate-x-4 opacity-0';

    return (
        <div
            className={`absolute ${sidePosClass} top-1/2 -translate-y-1/2 flex h-[120px] w-[112px] items-center ${justifyClass} transition-[opacity,transform] duration-200 ease-out ${visible ? 'translate-x-0 opacity-100' : hiddenTranslate}`}
            style={{ zIndex: visible ? 40 : 0, pointerEvents: interactable ? 'auto' : 'none' }}
        >
            <button
                type="button"
                onMouseDown={(e) => { e.stopPropagation(); }}
                onClick={(e) => {
                    e.stopPropagation();
                    onClick(e);
                    onMouseLeave?.();
                    onForceHide?.();
                }}
                onMouseEnter={interactable ? handleEnter : undefined}
                onMouseLeave={interactable ? handleLeave : undefined}
                className={`${colorClass} rounded-full min-h-8 min-w-8 px-3 py-1 text-[11px] md:text-[12px] whitespace-nowrap font-medium text-white shadow-sm transition-all duration-200 ${visible ? 'opacity-100' : 'opacity-0'} ${visible ? '' : hiddenOffsetClass} ${interactable ? hoverTranslateClass : ''}`}
                style={{ pointerEvents: interactable ? 'auto' : 'none' }}
                aria-label={label}
            >
                {label}
            </button>
        </div>
    );
};

export default SideActionPill;


