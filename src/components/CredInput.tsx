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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface CredInputProps
  extends Omit<ToggleGroupSingleProps, "type">,
  Pick<
    ReturnType<typeof useCredInput>,
    "credInput" | "setCredInput" | "notEnoughCred"
  > {
  compact?: boolean;
  hideLabels?: boolean;
}

const DEFAULT_CRED_OPTIONS = [0, 1, 5, 10];

export const CredInput: FC<CredInputProps> = ({
  credInput: cred,
  setCredInput: setCred,
  notEnoughCred,
  compact = false,
  hideLabels = false,
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

  return (
    <div className="w-full">
      {!hideLabels && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <span className="text-sm text-muted-foreground">
              {cred > 0 ? `Spending ${cred} cred` : "Endorsement amount:"}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoIcon className="ml-1.5 size-3.5 text-muted-foreground/70 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-60">
                Endorsing means you support this point. The more cred you spend, the stronger your endorsement.
              </TooltipContent>
            </Tooltip>
          </div>
          {user && (
            <span className="text-xs font-medium text-muted-foreground">
              {user.cred} available
            </span>
          )}
        </div>
      )}

      <div className="flex w-full gap-1.5">
        {!customMode ? (
          <>
            <ToggleGroup
              type="single"
              value={cred.toString()}
              onValueChange={(value) => {
                if (value) setCred(Number(value));
              }}
              className="flex-1 flex gap-1"
              {...props}
            >
              {DEFAULT_CRED_OPTIONS.map((value) => (
                <ToggleGroupItem
                  key={`${value}-cred`}
                  value={value.toString()}
                  disabled={value === 0}
                  className={cn(
                    "flex-1 h-9 px-1 font-medium text-sm flex items-center justify-center rounded-md",
                    "data-[state=on]:bg-endorsed/15 data-[state=on]:text-endorsed data-[state=on]:border-endorsed/30 border-muted-foreground/20",
                    "hover:bg-muted/50 hover:text-foreground",
                    value === 0 && "text-muted-foreground/50 pointer-events-none",
                    notEnoughCred && value === cred && "data-[state=on]:text-destructive data-[state=on]:bg-destructive/10 data-[state=on]:border-destructive/30"
                  )}
                >
                  <span>{value}</span>
                  <span
                    className={cn(
                      "ml-0.5 text-xs opacity-70",
                      !compact && "inline"
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
              className="h-9 px-2 text-sm border-muted-foreground/20 text-muted-foreground hover:border-endorsed/30 hover:text-endorsed"
              onClick={() => {
                setCustomMode(true);
                setInputValue(cred > 0 ? cred.toString() : "");
              }}
            >
              <PencilIcon className="size-3 mr-1" />
              Custom
            </Button>
          </>
        ) : (
          <div className="flex-1 flex h-9 border rounded-md overflow-hidden">
            <div className="flex-1 px-2 flex items-center">
              <Input
                type="text"
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                className={cn(
                  "border-none shadow-none h-full w-full pl-0 focus-visible:ring-0",
                  notEnoughCred && "text-destructive",
                  "placeholder:text-muted-foreground/50 focus:text-endorsed"
                )}
                placeholder="Amount"
                autoFocus
                inputMode="numeric"
              />
              <span className={cn(
                "text-sm",
                notEnoughCred ? "text-destructive" : "text-muted-foreground"
              )}>
                cred
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={exitCustomMode}
              className="h-full px-2 rounded-none border-l hover:bg-muted/30"
            >
              <XIcon className="size-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
