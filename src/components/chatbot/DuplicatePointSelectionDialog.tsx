import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@radix-ui/react-radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from '@tanstack/react-query';
import { fetchPoints } from '@/actions/fetchPoints';
import { PointCard } from '../PointCard';
import { Loader } from '../ui/loader';

export interface ConflictingPoint {
    previewNodeId: string;
    content: string;
    existingPoints: { id: number; content: string }[];
}

export type ResolvedMappings = Map<string, number | null>;

interface DuplicatePointSelectionDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    conflicts: ConflictingPoint[];
    onResolve: (mappings: ResolvedMappings) => void;
}

const ExistingPointOption: React.FC<{ pointId: number; content: string }> = ({ pointId, content }) => {
    const { data: pointData, isLoading } = useQuery({
        queryKey: ['pointPreviewDetails', pointId],
        queryFn: () => fetchPoints([pointId]),
        select: (data) => (data && data.length > 0 ? data[0] : null),
        staleTime: 5 * 60 * 1000,
    });

    return (
        <div className="border rounded-md p-3 mb-2 bg-card/50">
            {isLoading ? (
                <div className="flex items-center justify-center h-24"><Loader /></div>
            ) : pointData ? (
                <PointCard
                    pointId={pointData.pointId}
                    content={pointData.content}
                    createdAt={pointData.createdAt}
                    cred={pointData.cred}
                    favor={pointData.favor}
                    amountSupporters={pointData.amountSupporters}
                    amountNegations={pointData.amountNegations}
                    viewerContext={{ viewerCred: pointData.viewerCred }}
                    className="text-xs"
                    disablePopover={true}
                    linkDisabled={true}
                    isNegation={false}
                />
            ) : (
                <div className="text-xs text-muted-foreground">Point ID: {pointId} (Details unavailable)</div>
            )}
        </div>
    );
};

export const DuplicatePointSelectionDialog: React.FC<DuplicatePointSelectionDialogProps> = ({
    isOpen,
    onOpenChange,
    conflicts,
    onResolve,
}) => {
    const [selections, setSelections] = useState<ResolvedMappings>(new Map());

    useEffect(() => {
        setSelections(new Map());
    }, [conflicts]);

    const handleSelectionChange = (previewNodeId: string, value: string) => {
        const newSelections = new Map(selections);
        newSelections.set(previewNodeId, value === 'new' ? null : parseInt(value, 10));
        setSelections(newSelections);
    };

    const allConflictsResolved = useMemo(() => {
        return conflicts.length > 0 && conflicts.every(conflict => selections.has(conflict.previewNodeId));
    }, [conflicts, selections]);

    const handleSubmit = () => {
        if (allConflictsResolved) {
            onResolve(selections);
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Resolve Point Conflicts</DialogTitle>
                    <DialogDescription>
                        Some points in your rationale match existing points. Choose whether to use the existing point or create a new one for each conflict.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="flex-1 overflow-y-auto pr-6 -mr-6 mt-4 mb-4">
                    <div className="space-y-6">
                        {conflicts.map((conflict) => (
                            <div key={conflict.previewNodeId} className="border rounded-lg p-4">
                                <p className="mb-3 font-medium text-sm break-words">Local Point Content:</p>
                                <blockquote className="border-l-4 pl-3 mb-4 text-sm bg-muted/30 py-2 rounded-r-md">{conflict.content}</blockquote>

                                <RadioGroup
                                    value={selections.get(conflict.previewNodeId)?.toString() ?? ''}
                                    onValueChange={(value: string) => handleSelectionChange(conflict.previewNodeId, value)}
                                >
                                    <p className="mb-2 text-sm font-medium">Choose Action:</p>
                                    <div className="flex items-center space-x-2 mb-3">
                                        <RadioGroupItem value="new" id={`${conflict.previewNodeId}-new`} />
                                        <Label htmlFor={`${conflict.previewNodeId}-new`} className="cursor-pointer">
                                            Create New Point
                                        </Label>
                                    </div>
                                    {conflict.existingPoints.map((existing) => (
                                        <div key={existing.id} className="flex items-start space-x-2 mb-2">
                                            <RadioGroupItem value={existing.id.toString()} id={`${conflict.previewNodeId}-${existing.id}`} className="mt-1" />
                                            <Label htmlFor={`${conflict.previewNodeId}-${existing.id}`} className="flex-1 cursor-pointer">
                                                Use Existing Point:
                                                <ExistingPointOption pointId={existing.id} content={existing.content} />
                                            </Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={!allConflictsResolved}>
                        Confirm Selections
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};