import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { ExpandablePoint } from "./expandDialogTypes";

interface ExpandPointDialogSearchProps {
    isMobile: boolean;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    points: ExpandablePoint[];
    setSelectedPoints: (points: Set<number>) => void;
    effectiveExpandedPointIds: Set<number>;
}

export const ExpandPointDialogSearch: React.FC<ExpandPointDialogSearchProps> = ({
    isMobile,
    searchTerm,
    setSearchTerm,
    points,
    setSelectedPoints,
    effectiveExpandedPointIds
}) => {
    return (
        <div className={cn(
            "border-b bg-muted/10",
            isMobile ? "px-2 py-2" : "px-3 py-3"
        )}>
            <div className="relative flex items-center">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search for points..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={cn(
                        "pl-9 pr-9 focus-visible:ring-primary focus-visible:ring-offset-0",
                        isMobile ? "h-7 text-xs" : "h-9"
                    )}
                />
                {searchTerm && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "absolute right-1 top-1/2 transform -translate-y-1/2",
                            isMobile ? "h-5 w-5" : "h-7 w-7"
                        )}
                        onClick={() => setSearchTerm('')}
                    >
                        <XIcon className={isMobile ? "h-2 w-2" : "h-3 w-3"} />
                    </Button>
                )}
            </div>
            <div className="flex justify-between mt-2">
                <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                        isMobile ? "h-6 text-[10px] px-2" : "h-7 text-xs"
                    )}
                    onClick={() => {
                        const newSelectedPoints = new Set<number>();
                        points.forEach(point => {
                            if (!effectiveExpandedPointIds.has(point.pointId)) {
                                newSelectedPoints.add(point.pointId);
                            }
                        });
                        setSelectedPoints(newSelectedPoints);
                    }}
                >
                    Select All
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                        isMobile ? "h-6 text-[10px] px-2" : "h-7 text-xs"
                    )}
                    onClick={() => setSelectedPoints(new Set())}
                >
                    Unselect All
                </Button>
            </div>
        </div>
    );
}; 