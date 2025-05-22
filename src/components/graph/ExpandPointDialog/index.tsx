import { useEffect, useRef } from 'react';
import { Portal } from '@radix-ui/react-portal';
import { useAtom } from 'jotai';
import { cn } from '@/lib/cn';
import { ExpandPointDialogHeader } from './ExpandPointDialogHeader';
import { ExpandPointDialogSearch } from './ExpandPointDialogSearch';
import { ExpandPointDialogList } from './ExpandPointDialogList';
import { ExpandPointDialogFooter } from './ExpandPointDialogFooter';
import { useExpandPointDialogState } from '@/hooks/useExpandPointDialogState';
import { useExpandPointDialogLayout } from '@/hooks/useExpandPointDialogLayout';
import { useExpandPointDialogEvents } from '@/hooks/useExpandPointDialogEvents';
import { expandDialogAtom, ExpandDialogState as ExternalExpandDialogState, ExpandablePoint as ExternalExpandablePoint } from './expandDialogTypes';

export type ExpandDialogState = ExternalExpandDialogState;
export type ExpandablePoint = ExternalExpandablePoint;
export { expandDialogAtom };

interface ExpandPointDialogProps {
    open: boolean;
    points: ExternalExpandablePoint[];
    onClose: () => void;
    parentNodeId: string;
    onSelectPoint: (point: ExternalExpandablePoint) => void;
}

export const ExpandPointDialog: React.FC<ExpandPointDialogProps> = ({
    open,
    points,
    onClose,
    parentNodeId,
    onSelectPoint
}) => {
    const [, setDialogState] = useAtom(expandDialogAtom);

    useEffect(() => {
        if (open) {
            setDialogState({
                isOpen: true,
                points,
                parentNodeId,
                onClose,
                onSelectPoint
            });
        }
    }, [open, points, parentNodeId, onClose, onSelectPoint, setDialogState]);

    return null;
};

export const GlobalExpandPointDialog: React.FC = () => {
    const modalRef = useRef<HTMLDivElement>(null);
    const stateHook = useExpandPointDialogState();
    const {
        dialogState,
        selectedPoints,
        setSelectedPoints,
        isSubmitting,
        setIsSubmitting,
        searchTerm,
        setSearchTerm,
        manuallyRemovedPoints,
        setManuallyRemovedPoints,
        visitedPoints,
        isMobile,
        effectiveExpandedPointIds,
        setLocalExpandedPointIds,
        filteredPoints,
        setForceUpdateCounter
    } = stateHook;

    const { position, modalSize, setPosition } = useExpandPointDialogLayout({
        isOpen: dialogState.isOpen,
        parentNodeId: dialogState.parentNodeId,
        isMobile,
        modalHeight: modalRef.current?.offsetHeight || 550,
    });

    const [, setAtomDialogState] = useAtom(expandDialogAtom);

    const eventHook = useExpandPointDialogEvents({
        dialogState,
        setDialogState: setAtomDialogState,
        selectedPoints,
        setSelectedPoints,
        manuallyRemovedPoints,
        setManuallyRemovedPoints,
        effectiveExpandedPointIds,
        setLocalExpandedPointIds,
        setForceUpdateCounter,
        position,
        setPosition,
        modalRef,
        setIsSubmitting,
    });

    useEffect(() => {
        if (modalRef.current && !isMobile) {
            const newWidth = Math.min(480, window.innerWidth - 40);
            // This might need to be part of the layout hook or handled differently
            // setModalSize(prev => ({ ...prev, width: newWidth }));
        }
    }, [dialogState.isOpen, isMobile]);

    if (!dialogState.isOpen) return null;

    return (
        <Portal>
            <div
                ref={modalRef}
                className={cn(
                    "fixed z-50 bg-background rounded-lg border-2 shadow-lg overflow-hidden flex flex-col",
                    isMobile && "border-primary"
                )}
                style={{
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                    width: `${modalSize.width}px`,
                    maxHeight: `${modalSize.height}px`,
                }}
                onMouseDown={eventHook.handleMouseDown}
                onTouchStart={eventHook.handleTouchStart}
            >
                <ExpandPointDialogHeader
                    isMobile={isMobile}
                    onClose={eventHook.handleClose}
                />
                <ExpandPointDialogSearch
                    isMobile={isMobile}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    points={dialogState.points}
                    setSelectedPoints={setSelectedPoints}
                    effectiveExpandedPointIds={effectiveExpandedPointIds}
                />
                <ExpandPointDialogList
                    isMobile={isMobile}
                    points={filteredPoints}
                    effectiveExpandedPointIds={effectiveExpandedPointIds}
                    selectedPoints={selectedPoints}
                    handlePointToggle={eventHook.handlePointToggle}
                    handleRemovePoint={eventHook.handleRemovePoint}
                    handleAddPoint={eventHook.handleAddPoint}
                    searchTerm={searchTerm}
                    dialogPosition={position}
                    visitedPoints={visitedPoints}
                    markPointAsRead={eventHook.markPointAsRead}
                    handleZoomToNode={eventHook.handleZoomToNode}
                />
                <ExpandPointDialogFooter
                    isMobile={isMobile}
                    onSubmit={eventHook.handleSubmit}
                    selectedPointsSize={selectedPoints.size}
                    isSubmitting={isSubmitting}
                />
            </div>
        </Portal>
    );
};

export default GlobalExpandPointDialog;