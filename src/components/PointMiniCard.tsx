import { PledgeBadge } from "@/components/PledgeBadge";
import { WavePattern } from "@/components/WavePattern";
import { cn } from "@/lib/cn";
import { formatShortNumber } from "@/lib/formatShortNumber";
import { Sword, UserRound } from "lucide-react";
import { FC, HTMLAttributes } from "react";
import { Card, CardHeader, CardTitle } from "./ui/card";

export interface PointMiniCardProps extends HTMLAttributes<HTMLDivElement> {
  pointId: string;
  title: string;
  body: string;
  createdAt: number;
  pledged: number;
  favor: number;
  amountSupporters: number;
  counterpointIds: string[];
  viewerContext?: {
    pledged?: number;
    ally?: boolean;
    enemy?: boolean;
  };
  initiallyExpanded?: boolean;
}

export const PointMiniCard: FC<PointMiniCardProps> = ({
  pointId,
  title,
  body,
  createdAt,
  className,
  pledged,
  favor,
  amountSupporters,
  counterpointIds,
  viewerContext,
  initiallyExpanded = true,
  ...props
}) => {
  const amountCounterpoints = counterpointIds?.length || 0;
  return (
    <Card
      className={cn(
        "@container/point relative rounded-lg shadow-md max-w-xl",
        className
      )}
      {...props}
    >
      <WavePattern
        className={cn(
          "absolute right-xs top-0 h-full text-muted",
          viewerContext?.ally && "text-primary-ally/20",
          viewerContext?.enemy && "text-primary-enemy/20"
        )}
      />
      <CardHeader className="py-sm px-md gap-none">
        <CardTitle className="text-xs @xs/point:text-lg @sm/point:text-lg w-full overflow-auto overflow-ellipsis text-nowrap leading-none">
          {title}
        </CardTitle>
        <div className="relative w-full flex gap-xs text-xs text-muted-foreground ">
          {[
            <>
              <strong>{formatShortNumber(favor)}✦</strong>
            </>,
            <>⧩{formatShortNumber(pledged)}</>,

            <>
              <UserRound size={10} className="inline align-[-5%] " />
              {formatShortNumber(amountSupporters)}
            </>,

            <>
              <Sword size={10} className="inline align-[-5%] " />
              {amountCounterpoints}
            </>,
          ].flatMap((value, i) => [
            ...(i > 0 ? [<p>•</p>] : []),

            <p>{value}</p>,
          ])}
          {viewerContext?.pledged && (
            <PledgeBadge
              pledged={viewerContext.pledged}
              className="absolute right-0"
            />
          )}
        </div>
      </CardHeader>
    </Card>
  );
};
