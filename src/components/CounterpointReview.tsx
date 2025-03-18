import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GOOD_ENOUGH_POINT_RATING } from "@/constants/config";
import { PointStats } from "@/components/PointStats";
import {
    AlertTriangleIcon,
    CircleCheckBigIcon,
    SparklesIcon,
    SquarePenIcon,
    CircleIcon,
    UserIcon,
    BrainCircuitIcon,
    XIcon,
    ExternalLinkIcon,
    TrendingUpIcon,
} from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { DialogClose } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { encodeId } from "@/lib/encodeId";

export interface CounterpointCandidate {
    id: number;
    content: string;
    favor: number;
    amountNegations: number;
    amountSupporters: number;
    cred: number;
    isCounterpoint: boolean;
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
    suggestions: string[];
}

interface CounterpointReviewProps {
    reviewResults: ReviewResults;
    counterpointContent: string;
    setCounterpointContent: (content: string) => void;
    selectCounterpointCandidate: (candidate: CounterpointCandidate | undefined) => void;
    setGuidanceNotes: (notes: ReactNode | undefined) => void;
    onClose: () => void;
}

const getPointUrl = (pointId: number) => `${encodeId(pointId)}`;

export const CounterpointReview: React.FC<CounterpointReviewProps> = ({
    reviewResults,
    counterpointContent,
    setCounterpointContent,
    selectCounterpointCandidate,
    setGuidanceNotes,
    onClose,
}) => {
    return (
        <div className="flex flex-col w-full h-full max-h-[80vh] overflow-hidden relative">
            <div className="absolute top-4 right-4 z-10">
                <DialogClose asChild>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8 p-0">
                        <XIcon className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                    </Button>
                </DialogClose>
            </div>

            <div className="p-6 overflow-auto flex-grow">
                <h3 className="text-xl font-semibold text-center mb-6">
                    Choose a Counterpoint Approach
                </h3>

                {/* Existing Points Section */}
                {reviewResults.existingSimilarCounterpoints.length > 0 && (
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-3">
                            <CircleIcon className="text-primary size-5" />
                            <h4 className="text-md font-medium">Endorse an Existing Point</h4>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                            These points already exist. Endorsing them adds your cred behind their argument.
                        </p>
                        <div className="space-y-3">
                            {reviewResults.existingSimilarCounterpoints?.map(
                                (counterpointCandidate) => (
                                    <div
                                        key={counterpointCandidate.id}
                                        className="flex flex-col gap-3 p-4 w-full bg-background cursor-pointer border rounded-md transition-colors shadow-sm hover:border-primary hover:ring-1 hover:ring-primary relative"
                                        onClick={(e) => {
                                            // Don't trigger selection if clicking the external link
                                            if ((e.target as HTMLElement).closest('.external-link-btn')) {
                                                return;
                                            }
                                            selectCounterpointCandidate(counterpointCandidate);
                                            onClose();
                                        }}
                                    >
                                        {/* Favor chip - high visibility */}
                                        <div className="absolute -top-2 -right-2 z-10">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className={cn(
                                                        "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shadow-sm",
                                                        counterpointCandidate.favor > 7 ? "bg-green-100 text-green-800 border border-green-300" :
                                                            counterpointCandidate.favor > 4 ? "bg-blue-100 text-blue-800 border border-blue-300" :
                                                                "bg-gray-100 text-gray-800 border border-gray-300"
                                                    )}>
                                                        <TrendingUpIcon className="size-3" />
                                                        <span>{counterpointCandidate.favor}</span>
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent side="top">
                                                    <p>Favor: {counterpointCandidate.favor}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>

                                        <div className="flex justify-between items-start">
                                            <span className="flex-grow text-md font-medium">
                                                {counterpointCandidate.content}
                                            </span>
                                            <div className="flex items-center gap-2 ml-2">
                                                <Badge className="bg-primary/15 text-primary border-primary hover:bg-primary/20 whitespace-nowrap">
                                                    Existing
                                                </Badge>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 p-0 rounded-full external-link-btn"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                window.open(getPointUrl(counterpointCandidate.id), '_blank', 'noopener,noreferrer');
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
                                            favor={counterpointCandidate.favor}
                                            amountNegations={counterpointCandidate.amountNegations}
                                            amountSupporters={counterpointCandidate.amountSupporters}
                                            cred={counterpointCandidate.cred}
                                        />
                                    </div>
                                )
                            )}
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
                                    onClick={() => {
                                        setGuidanceNotes(
                                            <>
                                                <SquarePenIcon className="size-3 align-[-1.5px] inline-block" />{" "}
                                                {counterpointContent}{" "}
                                                <Button
                                                    variant={"link"}
                                                    className="text-xs size-fit inline-block p-0 font-normal underline underline-offset-1 ml-1"
                                                    onClick={() => {
                                                        setCounterpointContent(counterpointContent);
                                                        setGuidanceNotes(undefined);
                                                    }}
                                                >
                                                    restore
                                                </Button>
                                            </>
                                        );
                                        setCounterpointContent(suggestion);
                                        onClose();
                                    }}
                                    className="relative flex flex-col gap-2 p-4 w-full bg-background cursor-pointer border border-dashed rounded-md transition-colors shadow-sm hover:border-blue-500 hover:ring-1 hover:ring-blue-500"
                                >
                                    <div className="flex justify-between items-start">
                                        <span className="flex-grow text-md">
                                            {suggestion}
                                        </span>
                                        <Badge className="bg-blue-500/15 text-blue-500 border-blue-500 hover:bg-blue-500/20 whitespace-nowrap ml-2">
                                            <SparklesIcon className="size-3 mr-1" /> AI Suggestion
                                        </Badge>
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
                        onClick={() => {
                            setGuidanceNotes(
                                reviewResults.rating < GOOD_ENOUGH_POINT_RATING ? (
                                    <>
                                        <AlertTriangleIcon className="size-3 align-[-1.5px] inline-block" />{" "}
                                        {reviewResults.feedback}
                                        <Button
                                            variant={"link"}
                                            className="text-xs size-fit inline-block p-0 font-normal underline underline-offset-1 ml-1"
                                            onClick={() => {
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
                                {reviewResults.rating < GOOD_ENOUGH_POINT_RATING ? "Needs Work" : "Your Text"}
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
                                        That&apos;s a good counterpoint
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