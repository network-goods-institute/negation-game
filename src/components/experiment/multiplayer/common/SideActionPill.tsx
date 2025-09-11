import React from 'react';

interface SideActionPillProps {
    label: string;
    visible: boolean;
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
    colorClass?: string;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    side?: 'left' | 'right';
}

export const SideActionPill: React.FC<SideActionPillProps> = ({
    label,
    visible,
    onClick,
    colorClass = 'bg-stone-800',
    onMouseEnter,
    onMouseLeave,
    side = 'right',
}) => {
    const leaveTimerRef = React.useRef<number | null>(null);

    const handleEnter = () => {
        if (leaveTimerRef.current) {
            clearTimeout(leaveTimerRef.current);
            leaveTimerRef.current = null;
        }
        onMouseEnter?.();
    };

    const handleLeave = () => {
        if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
        leaveTimerRef.current = window.setTimeout(() => {
            onMouseLeave?.();
            leaveTimerRef.current = null;
        }, 140);
    };

    const sidePosClass = side === 'left' ? 'left-[-96px]' : 'right-[-56px]';
    const bridgeClass = side === 'left' ? '-left-10' : '-right-6';
    const hiddenTranslate = side === 'left' ? 'translate-x-2' : 'translate-x-2';

    return (
        <div
            className={`absolute ${sidePosClass} top-1/2 -translate-y-1/2 transition-transform duration-300 ease-out ${visible ? 'translate-x-0' : hiddenTranslate}`}
            style={{ zIndex: visible ? 30 : 0 }}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
        >
            <div className={`absolute ${bridgeClass} top-1/2 -translate-y-1/2 h-[200px] w-6 pointer-events-none`} />
            <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => { e.stopPropagation(); onClick(e); }}
                className={`${colorClass} rounded-full min-h-8 min-w-8 px-3 py-1 text-[11px] md:text-[12px] whitespace-nowrap font-medium text-white shadow-sm ${visible ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
                aria-label={label}
            >
                {label}
            </button>
        </div>
    );
};

export default SideActionPill;


