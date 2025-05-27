import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { CopyIcon, ClockIcon, InfoIcon, PlusCircleIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import type { PointInSpace } from '@/actions/points/fetchAllSpacePoints';


interface PreviewPointNodeStatusIndicatorsProps {
    isDuplicateOnCanvas: boolean;
    isPendingCheck: boolean;
    dbPointStatus: 'existing' | 'new';
    localExistingPointId?: number;
    encodedLocalId?: string | null;
    existingPointDetails: {
        cred: number;
        favor?: number;
        amountSupporters: number;
        amountNegations: number;
    } | null;
    matchingExistingPoints?: PointInSpace[];
    matchingDetails?: Record<number, { cred: number; favor?: number; amountSupporters: number; amountNegations: number } | null>;
    encodedLocalIds?: string[];
    currentSpacePath: string;
}

export const PreviewPointNodeStatusIndicators: React.FC<PreviewPointNodeStatusIndicatorsProps> = ({
    isDuplicateOnCanvas,
    isPendingCheck,
    dbPointStatus,
    localExistingPointId,
    encodedLocalId,
    existingPointDetails,
    matchingExistingPoints = [],
    matchingDetails = {},
    encodedLocalIds = [],
    currentSpacePath,
}) => {
    const [selectedIdx, setSelectedIdx] = useState(0);
    return (
        <>
            {isDuplicateOnCanvas && (
                <div className="absolute top-1 left-1">
                    <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                            <CopyIcon className="h-3.5 w-3.5 text-orange-500" />
                        </TooltipTrigger>
                        <TooltipContent side="top" onClick={(e) => e.stopPropagation()}>
                            <p>This content is duplicated in another node on the canvas. This is allowed, this is purely informational.</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
            )}

            {isPendingCheck && (
                <div className="absolute bottom-1.5 right-1.5">
                    <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-full hover:bg-accent cursor-help"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <ClockIcon className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" onClick={(e) => e.stopPropagation()}>
                            <p>Please save the rationale to check if this point already exists.</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
            )}

            {/* Multiple existing points match: keep single indicator and put arrows inside tooltip */}
            {!isPendingCheck && dbPointStatus === 'existing' && matchingExistingPoints.length > 1 && (() => {
                const len = matchingExistingPoints.length;
                const current = matchingExistingPoints[selectedIdx];
                const currentEncoded = encodedLocalIds[selectedIdx];
                const currentDetail = matchingDetails[current.id];
                const prev = () => setSelectedIdx((selectedIdx - 1 + len) % len);
                const next = () => setSelectedIdx((selectedIdx + 1) % len);
                return (
                    <div className="absolute bottom-1.5 right-1.5">
                        <Tooltip delayDuration={300}>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="relative h-7 w-7 rounded-full hover:bg-accent">
                                    <InfoIcon className="h-4 w-4 text-blue-500" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" onClick={(e) => e.stopPropagation()} className="max-w-xs">
                                <div className="flex items-center justify-between mb-2">
                                    <ChevronLeftIcon className="h-4 w-4 cursor-pointer text-muted-foreground" onClick={(e) => { e.stopPropagation(); prev(); }} />
                                    <p className="font-semibold text-center">{selectedIdx + 1} of {len}</p>
                                    <ChevronRightIcon className="h-4 w-4 cursor-pointer text-muted-foreground" onClick={(e) => { e.stopPropagation(); next(); }} />
                                </div>
                                <p className="text-xs">ID: {current.id} / {currentEncoded}</p>
                                {currentDetail ? (
                                    <div className="text-xs mt-1 space-y-0.5">
                                        <p>Cred: {currentDetail.cred}</p>
                                        <p>Favor: {Math.round(currentDetail.favor || 0)}</p>
                                        <p>Supporters: {currentDetail.amountSupporters}</p>
                                        <p>Negations: {currentDetail.amountNegations}</p>
                                    </div>
                                ) : (
                                    <p className="text-xs italic">Loading details...</p>
                                )}
                                <Link href={`/s/${currentSpacePath}/${currentEncoded}`} target="_blank" rel="noopener noreferrer" className="block text-xs mt-2 text-blue-500 hover:underline">
                                    View point &rarr;
                                </Link>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                );
            })()}

            {/* Single existing point match */}
            {!isPendingCheck && dbPointStatus === 'existing' && matchingExistingPoints.length <= 1 && localExistingPointId && encodedLocalId && (
                <div className="absolute bottom-1.5 right-1.5">
                    <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                            <Link href={`/s/${currentSpacePath}/${encodedLocalId}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="focus:outline-none">
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-accent">
                                    <InfoIcon className="h-4 w-4 text-blue-500" />
                                </Button>
                            </Link>
                        </TooltipTrigger>
                        <TooltipContent side="top" onClick={(e) => e.stopPropagation()} className="max-w-xs">
                            <p className="font-semibold">Existing Point</p>
                            <p className="text-xs">ID: {localExistingPointId} / {encodedLocalId}</p>
                            {existingPointDetails ? (
                                <div className="text-xs mt-1 space-y-0.5">
                                    <p>Cred: {existingPointDetails.cred}</p>
                                    <p>Favor: {Math.round(existingPointDetails.favor || 0)}</p>
                                    <p>Supporters: {existingPointDetails.amountSupporters}</p>
                                    <p>Negations: {existingPointDetails.amountNegations}</p>
                                </div>
                            ) : (
                                <p className="text-xs mt-1 italic">Loading details...</p>
                            )}
                            <Link href={`/s/${currentSpacePath}/${encodedLocalId}`} target="_blank" rel="noopener noreferrer" className="block text-xs mt-2 text-blue-500 hover:underline">
                                View point &rarr;
                            </Link>
                        </TooltipContent>
                    </Tooltip>
                </div>
            )}

            {!isPendingCheck && dbPointStatus === 'new' && (
                <div className="absolute bottom-1.5 right-1.5">
                    <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-full hover:bg-accent cursor-help"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <PlusCircleIcon className="h-4 w-4 text-green-500" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" onClick={(e) => e.stopPropagation()}>
                            <p>This will be created as a new point.</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
            )}
        </>
    );
}; 