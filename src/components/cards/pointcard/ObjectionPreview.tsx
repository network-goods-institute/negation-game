"use client";

import React, { useState, useRef, useCallback } from "react";
import { PointCard } from "@/components/cards/PointCard";
import { ObjectionIcon } from "@/components/icons/ObjectionIcon";
import { usePointDataById } from "@/queries/points/usePointDataById";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Link from "next/link";
import { getPointUrl } from "@/lib/negation-game/getPointUrl";
import { encodeId } from "@/lib/negation-game/encodeId";
import { useQuery } from "@tanstack/react-query";
import { fetchObjectionContext } from "@/actions/points/fetchObjectionContext";
import { useSetAtom } from "jotai";
import { negatedPointIdAtom } from "@/atoms/negatedPointIdAtom";

interface ObjectionPreviewProps {
    children: React.ReactNode;
    objectionId: number;
    targetId: number;
    space?: string;
}

export const ObjectionPreview: React.FC<ObjectionPreviewProps> = ({
    children,
    objectionId,
    targetId,
    space = 'global'
}) => {
    const { data: objectionPoint, isLoading: isLoadingObjection } = usePointDataById(objectionId);
    const { data: targetPoint, isLoading: isLoadingTarget } = usePointDataById(targetId);
    const setNegatedPointId = useSetAtom(negatedPointIdAtom);

    const { data: contextPointId } = useQuery({
        queryKey: ['objection-context', objectionId, targetId],
        queryFn: () => fetchObjectionContext(objectionId, targetId),
        enabled: !!objectionId && !!targetId
    });

    const { data: contextPoint, isLoading: isLoadingContext } = usePointDataById(contextPointId || undefined);
    const [isOpen, setIsOpen] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleMouseEnter = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setIsOpen(true);
    }, []);

    const handleMouseLeave = useCallback(() => {
        timeoutRef.current = setTimeout(() => {
            setIsOpen(false);
        }, 100);
    }, []);


    // Show the relationship: target counterpoint negating context point
    // This is what the objection point objects to
    const leftPoint = targetPoint; // counterpoint being objected to
    const rightPoint = contextPoint || null; // original point being defended

    const handleNegateInPreview = useCallback((pointId: number) => {
        setNegatedPointId(pointId);
        setIsOpen(false); // Close the popover after triggering negate
    }, [setNegatedPointId]);

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
                    {children}
                </div>
            </PopoverTrigger>
            <PopoverContent
                className="w-[600px] p-4"
                side="bottom"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium">
                            <Link
                                href={getPointUrl(objectionId, space)}
                                className="text-blue-500 hover:underline underline"
                            >
                                {objectionPoint?.content ? objectionPoint.content.substring(0, 40) + (objectionPoint.content.length > 40 ? '...' : '') :
                                    <span className="inline-block h-3 w-24 bg-blue-500/30 rounded animate-pulse" />
                                }
                            </Link>
                            {" "}argues that{" "}
                            <Link
                                href={getPointUrl(targetId, space)}
                                className="text-blue-500 hover:underline underline"
                            >
                                {leftPoint?.content ? leftPoint.content.substring(0, 40) + (leftPoint.content.length > 40 ? '...' : '') :
                                    <span className="inline-block h-3 w-24 bg-blue-500/30 rounded animate-pulse" />
                                }
                            </Link>
                            {" "}is not relevant to{" "}
                            {rightPoint ? (
                                <Link
                                    href={getPointUrl(rightPoint.pointId, space)}
                                    className="text-blue-500 hover:underline underline"
                                >
                                    {rightPoint.content.substring(0, 40) + (rightPoint.content.length > 40 ? '...' : '')}
                                </Link>
                            ) : (
                                "the topic"
                            )}
                        </h3>
                        <ObjectionIcon className="w-5 h-5 stroke-1 text-muted-foreground" />
                    </div>

                    <div className="flex items-start gap-8">
                        {/* Left point */}
                        <div className="flex-1">
                            {isLoadingTarget ? (
                                <div className="h-32 animate-pulse bg-muted rounded-lg" />
                            ) : leftPoint && (
                                <PointCard
                                    pointId={leftPoint.pointId}
                                    content={leftPoint.content}
                                    createdAt={leftPoint.createdAt}
                                    cred={leftPoint.cred}
                                    favor={leftPoint.favor}
                                    amountSupporters={leftPoint.amountSupporters}
                                    amountNegations={leftPoint.amountNegations}
                                    viewerContext={{
                                        viewerCred: leftPoint.viewerCred,
                                        viewerNegationsCred: leftPoint.viewerNegationsCred,
                                    }}
                                    linkDisabled
                                    className="border rounded-lg"
                                    onNegate={() => handleNegateInPreview(leftPoint.pointId)}
                                />
                            )}
                        </div>

                        {/* Arrow (only show if we have a right point or it's still loading) */}
                        {(rightPoint || isLoadingContext) && (
                            <div className="flex items-center self-center">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-muted-foreground">
                                    <path d="M5 12h14m-7-7l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        )}

                        {/* Right point (if exists or loading) */}
                        {(rightPoint || isLoadingContext) && (
                            <div className="flex-1">
                                {isLoadingContext ? (
                                    <div className="h-32 animate-pulse bg-muted rounded-lg" />
                                ) : rightPoint && (
                                    <PointCard
                                        pointId={rightPoint.pointId}
                                        content={rightPoint.content}
                                        createdAt={rightPoint.createdAt}
                                        cred={rightPoint.cred}
                                        favor={rightPoint.favor}
                                        amountSupporters={rightPoint.amountSupporters}
                                        amountNegations={rightPoint.amountNegations}
                                        viewerContext={{
                                            viewerCred: rightPoint.viewerCred,
                                            viewerNegationsCred: rightPoint.viewerNegationsCred,
                                        }}
                                        linkDisabled
                                        className="border rounded-lg"
                                        onNegate={() => handleNegateInPreview(rightPoint.pointId)}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}; 
