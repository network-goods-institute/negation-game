"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/cn"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & {
    destructive?: boolean;
    existingCred?: number;
    isDoubtMode?: boolean;
  }
>(({ className, destructive, existingCred = 0, value = [0], max = 100, isDoubtMode, ...props }, ref) => {
  const currentValue = value[0];
  
  // Convert to percentages only for visual display as dealing with percentages is awful
  const existingPercentage = (existingCred / max) * 100;
  const currentPercentage = (currentValue / max) * 100;
  
  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        className
      )}
      value={value}
      step={1}
      max={max}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-endorsed/10">
        {/* Base layer - existing stake (grey) - only show if not in doubt mode */}
        {!isDoubtMode && !destructive && existingCred > 0 && (
          <div 
            className="absolute h-full bg-muted-foreground/20 dark:bg-white/20"
            style={{ 
              width: `${existingPercentage}%`
            }}
          />
        )}
        
        {/* Simple blue fill for doubt mode */}
        {isDoubtMode && (
          <div 
            className="absolute h-full bg-endorsed"
            style={{ 
              width: `${currentPercentage}%`
            }}
          />
        )}
        
        {/* Regular stake/slash behavior when not in doubt mode */}
        {!isDoubtMode && (
          <>
            {/* Increase layer - blue portion */}
            {!destructive && currentValue > existingCred && (
              <div 
                className="absolute h-full bg-endorsed"
                style={{ 
                  left: `${existingPercentage}%`,
                  width: `${currentPercentage - existingPercentage}%`
                }}
              />
            )}

            {/* Decrease layer - red portion */}
            {destructive && (
              <div 
                className="absolute h-full bg-red-500"
                style={{ 
                  left: `${currentPercentage}%`,
                  width: `${existingPercentage - currentPercentage}%`
                }}
              />
            )}
          </>
        )}

        <SliderPrimitive.Range 
          className="absolute h-full opacity-0"
          style={{ 
            width: `${currentPercentage}%`
          }}
        />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className={cn(
        "block h-6 w-6 rounded-full shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 relative z-10",
        isDoubtMode || !destructive ? "bg-endorsed" : "bg-red-500"
      )} />
    </SliderPrimitive.Root>
  );
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider } 