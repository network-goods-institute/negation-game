"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/cn"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & {
    destructive?: boolean;
    existingPercentage?: number;
  }
>(({ className, destructive, existingPercentage = 0, value = [0], ...props }, ref) => {
  const currentValue = Math.floor(value[0]);
  
  const visualValue = destructive 
    ? Math.floor((currentValue / existingPercentage) * 100)
    : currentValue;
    
  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        className
      )}
      value={value}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-endorsed/10">
        {/* Base layer - existing stake (grey) */}
        {!destructive && existingPercentage > 0 && (
          <div 
            className="absolute h-full bg-muted-foreground/20 dark:bg-white/20"
            style={{ 
              width: `${existingPercentage}%`
            }}
          />
        )}
        
        {/* Increase layer - blue portion */}
        {!destructive && currentValue > existingPercentage && (
          <div 
            className="absolute h-full bg-endorsed"
            style={{ 
              left: `${existingPercentage}%`,
              width: `${currentValue - existingPercentage}%`
            }}
          />
        )}

        {/* Decrease layer - red portion */}
        {destructive && (
          <div 
            className="absolute h-full bg-red-500"
            style={{ 
              left: `${currentValue}%`,
              width: `${existingPercentage - currentValue}%`
            }}
          />
        )}

        {/* Hidden Range for proper thumb positioning */}
        <SliderPrimitive.Range 
          className="absolute h-full opacity-0"
          style={{ 
            width: `${visualValue}%`
          }}
        />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className={cn(
        "block h-6 w-6 rounded-full shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 relative z-10",
        destructive ? "bg-red-500" : "bg-endorsed"
      )} />
    </SliderPrimitive.Root>
  );
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider } 