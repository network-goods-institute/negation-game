"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  RefreshCwIcon,
  ActivityIcon,
  DatabaseIcon,
  GitBranchIcon,
  ShieldCheckIcon,
  ClockIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  LoaderIcon
} from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";import { logger } from "@/lib/logger";

interface AdminStatus {
  siteAdmin: boolean;
  adminSpaces: string[];
  allSpaces: string[];
}

interface JobExecution {
  success: boolean;
  duration?: number;
  trigger?: string;
  timestamp?: string;
  message?: string;
  error?: string;
  details?: string;
}

export default function SiteAdminPage() {
  const { user } = usePrivy();
  const router = useRouter();
  const [adminStatus, setAdminStatus] = useState<AdminStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  const [scrollJobRunning, setScrollJobRunning] = useState(false);
  const [scrollJobResult, setScrollJobResult] = useState<JobExecution | null>(null);

  const [deltaJobRunning, setDeltaJobRunning] = useState(false);
  const [deltaJobResult, setDeltaJobResult] = useState<JobExecution | null>(null);

  const [clusterJobRunning, setClusterJobRunning] = useState(false);
  const [clusterJobResult, setClusterJobResult] = useState<JobExecution | null>(null);

  const [stanceJobRunning, setStanceJobRunning] = useState(false);
  const [stanceJobResult, setStanceJobResult] = useState<JobExecution | null>(null);

  const [cleanupJobRunning, setCleanupJobRunning] = useState(false);
  const [cleanupJobResult, setCleanupJobResult] = useState<JobExecution | null>(null);
  const [yjsCompactRunning, setYjsCompactRunning] = useState(false);
  const [yjsCompactResult, setYjsCompactResult] = useState<JobExecution | null>(null);
  const yjsStatsLink = "/api/admin/compact-docs/stats";

  useEffect(() => {
    if (!user) {
      router.push("/");
      return;
    }

    fetchAdminStatus();
  }, [user, router]);

  const fetchAdminStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/status");

      if (response.status === 401) {
        setUnauthorized(true);
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch admin status");
      }

      const data = await response.json();
      setAdminStatus(data);

      if (!data.siteAdmin) {
        setUnauthorized(true);
      }
    } catch (error) {
      logger.error("Error fetching admin status:", error);
      setUnauthorized(true);
    } finally {
      setLoading(false);
    }
  };

  const runScrollProposalJob = async () => {
    setScrollJobRunning(true);
    setScrollJobResult(null);

    try {
      const response = await fetch("/api/notifications/detect-scroll-proposals", {
        method: "POST",
      });

      const data = await response.json();
      setScrollJobResult(data);
    } catch (error) {
      setScrollJobResult({
        success: false,
        error: "Failed to run scroll proposal job",
        details: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setScrollJobRunning(false);
    }
  };

  const runDeltaPipelineJob = async () => {
    setDeltaJobRunning(true);
    setDeltaJobResult(null);

    try {
      const response = await fetch("/api/delta/pipeline");

      const data = await response.json();
      setDeltaJobResult(data);
    } catch (error) {
      setDeltaJobResult({
        success: false,
        error: "Failed to run delta pipeline job",
        details: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setDeltaJobRunning(false);
    }
  };

  const runClusterBuildJob = async () => {
    setClusterJobRunning(true);
    setClusterJobResult(null);

    try {
      const response = await fetch("/api/cron/build-clusters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ limit: 100 }),
      });

      const data = await response.json();
      setClusterJobResult(data);
    } catch (error) {
      setClusterJobResult({
        success: false,
        error: "Failed to run cluster build job",
        details: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setClusterJobRunning(false);
    }
  };

  const runStancePipelineJob = async () => {
    setStanceJobRunning(true);
    setStanceJobResult(null);

    try {
      const response = await fetch("/api/admin/stance-pipeline");

      const data = await response.json();
      setStanceJobResult(data);
    } catch (error) {
      setStanceJobResult({
        success: false,
        error: "Failed to run stance pipeline job",
        details: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setStanceJobRunning(false);
    }
  };

  const runCleanupJob = async () => {
    setCleanupJobRunning(true);
    setCleanupJobResult(null);

    try {
      const response = await fetch("/api/cron/cleanup-rate-limits");

      const data = await response.json();
      setCleanupJobResult(data);
    } catch (error) {
      setCleanupJobResult({
        success: false,
        error: "Failed to run rate limit cleanup job",
        details: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setCleanupJobRunning(false);
    }
  };

  const runYjsCompactionJob = async () => {
    setYjsCompactRunning(true);
    setYjsCompactResult(null);

    try {
      const response = await fetch("/api/admin/compact-docs?threshold=30&keepLast=0", {
        method: "POST",
      });
      const data = await response.json();
      setYjsCompactResult({
        success: response.ok && !!data?.success,
        message: data?.summary ? `Compacted ${data.summary.docsCompacted}/${data.summary.docsProcessed}` : data?.message,
        duration: data?.summary?.duration,
        timestamp: new Date().toISOString(),
        details: JSON.stringify(data, null, 2),
      });
    } catch (error) {
      setYjsCompactResult({
        success: false,
        error: "Failed to run Yjs compaction",
        details: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setYjsCompactRunning(false);
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return "N/A";
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="flex items-center justify-center py-12">
          <LoaderIcon className="animate-spin h-8 w-8 text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (unauthorized || !adminStatus?.siteAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <Alert variant="destructive">
          <ShieldCheckIcon className="h-4 w-4" />
          <AlertDescription>
            Access denied. Site administrator privileges required.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const JobResultDisplay = ({ result, title }: { result: JobExecution | null; title: string }) => {
    if (!result) return null;

    return (
      <div className="mt-4 p-4 border rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          {result.success ? (
            <CheckCircleIcon className="h-4 w-4 text-green-600" />
          ) : (
            <XCircleIcon className="h-4 w-4 text-red-600" />
          )}
          <span className="font-medium">
            {title} {result.success ? "Completed" : "Failed"}
          </span>
          {result.duration && (
            <Badge variant="outline">{formatDuration(result.duration)}</Badge>
          )}
        </div>

        {result.message && (
          <p className="text-sm text-muted-foreground mb-2">{result.message}</p>
        )}

        {result.error && (
          <p className="text-sm text-red-600 mb-2">{result.error}</p>
        )}

        {result.details && (
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">Details</summary>
            <pre className="mt-2 whitespace-pre-wrap">{result.details}</pre>
          </details>
        )}

        {result.timestamp && (
          <p className="text-xs text-muted-foreground mt-2">
            Executed at: {new Date(result.timestamp).toLocaleString()}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8">
      <div className="flex items-center gap-3">
        <ShieldCheckIcon className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Site Administration</h1>
          <p className="text-muted-foreground">System management and cron job controls</p>
        </div>
      </div>

      <Alert>
        <ActivityIcon className="h-4 w-4" />
        <AlertDescription>
          You are logged in as a site administrator. You can manually trigger cron jobs and manage system operations.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Scroll Proposal Detection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCwIcon className="h-5 w-5" />
              Scroll Proposal Detection
            </CardTitle>
            <CardDescription>
              Detect new Scroll governance proposals and send notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Scheduled: Every 6 hours</span>
              <Badge variant="outline">
                <ClockIcon className="h-3 w-3 mr-1" />
                0 */6 * * *
              </Badge>
            </div>

            <Button
              onClick={runScrollProposalJob}
              disabled={scrollJobRunning}
              className="w-full"
            >
              {scrollJobRunning ? (
                <>
                  <LoaderIcon className="h-4 w-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                "Run Now"
              )}
            </Button>

            <JobResultDisplay result={scrollJobResult} title="Scroll Proposal Job" />
          </CardContent>
        </Card>

        {/* Delta Pipeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranchIcon className="h-5 w-5" />
              Delta Pipeline
            </CardTitle>
            <CardDescription>
              Process daily delta calculations and stance computations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Scheduled: Daily at 00:05 UTC</span>
              <Badge variant="outline">
                <ClockIcon className="h-3 w-3 mr-1" />
                5 0 * * *
              </Badge>
            </div>

            <Button
              onClick={runDeltaPipelineJob}
              disabled={deltaJobRunning}
              className="w-full"
            >
              {deltaJobRunning ? (
                <>
                  <LoaderIcon className="h-4 w-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                "Run Now"
              )}
            </Button>

            <JobResultDisplay result={deltaJobResult} title="Delta Pipeline Job" />
          </CardContent>
        </Card>

        {/* Cluster Building */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DatabaseIcon className="h-5 w-5" />
              Point Cluster Building
            </CardTitle>
            <CardDescription>
              Pre-build point clusters to improve delta calculation performance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Scheduled: Daily at 02:00 UTC</span>
              <Badge variant="outline">
                <ClockIcon className="h-3 w-3 mr-1" />
                0 2 * * *
              </Badge>
            </div>

            <Button
              onClick={runClusterBuildJob}
              disabled={clusterJobRunning}
              className="w-full"
            >
              {clusterJobRunning ? (
                <>
                  <LoaderIcon className="h-4 w-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                "Run Now"
              )}
            </Button>

            <JobResultDisplay result={clusterJobResult} title="Cluster Build Job" />
          </CardContent>
        </Card>

        {/* Stance Pipeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ActivityIcon className="h-5 w-5" />
              Stance Pipeline
            </CardTitle>
            <CardDescription>
              Process stance computations for delta calculations (manual only)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Manual execution only</span>
              <Badge variant="secondary">
                On-demand
              </Badge>
            </div>

            <Button
              onClick={runStancePipelineJob}
              disabled={stanceJobRunning}
              className="w-full"
            >
              {stanceJobRunning ? (
                <>
                  <LoaderIcon className="h-4 w-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                "Run Now"
              )}
            </Button>

            <JobResultDisplay result={stanceJobResult} title="Stance Pipeline Job" />
          </CardContent>
        </Card>

        {/* Rate Limit Cleanup */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCwIcon className="h-5 w-5" />
              Rate Limit Cleanup
            </CardTitle>
            <CardDescription>
              Clean up expired rate limit entries from the database
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Scheduled: Every 4 hours</span>
              <Badge variant="outline">
                <ClockIcon className="h-3 w-3 mr-1" />
                0 */4 * * *
              </Badge>
            </div>

            <Button
              onClick={runCleanupJob}
              disabled={cleanupJobRunning}
              className="w-full"
            >
              {cleanupJobRunning ? (
                <>
                  <LoaderIcon className="h-4 w-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                "Run Now"
              )}
            </Button>

            <JobResultDisplay result={cleanupJobResult} title="Rate Limit Cleanup Job" />
          </CardContent>
        </Card>

        {/* Yjs Document Compaction */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DatabaseIcon className="h-5 w-5" />
              Yjs Document Compaction
            </CardTitle>
            <CardDescription>
              Merge historical multiplayer updates to reduce load and egress
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Scheduled: Every 30 minutes</span>
              <Badge variant="outline">
                <ClockIcon className="h-3 w-3 mr-1" />
                */30 * * * *
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              <Link href={yjsStatsLink} target="_blank" className="text-xs text-blue-600 hover:text-blue-800 underline">View Yjs Stats (JSON)</Link>
              <Link href="/api/admin/compact-docs?threshold=0&keepLast=0" className="text-xs text-blue-600 hover:text-blue-800 underline">Compact All Now</Link>
            </div>

            <Button onClick={runYjsCompactionJob} disabled={yjsCompactRunning} className="w-full">
              {yjsCompactRunning ? (
                <>
                  <LoaderIcon className="h-4 w-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                "Run Now"
              )}
            </Button>

            <JobResultDisplay result={yjsCompactResult} title="Yjs Compaction" />
          </CardContent>
        </Card>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
          <CardDescription>Current system status and configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm font-medium">Site Admin Status</p>
              <p className="text-green-600 font-bold">Active</p>
            </div>
            <div>
              <p className="text-sm font-medium">Total Spaces</p>
              <p className="font-bold">{adminStatus.allSpaces.length}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Active Cron Jobs</p>
              <p className="font-bold">5</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Alert>
        <AlertTriangleIcon className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> These jobs run automatically on schedule. Manual execution is for testing and emergency situations only.
          Check the logs for detailed execution information.
        </AlertDescription>
      </Alert>
    </div>
  );
}
