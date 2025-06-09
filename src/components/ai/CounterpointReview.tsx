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
        <div className="flex flex-col w-full h-full max-h-[80vh] overflow-hidden relative">
            <div className="absolute top-4 right-4 z-10">
                <DialogClose asChild>
                    <Button variant="ghost" size="icon" onClick={(e) => { console.log('CounterpointReview: close dialog clicked'); onClose(); }} className="rounded-full h-8 w-8 p-0">
                        <XIcon className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                    </Button>
                </DialogClose>
            </div>

            <div className="p-6 overflow-auto flex-grow">
                <h3 className="text-xl font-semibold text-center mb-6">
                    {isObjection ? "Choose an Objection Approach" : "Choose a Counterpoint Approach"}
                </h3>

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

                {/* Existing Points Section */}
                {reviewResults.existingSimilarCounterpoints.length > 0 && (
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-3">
                            <CircleIcon className="text-primary size-5" />
                            <h4 className="text-md font-medium">Reuse an Existing Point</h4>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                            Do these mean the same thing as your point? Reusing points gets you the most influence.
                        </p>
                        <div className="space-y-3">
                            {reviewResults.existingSimilarCounterpoints.map((candidate) => (
                                <div
                                    key={candidate.id}
                                    className="flex flex-col gap-3 p-4 w-full bg-background cursor-pointer border rounded-md transition-colors shadow-sm hover:border-primary hover:ring-1 hover:ring-primary relative"
                                    onClick={(e) => {
                                        console.log('CounterpointReview: existing counterpoint selected', candidate);
                                        e.stopPropagation();
                                        if ((e.target as HTMLElement).closest('.external-link-btn')) {
                                            return;
                                        }
                                        selectCounterpointCandidate(candidate);
                                        onClose();
                                    }}
                                >
                                    {/* Favor chip - high visibility */}
                                    <div className="absolute -top-2 -right-2 z-10">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className={cn(
                                                    "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shadow-sm",
                                                    candidate.favor > 7 ? "bg-green-100 text-green-800 border border-green-300" :
                                                        candidate.favor > 4 ? "bg-blue-100 text-blue-800 border border-blue-300" :
                                                            "bg-gray-100 text-gray-800 border border-gray-300"
                                                )}>
                                                    <TrendingUpIcon className="size-3" />
                                                    <span>{candidate.favor}</span>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent side="top">
                                                <p>Favor: {candidate.favor}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <span className="text-md font-medium">
                                            {candidate.content}
                                        </span>

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
                                                                window.open(
                                                                    getPointUrl(candidate.id, currentSpace),
                                                                    '_blank',
                                                                    'noopener,noreferrer'
                                                                );
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

                                        <PointStats
                                            favor={candidate.favor}
                                            amountNegations={candidate.amountNegations}
                                            amountSupporters={candidate.amountSupporters}
                                            cred={candidate.cred}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Divider if both sections exist */}
                {reviewResults.existingSimilarCounterpoints.length > 0 &&
                    reviewResults.suggestions.length > 0 && (
                        <div className="flex items-center gap-3 my-4">
                            <div className="h-px bg-border flex-grow" />
                            <span className="text-sm text-muted-foreground font-medium">OR</span>
                            <div className="h-px bg-border flex-grow" />
                        </div>
                    )}

                {/* AI Suggestions Section */}
                {reviewResults.suggestions.length > 0 && (
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-3">
                            <BrainCircuitIcon className="text-blue-500 size-5" />
                            <h4 className="text-md font-medium">AI Suggestions (Optional)</h4>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                            These AI-crafted suggestions may better capture your intent.
                        </p>
                        <div className="space-y-3">
                            {reviewResults.suggestions.map((suggestion, i) => (
                                <div
                                    key={`rephrasing-${i}`}
                                    onClick={(e) => {
                                        console.log('CounterpointReview: AI suggestion clicked', suggestion);
                                        e.stopPropagation();
                                        onSelectSuggestion(suggestion.suggestion);
                                    }}
                                    className="relative flex flex-col gap-2 p-4 w-full bg-background cursor-pointer border border-dashed rounded-md transition-colors shadow-sm hover:border-blue-500 hover:ring-1 hover:ring-blue-500"
                                >
                                    {/* Container for text and badge, stacks vertically on mobile */}
                                    <div className="flex flex-col items-end sm:flex-row sm:justify-between sm:items-start">
                                        {/* Badge moved above text on mobile */}
                                        <Badge className="bg-blue-500/15 text-blue-500 border-blue-500 hover:bg-blue-500/20 whitespace-nowrap mb-2 sm:mb-0 order-first sm:order-last">
                                            <SparklesIcon className="size-3 mr-1" /> AI Suggestion
                                        </Badge>
                                        {/* Text takes full width on mobile */}
                                        <span className="w-full text-md">
                                            {suggestion.suggestion}
                                        </span>
                                    </div>
                                    <div className="flex items-center mt-2">
                                        <BrainCircuitIcon className="size-4 text-blue-500 mr-2 flex-shrink-0" />
                                        <span className="text-sm text-blue-500 font-medium">
                                            {suggestion.reason}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 text-center">
                            You can edit any suggestions after selecting them
                        </p>
                    </div>
                )}

                {/* Divider before user's text */}
                <div className="flex items-center gap-3 my-4">
                    <div className="h-px bg-border flex-grow" />
                    <span className="text-sm text-muted-foreground font-medium">OR</span>
                    <div className="h-px bg-border flex-grow" />
                </div>

                {/* User's Original Text Section */}
                <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                        <UserIcon className="text-green-500 size-5" />
                        <h4 className="text-md font-medium">Keep Your Original Text</h4>
                    </div>

                    <div
                        onClick={(e) => {
                            console.log('CounterpointReview: keep own text selected', { content: counterpointContent, rating: reviewResults.rating });
                            e.stopPropagation();
                            onSelectOwnText();
                            setGuidanceNotes(
                                reviewResults.rating < GOOD_ENOUGH_POINT_RATING ? (
                                    <>
                                        <AlertTriangleIcon className="size-3 align-[-1.5px] inline-block" />{" "}
                                        {reviewResults.feedback}
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
                        className={cn(
                            "relative flex flex-col p-4 w-full shadow-sm bg-background cursor-pointer border rounded-md transition-colors",
                            reviewResults.rating < GOOD_ENOUGH_POINT_RATING
                                ? "border-yellow-500 border-dashed hover:border-yellow-500 hover:ring-1 hover:ring-yellow-500"
                                : "border-green-500 border-dashed hover:border-green-500 hover:ring-1 hover:ring-green-500"
                        )}
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex-grow relative">
                                <div className="text-md">
                                    {counterpointContent}
                                </div>
                            </div>
                            <Badge className={cn(
                                "border whitespace-nowrap ml-2",
                                reviewResults.rating < GOOD_ENOUGH_POINT_RATING
                                    ? "bg-yellow-500/15 text-yellow-500 border-yellow-500 hover:bg-yellow-500/20"
                                    : "bg-green-500/15 text-green-500 border-green-500 hover:bg-green-500/20"
                            )}>
                                {reviewResults.rating < GOOD_ENOUGH_POINT_RATING ? "Needs Work" : isObjection ? "Your Objection" : "Your Counterpoint"}
                            </Badge>
                        </div>

                        <div className="mt-3 flex items-center">
                            {reviewResults.rating < GOOD_ENOUGH_POINT_RATING ? (
                                <>
                                    <AlertTriangleIcon className="size-4 text-yellow-500 mr-2 flex-shrink-0" />
                                    <span className="text-sm text-yellow-500">
                                        {reviewResults.feedback}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <CircleCheckBigIcon className="size-4 text-green-500 mr-2 flex-shrink-0" />
                                    <span className="text-sm text-green-500">
                                        That&apos;s a good {isObjection ? "objection" : "counterpoint"}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CounterpointReview; 