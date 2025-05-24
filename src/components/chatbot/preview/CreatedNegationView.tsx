import React from 'react';
import { usePointData } from '@/queries/points/usePointData';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, ExternalLinkIcon } from 'lucide-react';
import { PointCard } from '@/components/cards/PointCard';
import Link from 'next/link';
import { getPointUrl } from '@/lib/negation-game/getPointUrl';
import { useSpace } from '@/queries/space/useSpace';
import { useSetAtom } from 'jotai';
import { negatedPointIdAtom } from '@/atoms/negatedPointIdAtom';
import { usePrivy } from '@privy-io/react-auth';

interface CreatedNegationViewProps {
    originalPointId: number;
    counterpointId: number;
    onExitPreview: () => void;
}

export const CreatedNegationView: React.FC<CreatedNegationViewProps> =
    ({ originalPointId, counterpointId, onExitPreview }) => {

        const { data: spaceData } = useSpace();
        const { data: originalPoint, isLoading: isLoadingOriginal, error: errorOriginal } = usePointData(originalPointId);
        const { data: counterpoint, isLoading: isLoadingCounter, error: errorCounter } = usePointData(counterpointId);
        const setNegatedPointId = useSetAtom(negatedPointIdAtom);
        const { user: privyUser, login } = usePrivy();

        const isLoading = isLoadingOriginal || isLoadingCounter;
        const hasError = errorOriginal || errorCounter;

        const originalPointUrl = getPointUrl(originalPointId, spaceData?.id);
        const counterpointUrl = getPointUrl(counterpointId, spaceData?.id);

        const handleNegateOriginal = (e: React.MouseEvent<HTMLButtonElement>) => {
            e.preventDefault();
            if (!privyUser) {
                login();
                return;
            }
            setNegatedPointId(originalPointId);
            onExitPreview();
        };

        const handleNegateCounterpoint = (e: React.MouseEvent<HTMLButtonElement>) => {
            e.preventDefault();
            if (!privyUser) {
                login();
                return;
            }
            setNegatedPointId(counterpointId);
            onExitPreview();
        };

        return (
            <div className="p-6 flex flex-col items-center text-center gap-4">
                <CheckCircle className="w-12 h-12 text-green-500" />
                <h3 className="text-lg font-semibold">Negation Successful!</h3>

                {isLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin my-4 text-muted-foreground" />
                ) : hasError ? (
                    <p className="text-sm text-destructive mb-4">Error loading point details.</p>
                ) : (
                    <div className="w-full max-w-md space-y-4 text-left">
                        {originalPoint && (
                            <div className="relative">
                                <p className="text-xs text-muted-foreground mb-1 font-medium">Original Point</p>
                                <PointCard
                                    pointId={originalPointId}
                                    content={originalPoint.content}
                                    createdAt={new Date(originalPoint.createdAt)}
                                    cred={originalPoint.cred}
                                    favor={originalPoint.favor}
                                    amountSupporters={originalPoint.amountSupporters}
                                    amountNegations={originalPoint.amountNegations}
                                    linkDisabled={true}
                                    disablePopover={true}
                                    isNegation={false}
                                    onNegate={handleNegateOriginal}
                                    className="border rounded-md shadow-sm bg-card"
                                />
                                <Button variant="ghost" size="icon" className="absolute bottom-0 right-0 mb-1 mr-1 h-7 w-7" asChild>
                                    <Link href={originalPointUrl} target="_blank" rel="noopener noreferrer" title="View Original Point">
                                        <ExternalLinkIcon className="h-4 w-4 text-muted-foreground" />
                                    </Link>
                                </Button>
                            </div>
                        )}

                        {counterpoint && (
                            <div className="relative">
                                <p className="text-xs text-muted-foreground mb-1 font-medium">Negating Point</p>
                                <PointCard
                                    pointId={counterpointId}
                                    content={counterpoint.content}
                                    createdAt={new Date(counterpoint.createdAt)}
                                    cred={counterpoint.cred}
                                    favor={counterpoint.favor}
                                    amountSupporters={counterpoint.amountSupporters}
                                    amountNegations={counterpoint.amountNegations}
                                    linkDisabled={true}
                                    disablePopover={true}
                                    isNegation={true}
                                    onNegate={handleNegateCounterpoint}
                                    className="border rounded-md shadow-sm bg-card"
                                />
                                <Button variant="ghost" size="icon" className="absolute bottom-0 right-0 mb-1 mr-1 h-7 w-7" asChild>
                                    <Link href={counterpointUrl} target="_blank" rel="noopener noreferrer" title="View Negating Point">
                                        <ExternalLinkIcon className="h-4 w-4 text-muted-foreground" />
                                    </Link>
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                <Button onClick={onExitPreview}>Close</Button>
            </div>
        );
    }; 