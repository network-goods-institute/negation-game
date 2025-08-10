import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GOOD_ENOUGH_POINT_RATING } from "@/constants/config";
import { PointStats } from "../cards/pointcard/PointStats";
import {
    AlertTriangleIcon,
    CircleCheckBigIcon,
    SparklesIcon,
    CircleIcon,
    UserIcon,
    BrainCircuitIcon,
    XIcon,
    ExternalLinkIcon,
    TrendingUpIcon,
} from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { DialogClose } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getPointUrl } from "@/lib/negation-game/getPointUrl";
import { useCurrentSpace } from "@/hooks/utils/useCurrentSpace";
import ReviewSubmissionLayout from "@/components/review/ReviewSubmissionLayout";

export interface CounterpointCandidate {
    id: number;
    content: string;
    favor: number;
    amountNegations: number;
    amountSupporters: number;
    cred: number;
    isCounterpoint?: boolean;
    isObjection?: boolean;
    createdAt?: Date;
    createdBy?: string;
    similarity?: number;
    negationsCred?: number;
    restakesByPoint?: number;
    slashedAmount?: number;
    doubtedAmount?: number;
}

export interface ReviewResults {
    rating: number;
    feedback: string;
    existingSimilarCounterpoints: CounterpointCandidate[];
    suggestions: {
        suggestion: string;
        reason: string;
    }[];
}

interface CounterpointReviewProps {
    reviewResults: ReviewResults;
    counterpointContent: string;
    setCounterpointContent: (content: string) => void;
    selectCounterpointCandidate: (candidate: CounterpointCandidate | undefined) => void;
    setGuidanceNotes: (notes: ReactNode | undefined) => void;
    onClose: () => void;
    onSelectSuggestion: (suggestion: string) => void;
    onSelectOwnText: () => void;
    isObjection: boolean;
    contextPointContent?: string;
}

export const CounterpointReview: React.FC<CounterpointReviewProps> = ({
    reviewResults,
    counterpointContent,
    setCounterpointContent,
    selectCounterpointCandidate,
    setGuidanceNotes,
    onClose,
    onSelectSuggestion,
    onSelectOwnText,
    isObjection,
    contextPointContent,
}) => {
    const currentSpace = useCurrentSpace();
    return (
        <div className="flex flex-col w-full h-full">
            <div className="p-0">

                {/* Context Point Section for Objection Mode */}
                {isObjection && contextPointContent && (
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-3">
                            <CircleIcon className="text-muted-foreground size-5" />
                            <h4 className="text-md font-medium">Original Point Being Defended</h4>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                            Your objection argues that the negated point is irrelevant to this point.
                        </p>
                        <div className="p-4 w-full bg-background border rounded-md shadow-sm">
                            <p className="tracking-tight text-md @sm/point:text-lg">
                                {contextPointContent}
                            </p>
                        </div>
                    </div>
                )}

                <ReviewSubmissionLayout
                    title={isObjection ? "Choose an Objection Approach" : "Choose a Counterpoint Approach"}
                    existingHeader="Reuse an Existing Point"
                    existingItems={reviewResults.existingSimilarCounterpoints.map((candidate) => ({
                        key: `${candidate.id}`,
                        item: candidate,
                        onClick: () => {
                            selectCounterpointCandidate(candidate);
                            onClose();
                        },
                    }))}
                    renderExistingItem={(candidate) => (
                        <>
                            <div className="flex justify-end mb-1">
                                <div className="flex items-center gap-2">
                                    <Badge className="bg-primary/15 text-primary border-primary hover:bg-primary/20 whitespace-nowrap">
                                        {candidate.isObjection ? "Existing Objection" : "Existing Counterpoint"}
                                    </Badge>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 p-0 rounded-full external-link-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (!currentSpace) return;
                                                    window.open(getPointUrl(candidate.id, currentSpace), '_blank', 'noopener,noreferrer');
                                                }}
                                            >
                                                <ExternalLinkIcon className="h-3.5 w-3.5" />
                                                <span className="sr-only">Open in new tab</span>
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">
                                            <p>Open in new tab</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <span className="text-md font-medium">{candidate.content}</span>
                                <PointStats
                                    favor={candidate.favor}
                                    amountNegations={candidate.amountNegations}
                                    amountSupporters={candidate.amountSupporters}
                                    cred={candidate.cred}
                                />
                            </div>
                        </>
                    )}
                    suggestions={(reviewResults.suggestions || []).map((s) => ({ text: s.suggestion, reason: s.reason }))}
                    onRetry={() => {
                        // No-op; Negate Dialog handles re-trigger externally
                    }}
                    retryLabel="Review again"
                    originalText={counterpointContent}
                    isGoodEnough={reviewResults.rating >= GOOD_ENOUGH_POINT_RATING}
                    feedback={reviewResults.feedback}
                    originalPositiveLabel={isObjection ? "Your Objection" : "Your Counterpoint"}
                    onSelectOriginal={() => {
                        onSelectOwnText();
                        setGuidanceNotes(
                            reviewResults.rating < GOOD_ENOUGH_POINT_RATING ? (
                                <>
                                    <AlertTriangleIcon className="size-3 align-[-1.5px] inline-block" /> {reviewResults.feedback}
                                    <Button
                                        variant={"link"}
                                        className="text-xs size-fit inline-block p-0 font-normal underline underline-offset-1 ml-1"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setGuidanceNotes(undefined);
                                        }}
                                    >
                                        dismiss
                                    </Button>
                                </>
                            ) : undefined
                        );
                        selectCounterpointCandidate(undefined);
                        onClose();
                    }}
                />
            </div>
        </div>
    );
};

export default CounterpointReview; 