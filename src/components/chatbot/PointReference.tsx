import React from 'react';
import { Button } from "@/components/ui/button";
import { Eye } from 'lucide-react'; // Example icon

interface PointReferenceProps {
    id: number;
    snippet?: string;
}

export const PointReference: React.FC<PointReferenceProps> = ({ id, snippet }) => {
    return (
        <span className="inline-flex items-center gap-1.5 bg-muted px-2 py-0.5 rounded mx-0.5">
            <span className="text-sm font-medium">Point {id}</span>
            {snippet && <span className="text-xs text-muted-foreground truncate max-w-[150px]">: &quot;{snippet}&quot;</span>}
            <Button
                size="sm"
                variant="ghost"
                className="h-6 px-1.5 text-xs"
                disabled
            >
                <Eye className="h-3 w-3 mr-1" />
                View
            </Button>
        </span>
    );
}; 