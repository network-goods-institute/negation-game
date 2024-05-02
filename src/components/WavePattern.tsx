import { cn } from "@/lib/cn";
import { FC, HTMLAttributes, useId } from "react";

export const WavePattern: FC<HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  const patternId = useId();
  return (
    <div {...props} className={cn("w-[10px] text-primary/15", className)}>
      <svg width="100%" height="100%">
        <defs>
          <pattern
            id={patternId}
            patternUnits="userSpaceOnUse"
            width="10"
            height="12"
            scale={2}
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              fill="currentColor"
              transform="scale(2)"
              d="M5,6L0,6L0,1L3,1L3,3L4,3L4,0L5,0L5,4L2,4L2,2L1,2L1,5L5,5L5,6Z"
            />
          </pattern>
        </defs>

        <rect
          width="100%"
          height="100%"
          fill={`url(#${patternId})`}
          patternTransform="scale(200)"
        />
      </svg>
    </div>
  );
};
