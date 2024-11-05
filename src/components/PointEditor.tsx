import { CredInput } from "@/components/CredInput";
import { AutosizeTextarea } from "@/components/ui/autosize-textarea";
import { Separator } from "@/components/ui/separator";
import { POINT_MAX_LENGHT, POINT_MIN_LENGHT } from "@/constants/config";
import { useCredInput } from "@/hooks/useCredInput";
import { cn } from "@/lib/cn";
import { FC, HTMLAttributes } from "react";

export interface PointEditorProps extends HTMLAttributes<HTMLDivElement> {
  content: string;
  setContent: (content: string) => void;
  cred: number;
  setCred: (cred: number) => void;
  placeholder?: string;
}

export const PointEditor: FC<PointEditorProps> = ({
  className,
  content,
  setContent,
  cred,
  setCred,
  placeholder = "Make your point",
}) => {
  const charactersLeft = POINT_MAX_LENGHT - content.length;
  const { notEnoughCred } = useCredInput({ cred, setCred });

  return (
    <div className={cn("flex-grow flex flex-col gap-2 pt-1", className)}>
      <AutosizeTextarea
        value={content}
        style={{ height: "46px" }}
        onChange={(e) => setContent(e.target.value.replace(/\n/g, ""))}
        autoFocus
        className="w-full rounded-none !ring-0 tracking-tight text-md border-none @sm/point:text-lg p-2 -ml-2 -mt-2 "
        placeholder={placeholder}
      />
      <Separator className="w-full" />

      <div className="flex w-full items-center justify-between  gap-sm">
        <CredInput
          cred={cred}
          setCred={setCred}
          notEnoughCred={notEnoughCred}
        />

        <div className="flex gap-sm items-center">
          <span
            className={cn(
              charactersLeft >= 0 ? "text-muted-foreground" : "text-destructive"
            )}
          >
            {charactersLeft}
          </span>
          <svg className="size-8" viewBox="0 0 120 120">
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
                2 * Math.PI * 54 * (1 - POINT_MIN_LENGHT / POINT_MAX_LENGHT)
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
                (Math.max(0, charactersLeft) / POINT_MAX_LENGHT)
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
                Math.max(0, 1 + Math.min(0, charactersLeft) / POINT_MAX_LENGHT)
              }
              transform="rotate(-90 60 60)"
            />
          </svg>
        </div>
      </div>
      {notEnoughCred && (
        <span className="ml-md text-destructive text-sm h-fit">
          not enough cred
        </span>
      )}
    </div>
  );
};
