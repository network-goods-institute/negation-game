import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useUser } from "@/hooks/useUser";
import { cn } from "@/lib/cn";
import { ToggleGroupSingleProps } from "@radix-ui/react-toggle-group";
import { useToggle } from "@uidotdev/usehooks";
import { TextCursorInputIcon, XIcon } from "lucide-react";
import { FC } from "react";

export interface CredInputProps extends Omit<ToggleGroupSingleProps, "type"> {
  cred: number;
  setCred: (cred: number) => void;
}

const DEFAULT_CRED_OPTIONS = [1, 5, 10];

export const CredInput: FC<CredInputProps> = ({ cred, setCred, ...props }) => {
  const [usingCustomCredAmount, toggleUsingCustomCredAmount] = useToggle(false);
  const { data: user } = useUser();
  const notEnoughCred = user && user.cred < cred;

  return (
    <ToggleGroup
      type="single"
      value={cred.toString()}
      onValueChange={(value) =>
        value === cred.toString() ? setCred(0) : setCred(Number(value))
      }
      {...props}
    >
      {!usingCustomCredAmount &&
        DEFAULT_CRED_OPTIONS.map((value) => (
          <ToggleGroupItem
            onClick={() => toggleUsingCustomCredAmount(false)}
            key={`${value}-cred`}
            value={value.toString()}
            className={cn(
              "group gap-xs font-normal text-muted-foreground rounded-full text-center size-8",
              "data-[state=on]:w-fit  data-[state=on]:text-endorsed data-[state=on]:bg-background data-[state=on]:hover:border-muted-foreground data-[state=on]:border",
              notEnoughCred && "data-[state=on]:text-destructive"
            )}
          >
            {value}
            <span className="hidden group-data-[state=on]:inline">cred</span>
          </ToggleGroupItem>
        ))}
      <div
        className={cn(
          "group inline-flex gap-xs font-normal text-muted-foreground rounded-full items-center justify-center h-8 w-fit",
          usingCustomCredAmount && "border"
        )}
      >
        {!usingCustomCredAmount && (
          <Button
            variant={"ghost"}
            size={"icon"}
            className="rounded-full size-8 hover:text-muted-foreground"
            onClick={() => {
              toggleUsingCustomCredAmount(), setCred(0);
            }}
          >
            <TextCursorInputIcon className="size-4 inline-block" />
          </Button>
        )}
        {usingCustomCredAmount && (
          <>
            <Input
              size={16}
              value={cred}
              onChange={(e) =>
                setCred(
                  Math.min(Number(e.target.value.replace(/\D/g, "")), 9999)
                )
              }
              autoFocus
              inputMode="numeric"
              min={0}
              pattern="[0-9]{0,5}"
              maxLength={6}
              className={cn(
                "h-8 border-none bg-transparent w-[56px] focus-visible:ring-offset-0 focus-visible:ring-0 text-endorsed pr-0",
                notEnoughCred && "text-destructive"
              )}
            />
            <span
              className={cn(
                "text-endorsed text-sm mr-sm",
                notEnoughCred && "text-destructive"
              )}
            >
              cred
            </span>
            <Button
              variant={"ghost"}
              size={"icon"}
              className="h-fit p-2 rounded-full rounded-l-none border-l-border border-l-[1px]"
              onClick={() => {
                setCred(0);
                toggleUsingCustomCredAmount();
              }}
            >
              <XIcon className="size-4" />
            </Button>
          </>
        )}
      </div>
    </ToggleGroup>
  );
};
