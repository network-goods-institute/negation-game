import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { CopyIcon, ClockIcon, InfoIcon, PlusCircleIcon } from 'lucide-react';

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
    currentSpacePath: string;
}

export const PreviewPointNodeStatusIndicators: React.FC<PreviewPointNodeStatusIndicatorsProps> = ({
    isDuplicateOnCanvas,
    isPendingCheck,
    dbPointStatus,
    localExistingPointId,
    encodedLocalId,
    existingPointDetails,
    currentSpacePath,
}) => (
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

        {!isPendingCheck && dbPointStatus === 'existing' && localExistingPointId && encodedLocalId && (
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