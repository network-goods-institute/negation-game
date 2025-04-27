import { CredInput } from "@/components/CredInput";
import {
  AutosizeTextarea,
  AutosizeTextAreaProps,
} from "@/components/ui/autosize-textarea";
import { Separator } from "@/components/ui/separator";
import { POINT_MAX_LENGTH, POINT_MIN_LENGTH } from "@/constants/config";
import { useCredInput } from "@/hooks/useCredInput";
import { cn } from "@/lib/cn";
import { CircleCheckBigIcon } from "lucide-react";
import { FC, HTMLAttributes, ReactNode } from "react";

export interface PointEditorProps extends HTMLAttributes<HTMLDivElement> {
  content: string;
  setContent: (content: string) => void;
  cred: number;
  setCred: (cred: number) => void;
  placeholder?: string;
  textareaProps?: Partial<AutosizeTextAreaProps>;
  guidanceNotes?: ReactNode;
  textareaClassName?: string;
  compact?: boolean;
  allowZero?: boolean;
  parentNodeType?: string;
  extraCompact?: boolean;
}

export const PointEditor: FC<PointEditorProps> = ({
  className,
  content,
  setContent,
  cred,
  setCred,
  textareaProps,
  textareaClassName,
  parentNodeType,
  placeholder,
  compact = false,
  allowZero = true,
  extraCompact = false,
  guidanceNotes = (
    <>
      <CircleCheckBigIcon className="size-3 align-[-1.5px] inline-block " />{" "}
      Good Points express a single idea and make sense on their own
    </>
  ),
}) => {
  const defaultPlaceholder = parentNodeType === "statement" ? "Make your option" : "Make your point";
  const placeholderText = placeholder || defaultPlaceholder;

  const charactersLeft = POINT_MAX_LENGTH - content.length;
  const { notEnoughCred } = useCredInput({ cred, setCred });

  return (
    <div className={cn("flex-grow flex flex-col gap-2 pt-1", className)}>
      <AutosizeTextarea
        value={content}
        style={{ height: "46px" }}
        onChange={(e) => setContent(e.target.value.replace(/\n/g, ""))}
        autoFocus
        className={cn(
          "w-full rounded-none !ring-0 !ring-offset-0 tracking-tight text-md border-none @sm/point:text-lg p-2 focus-visible:outline-none",
          textareaClassName
        )}
        placeholder={placeholderText}
        {...textareaProps}
      />
      <Separator className="w-full" />
      <p className="text-muted-foreground/70 text-xs -mt-1">{guidanceNotes}</p>

      <div className="flex w-full flex-col items-stretch gap-sm">
        <CredInput
          credInput={cred}
          setCredInput={setCred}
          notEnoughCred={notEnoughCred}
          compact={compact}
          allowZero={allowZero}
          extraCompact={extraCompact}
        />

        <div className="flex gap-sm items-center self-end">
          <span
            className={cn(
              charactersLeft >= 0 ? "text-muted-foreground" : "text-destructive",
              extraCompact && "text-xs"
            )}
          >
            {charactersLeft}
          </span>
          <svg className={cn("size-8", extraCompact && "size-6")} viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="54"
              stroke="hsl(var(--muted))"
              strokeWidth="12"
              fill="none"
            />

            <circle
              cx="60"
              cy="60"
              r="54"
              stroke="hsl(var(--primary) / .5)"
              strokeWidth="12"
              strokeLinecap="round"
              fill="none"
              strokeDasharray="339.292"
              strokeDashoffset={
                2 * Math.PI * 54 * (1 - POINT_MIN_LENGTH / POINT_MAX_LENGTH)
              }
              transform="rotate(-90 60 60)"
            />

            <circle
              cx="60"
              cy="60"
              r="54"
              stroke="hsl(var(--primary))"
              strokeWidth="12"
              strokeLinecap="round"
              fill="none"
              strokeDasharray="339.292"
              strokeDashoffset={
                2 *
                Math.PI *
                54 *
                (Math.max(0, charactersLeft) / POINT_MAX_LENGTH)
              }
              transform="rotate(-90 60 60)"
            />
            <circle
              cx="60"
              cy="60"
              r="54"
              stroke="hsl(var(--destructive))"
              strokeWidth="12"
              strokeLinecap="round"
              fill="none"
              strokeDasharray="339.292"
              strokeDashoffset={
                2 *
                Math.PI *
                54 *
                Math.max(0, 1 + Math.min(0, charactersLeft) / POINT_MAX_LENGTH)
              }
              transform="rotate(-90 60 60)"
            />
          </svg>
        </div>
      </div>
      {notEnoughCred && (
        <span className="ml-md text-destructive text-sm h-fit -mt-1">
          not enough cred
        </span>
      )}
    </div>
  );
};
