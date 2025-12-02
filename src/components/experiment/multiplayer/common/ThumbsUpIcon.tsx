import React from "react";
import { ThumbsUp } from "lucide-react";

interface ThumbsUpIconProps {
  className?: string;
  filled?: boolean;
}

export const ThumbsUpIcon: React.FC<ThumbsUpIconProps> = ({
  className = "",
  filled = false,
}) => {
  return (
    <ThumbsUp
      className={`${className} ${filled ? "fill-current" : ""}`}
    />
  );
};
