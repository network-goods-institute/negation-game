import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useCredInput } from "@/hooks/useCredInput";
import { useUser } from "@/queries/useUser";
import { cn } from "@/lib/cn";
import { ToggleGroupSingleProps } from "@radix-ui/react-toggle-group";
import { useToggle } from "@uidotdev/usehooks";
import { InfoIcon, PencilIcon, XIcon } from "lucide-react";
import { FC, useState, useEffect } from "react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

export interface CredInputProps
  extends Omit<ToggleGroupSingleProps, "type">,
  Pick<
    ReturnType<typeof useCredInput>,
    "credInput" | "setCredInput" | "notEnoughCred"
  > {
  compact?: boolean;
  hideLabels?: boolean;
  allowZero?: boolean;
  extraCompact?: boolean;
  endorsementAmount?: number;
  isSelling?: boolean;
  setIsSelling?: (value: boolean) => void;
}

const DEFAULT_CRED_OPTIONS = [0, 1, 5, 10];

export const CredInput: FC<CredInputProps> = ({
  credInput: cred,
  setCredInput: setCred,
  notEnoughCred,
  compact = false,
  hideLabels = false,
  allowZero = false,
  extraCompact = false,
  endorsementAmount = 0,
  isSelling = false,
  setIsSelling,
  ...props
}) => {
  const [customMode, setCustomMode] = useToggle(false);
  const { data: user } = useUser();
  const [inputValue, setInputValue] = useState<string>("");

  // Update input value when cred changes in custom mode
  useEffect(() => {
    if (customMode) {
      setInputValue(cred.toString());
    }
  }, [cred, customMode]);

  // Handle custom input submission
  const handleInputChange = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    setInputValue(numericValue);
    setCred(Math.min(Number(numericValue), 9999));
  };

  const exitCustomMode = () => {
    setCustomMode(false);
    setInputValue("");
  };

  const hasEndorsement = endorsementAmount > 0;

  return (
    <div className={cn("w-full", extraCompact && "max-w-[160px]")}>
      {!hideLabels && (
        extraCompact ? (
          <div className="mb-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-xs text-muted-foreground">
                  {cred > 0 ? `${isSelling ? 'Selling' : 'Spending'} ${cred} cred` : `${isSelling ? 'Sell' : 'Endorsement'} amount:`}
                </span>

                <TooltipProvider>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <InfoIcon className="ml-1 mr-3 size-3 text-muted-foreground/70 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-60">
                      {isSelling ? 'Selling reduces your endorsement and returns cred to you.' : 'Endorsing means you support this point. The more cred you spend, the stronger your endorsement.'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {user && (
                <span className="text-[9px] font-medium text-muted-foreground">
                  {isSelling ? endorsementAmount : user.cred} available
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <span className="text-sm text-muted-foreground">
                {cred > 0 ? `${isSelling ? 'Selling' : 'Spending'} ${cred} cred` : `${isSelling ? 'Sell' : 'Endorsement'} amount:`}
              </span>
              <TooltipProvider>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <InfoIcon className="ml-1 mr-3 size-3 text-muted-foreground/70 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-60">
                    {isSelling ? 'Selling reduces your endorsement and returns cred to you.' : 'Endorsing means you support this point. The more cred you spend, the stronger your endorsement.'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {user && (
              <span className="text-xs font-medium text-muted-foreground">
                {isSelling ? endorsementAmount : user.cred} available
              </span>
            )}
          </div>
        )
      )}

      <div className="flex w-full gap-1.5 flex-col">
        {!customMode ? (
          <>
            <div className="flex w-full gap-1.5">
              <ToggleGroup
                type="single"
                value={cred.toString()}
                onValueChange={(value) => {
                  if (value) setCred(Number(value));
                }}
                className={cn("flex-1 flex gap-1", extraCompact && "gap-0.5")}
                {...props}
              >
                {DEFAULT_CRED_OPTIONS.map((value) => (
                  <ToggleGroupItem
                    key={`${value}-cred`}
                    value={value.toString()}
                    disabled={value === 0 && !allowZero || (isSelling && value > endorsementAmount)}
                    className={cn(
                      "flex-1 h-9 px-1 font-medium text-sm flex items-center justify-center rounded-md",
                      extraCompact && "h-7 px-0.5 text-xs",
                      "data-[state=on]:bg-accent/80 data-[state=on]:text-accent-foreground data-[state=on]:border-muted/60 border-muted-foreground/20",
                      "hover:bg-muted/50 hover:text-foreground",
                      value === 0 && !allowZero && "text-muted-foreground/50 pointer-events-none",
                      notEnoughCred && value === cred && "data-[state=on]:text-destructive data-[state=on]:bg-destructive/10 data-[state=on]:border-destructive/30",
                      isSelling && value > endorsementAmount && "text-muted-foreground/50 pointer-events-none"
                    )}
                  >
                    <span>{value}</span>
                    <span
                      className={cn(
                        "ml-0.5 text-xs opacity-70",
                        extraCompact && "text-[10px] ml-0",
                        !compact && !extraCompact && "inline",
                        compact && "sr-only",
                        extraCompact && "sr-only"
                      )}
                    >
                      cred
                    </span>
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>

              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-9 px-2 text-sm border-muted-foreground/20 text-muted-foreground hover:border-muted/60 hover:text-foreground",
                  extraCompact && "h-7 px-1 text-xs"
                )}
                onClick={() => {
                  setCustomMode(true);
                  setInputValue(cred > 0 ? cred.toString() : "");
                }}
              >
                <PencilIcon className={cn("size-3 mr-1", extraCompact && "size-2.5 mr-0.5")} />
                {!extraCompact ? "Custom" : ""}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex h-9 border rounded-md overflow-hidden">
            <div className="flex-1 px-2 flex items-center">
              <Input
                type="text"
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                className={cn(
                  "border-none shadow-none h-full w-full pl-0 focus-visible:ring-0 focus-visible:ring-offset-0",
                  notEnoughCred && !isSelling && "text-destructive",
                  isSelling && Number(inputValue) > endorsementAmount && "text-destructive",
                  "placeholder:text-muted-foreground/50",
                  extraCompact && "text-xs"
                )}
                placeholder="Amount"
                autoFocus
                inputMode="numeric"
              />
              <span className={cn(
                "text-sm",
                extraCompact && "text-xs",
                (notEnoughCred && !isSelling) || (isSelling && Number(inputValue) > endorsementAmount) ? "text-destructive" : "text-muted-foreground"
              )}>
                cred
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={exitCustomMode}
              className={cn(
                "h-full px-2 rounded-none border-l hover:bg-muted/30",
                extraCompact && "px-1"
              )}
            >
              <XIcon className={cn("size-3.5", extraCompact && "size-3")} />
            </Button>
          </div>
        )}
        {hasEndorsement && setIsSelling && (
          <div className="flex justify-center mt-2">
            <ToggleGroup
              type="single"
              value={isSelling ? 'sell' : 'buy'}
              onValueChange={(value) => setIsSelling(value === 'sell')}
              className="inline-flex rounded-md"
            >
              <ToggleGroupItem
                value="buy"
                className="data-[state=on]:bg-accent/80 data-[state=on]:text-accent-foreground"
              >
                Buy
              </ToggleGroupItem>
              <ToggleGroupItem
                value="sell"
                className="data-[state=on]:bg-accent/80 data-[state=on]:text-accent-foreground"
              >
                Sell
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        )}
      </div>
    </div>
  );
};
