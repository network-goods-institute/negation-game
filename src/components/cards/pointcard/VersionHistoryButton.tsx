"use client";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HistoryIcon } from "lucide-react";
import { useState } from "react";
import { fetchPointHistory } from "@/actions/points/fetchPointHistory";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

interface VersionHistoryButtonProps {
  pointId: number;
  isEdited: boolean;
  editCount: number;
}

export const VersionHistoryButton = ({ 
  pointId, 
  isEdited, 
  editCount 
}: VersionHistoryButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const { data: history, isLoading } = useQuery({
    queryKey: ['point-history', pointId],
    queryFn: () => fetchPointHistory(pointId, 10),
    enabled: isOpen && isEdited,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (!isEdited || editCount === 0) {
    return null;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          data-action-button="true"
        >
          <HistoryIcon className="h-3 w-3 mr-1" />
          {editCount} edit{editCount !== 1 ? 's' : ''}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" side="top" align="start">
        <div className="p-3 border-b">
          <h3 className="font-medium text-sm">Version History</h3>
          <p className="text-xs text-muted-foreground">
            {editCount} edit{editCount !== 1 ? 's' : ''} made to this point
          </p>
        </div>
        
        <div className="max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading history...
            </div>
          ) : history && history.length > 0 ? (
            <div className="p-2 space-y-2">
              {history.map((entry, index) => (
                <div key={entry.id} className="p-2 rounded border bg-muted/30">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-medium capitalize">
                      {entry.action}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(entry.createdAt, { addSuffix: true })}
                    </span>
                  </div>
                  
                  {entry.user.username && (
                    <div className="text-xs text-muted-foreground mb-2">
                      by {entry.user.username}
                    </div>
                  )}
                  
                  {entry.action === 'edited' && entry.previousContent && (
                    <div className="text-xs space-y-1">
                      <div className="text-muted-foreground">Previous:</div>
                      <div className="bg-background/50 p-2 rounded text-xs max-h-20 overflow-y-auto">
                        {entry.previousContent.length > 100 
                          ? entry.previousContent.substring(0, 100) + '...'
                          : entry.previousContent
                        }
                      </div>
                    </div>
                  )}
                  
                  <div className="text-xs space-y-1 mt-2">
                    <div className="text-muted-foreground">
                      {entry.action === 'created' ? 'Content:' : 'Updated to:'}
                    </div>
                    <div className="bg-background/50 p-2 rounded text-xs max-h-20 overflow-y-auto">
                      {entry.newContent.length > 100 
                        ? entry.newContent.substring(0, 100) + '...'
                        : entry.newContent
                      }
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No history available
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};