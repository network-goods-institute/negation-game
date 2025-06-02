"use client";

import React from "react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils/cn";

export interface EndorsementToggleProps
    extends React.ComponentPropsWithoutRef<typeof Switch> { }

export const EndorsementToggle = React.forwardRef<
    React.ElementRef<typeof Switch>,
    EndorsementToggleProps
>(({ className, ...props }, ref) => {
    const { checked } = props as { checked?: boolean };
    return (
        <Switch
            className={cn(
                // override colors: gray off, gold on
                "data-[state=checked]:bg-yellow-500 data-[state=unchecked]:bg-gray-200",
                className
            )}
            {...props}
            ref={ref}
        />
    );
});
EndorsementToggle.displayName = Switch.displayName || "EndorsementToggle"; 