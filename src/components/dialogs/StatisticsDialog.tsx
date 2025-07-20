"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  BarChart3Icon,
  ArrowLeftIcon,
} from "lucide-react";
import { DaoStatsPanel } from "@/components/statistics/DaoStatsPanel";

export const StatisticsDialog = ({
  open,
  onOpenChange,
  space,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  space: string;
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl md:max-w-3xl h-auto max-h-[85vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeftIcon className="size-4" />
              </Button>
            </DialogClose>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3Icon className="size-5" />
              s/{space} Statistics
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="mt-4 flex-1 overflow-y-auto">
          <DaoStatsPanel space={space} />
        </div>
      </DialogContent>
    </Dialog>
  );
};