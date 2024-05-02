import { PledgeBadge } from "@/components/PledgeBadge";
import { WavePattern } from "@/components/WavePattern";
import { cn } from "@/lib/cn";
import { formatShortNumber } from "@/lib/formatShortNumber";
import { HeartHandshake, Share, Sword, UserRound } from "lucide-react";
import { FC, HTMLAttributes } from "react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";

export interface PointCardProps extends HTMLAttributes<HTMLDivElement> {
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

export const PointCard: FC<PointCardProps> = ({
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
  // const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
  const amountCounterpoints = counterpointIds?.length || 0;
  return (
    <Card
      className={cn(
        "@container/point relative rounded-lg shadow-md max-w-xl",
        className
      )}
      {...props}
    >
      {/* <Accordion type="single" collapsible>
        <AccordionItem value="description" className="border-none"> */}
      <CardHeader className="relative px-lg pt-sm pb-md">
        <WavePattern
          className={cn(
            "absolute right-5 top-0 h-full text-muted",
            viewerContext?.ally && "text-primary-ally/20",
            viewerContext?.enemy && "text-primary-enemy/20"
          )}
        />
        <CardTitle className=" !leading-5 text-sm @xs/point:text-md @sm/point:text-lg mb-md">
          {title}
        </CardTitle>

        <div className="w-full flex gap-xs  text-xs text-muted-foreground/70 items-center">
          {[
            // eslint-disable-next-line react/jsx-key
            [<strong>{formatShortNumber(favor)}✦</strong>, "favor"],
            [<>⧩{formatShortNumber(pledged)}</>, "pledged"],
            [
              <>
                <UserRound size={10} className="inline align-[-5%] " />
                {formatShortNumber(amountSupporters)}
              </>,
              "backers",
            ],
            [
              <>
                <Sword size={10} className="inline align-[-5%] " />
                {amountCounterpoints}
              </>,
              "attacks",
            ],
          ].flatMap(([value, label], i) => [
            ...(i > 0 ? [<p key={`divider-${i}`}>•</p>] : []),
            <div
              className="flex flex-col @xs/point:flex-row gap-0 leading-none @xs/point:gap-xs items-center"
              key={`stat-${i}`}
            >
              <p>{value}</p>
              <p className="hidden @sm/point:block">{label}</p>
            </div>,
          ])}
          {viewerContext?.pledged && (
            <PledgeBadge
              pledged={viewerContext.pledged}
              className="absolute right-md"
            />
          )}
        </div>
        {/* <AccordionTrigger className="absolute bottom-[-2px] left-1/2 -translate-x-1/2 scale-x-150 text-border hover:text-muted-foreground py-0 px-xl">
              <span className="sr-only">Toggle</span>
            </AccordionTrigger> */}
      </CardHeader>

      {/* <Separator /> */}
      {/* <AccordionContent className="pt-md pb-md bg-accent/30"> */}
      <CardContent className="py-2">
        <p>{body}</p>
      </CardContent>
      {/* </AccordionContent> */}

      {/* <Separator className="mb-sm -mt-[1px]" /> */}
      <CardFooter className="relative flex flex-col items-start mt-xs py-xs px-md">
        {/* <AccordionTrigger className="absolute top-[-10px] left-1/2 -translate-x-1/2 rotate-180 scale-x-150 text-border hover:text-muted-foreground py-0 px-xl" /> */}

        <div className="flex w-full justify-between">
          <div className="flex gap-sm">
            <Button
              variant="ghost"
              className="text-muted-foreground/30"
              size="icon"
            >
              <Sword size={20} />
            </Button>
            <Button
              size="icon"
              className={cn(
                viewerContext?.pledged
                  ? "text-primary-ally"
                  : "text-muted-foreground/30"
              )}
              variant={"ghost"}
            >
              <HeartHandshake className="inline" size={20} />
            </Button>
          </div>
          <div className="flex gap-xs">
            <Button
              variant="ghost"
              className="text-muted-foreground/30"
              size="icon"
            >
              <Share size={20} />
            </Button>
          </div>
        </div>
      </CardFooter>
      {/* </AccordionItem>
      </Accordion> */}
    </Card>
  );
};
