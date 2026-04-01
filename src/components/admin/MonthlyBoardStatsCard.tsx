"use client";

import { useState, useTransition } from "react";
import { BarChart3Icon, CalendarIcon, LoaderIcon } from "lucide-react";
import { fetchMonthlyBoardStatsAction } from "@/actions/admin/fetchMonthlyBoardStats";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type MonthlyBoardStats = Awaited<ReturnType<typeof fetchMonthlyBoardStatsAction>>;

const monthOptions = [
  { label: "January", value: "1" },
  { label: "February", value: "2" },
  { label: "March", value: "3" },
  { label: "April", value: "4" },
  { label: "May", value: "5" },
  { label: "June", value: "6" },
  { label: "July", value: "7" },
  { label: "August", value: "8" },
  { label: "September", value: "9" },
  { label: "October", value: "10" },
  { label: "November", value: "11" },
  { label: "December", value: "12" },
];

function formatRunTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleString();
}

export function MonthlyBoardStatsCard() {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getUTCMonth() + 1));
  const [year, setYear] = useState(String(now.getUTCFullYear()));
  const [result, setResult] = useState<MonthlyBoardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleRun = () => {
    const parsedMonth = Number(month);
    const parsedYear = Number(year);

    if (!Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
      setError("Month must be between 1 and 12.");
      return;
    }

    if (!Number.isInteger(parsedYear) || parsedYear < 1970) {
      setError("Year must be 1970 or later.");
      return;
    }

    setError(null);
    setResult(null);

    startTransition(async () => {
      try {
        const nextResult = await fetchMonthlyBoardStatsAction({
          month: parsedMonth,
          year: parsedYear,
        });

        setResult(nextResult);
        setLastRunAt(new Date().toISOString());
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Failed to run monthly board stats."
        );
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3Icon className="h-5 w-5" />
          Monthly Board Stats
        </CardTitle>
        <CardDescription>
          Scan board history for boards and node types first created in a UTC month
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Manual execution only</span>
          <Badge variant="secondary">
            <CalendarIcon className="mr-1 h-3 w-3" />
            On-demand
          </Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="monthly-board-stats-month">Month</Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger id="monthly-board-stats-month">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="monthly-board-stats-year">Year</Label>
            <Input
              id="monthly-board-stats-year"
              inputMode="numeric"
              min={1970}
              onChange={(event) => setYear(event.target.value)}
              type="number"
              value={year}
            />
          </div>
        </div>

        <Button className="w-full" disabled={isPending} onClick={handleRun}>
          {isPending ? (
            <>
              <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
              Running...
            </>
          ) : (
            "Run Monthly Stats"
          )}
        </Button>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="space-y-4 rounded-lg border p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{result.month}</p>
                <p className="text-sm text-muted-foreground">
                  {result.monthStart} to {result.monthEnd}
                </p>
              </div>
              <Badge variant="outline">{result.boardsScanned} boards scanned</Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  New boards
                </p>
                <p className="text-2xl font-semibold">{result.newBoards}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  New points
                </p>
                <p className="text-2xl font-semibold">{result.newPoints}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">By type</p>
              {Object.keys(result.byType).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(result.byType).map(([type, count]) => (
                    <div
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                      key={type}
                    >
                      <span className="text-sm">{type}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No node creations in this window.</p>
              )}
            </div>

            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer">JSON</summary>
              <pre className="mt-2 whitespace-pre-wrap rounded-md bg-muted p-3">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>

            {lastRunAt && (
              <p className="text-xs text-muted-foreground">
                Executed at: {formatRunTimestamp(lastRunAt)}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
