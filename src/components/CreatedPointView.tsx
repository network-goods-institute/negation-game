"use client";

import React from 'react';
import { usePointData } from '@/queries/usePointData';
import { PointCard } from '@/components/PointCard';
import { Loader } from '@/components/ui/loader';
import { encodeId } from '@/lib/encodeId';
import { DEFAULT_SPACE } from '@/constants/config';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ExternalLinkIcon } from 'lucide-react';
import { useSetAtom } from 'jotai';
import { negatedPointIdAtom } from '@/atoms/negatedPointIdAtom';
import { usePrivy } from '@privy-io/react-auth';

interface CreatedPointViewProps {
    pointId: number;
    spaceId: string;
    onClose: () => void;
}

export function CreatedPointView({ pointId, spaceId, onClose }: CreatedPointViewProps) {
    const { data: createdPointData, isLoading: isLoadingCreatedPoint } = usePointData(pointId);
    const setNegatedPointId = useSetAtom(negatedPointIdAtom);
    const { user: privyUser, login } = usePrivy();

    let pointUrl = "#";
    try {
        const effectiveSpaceId = spaceId || DEFAULT_SPACE;
        pointUrl = `/s/${effectiveSpaceId}/${encodeId(pointId)}`;
    } catch (e) {
        console.error("Failed to encode point ID for link:", e);
    }

    const handleNegateClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (!privyUser) {
            login();
            return;
        }
        setNegatedPointId(pointId);
    };

    return (
        <>
            {/* Content is wrapped by DialogContent in the parent */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4">
                {isLoadingCreatedPoint && (
                    <div className="flex justify-center items-center h-40">
                        <Loader />
                    </div>
                )}
                {createdPointData && (
                    <PointCard
                        pointId={pointId}
                        content={createdPointData.content}
                        createdAt={createdPointData.createdAt}
                        cred={createdPointData.cred}
                        amountSupporters={createdPointData.amountSupporters}
                        amountNegations={createdPointData.amountNegations}
                        favor={createdPointData.favor}
                        viewerContext={{ viewerCred: createdPointData.viewerCred }}
                        className="border rounded-md shadow-sm bg-card"
                        linkDisabled={true}
                        disablePopover={true}
                        onNegate={handleNegateClick}
                    />
                )}
                <div className="flex justify-between items-center mt-auto pt-4">
                    <Button variant="outline" asChild>
                        <Link href={pointUrl} target="_blank" rel="noopener noreferrer">
                            View Point
                            <ExternalLinkIcon className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                    <Button onClick={onClose}>Done</Button>
                </div>
            </div>
        </>
    );
} 