"use client";

import { useEffect, useState } from "react";
import { useAtom } from "jotai";
import { 
  viewpointStatementAtom, 
  viewpointReasoningAtom, 
  viewpointGraphAtom 
} from "@/atoms/viewpointAtoms";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export default function DraftSavedIndicator() {
  const [statement] = useAtom(viewpointStatementAtom);
  const [reasoning] = useAtom(viewpointReasoningAtom);
  const [graph] = useAtom(viewpointGraphAtom);
  
  const [showIndicator, setShowIndicator] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<number | null>(null);

  useEffect(() => {
    const hasContent = statement.trim().length > 0 || 
                      reasoning.trim().length > 0 || 
                      graph.nodes.some(node => node.type === "point");

    if (hasContent) {
      const currentTime = Date.now();
      setLastSaveTime(currentTime);
      setShowIndicator(true);

      const timer = setTimeout(() => {
        setShowIndicator(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [statement, reasoning, graph.nodes]);

  if (!showIndicator || !lastSaveTime) {
    return null;
  }

  return (
    <div 
      className={cn(
        "fixed bottom-8 right-4 z-50",
        "flex items-center gap-2 px-3 py-2",
        "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
        "border border-green-300 dark:border-green-700",
        "rounded-md shadow-sm",
        "animate-in slide-in-from-bottom-4 duration-300",
        "text-sm font-medium"
      )}
    >
      <Check className="size-4" />
      Draft Saved
    </div>
  );
}