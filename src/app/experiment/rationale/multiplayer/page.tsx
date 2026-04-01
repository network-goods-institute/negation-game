"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ChangeEvent } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Roboto_Slab } from 'next/font/google';
import { listOwnedRationales, listVisitedRationales, listPinnedRationales, deleteRationale, renameRationale, createRationale, createRationaleFromDocument, recordOpen, duplicateRationale, pinRationale, unpinRationale } from "@/actions/experimental/rationales";
import { listAccessRequests, resolveAccessRequest } from "@/actions/experimental/rationaleAccess";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCopyUrl } from "@/hooks/viewpoints/useCopyUrl";
import { NotificationsSidebarLauncher } from "@/components/experiment/multiplayer/notifications/NotificationsSidebarLauncher";
import { NonDesktopWarning } from "@/components/experiment/multiplayer/NonDesktopWarning";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { buildRationaleDetailPath } from "@/utils/hosts/syncPaths";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { fetchYjsAuthToken } from "@/hooks/experiment/multiplayer/yjs/auth";
import { logger } from "@/lib/logger";
import { LandingPage } from "@/components/landing/LandingPage";
import { FileText, Pin, PlusCircle, Sparkles, Upload } from "lucide-react";

const robotoSlab = Roboto_Slab({ subsets: ['latin'] });

type MpDoc = {
  id: string;
  title: string | null;
  updatedAt: string | Date;
  createdAt: string | Date;
  ownerId?: string | null;
  ownerUsername?: string | null;
  lastOpenAt?: string | Date | null;
  slug?: string | null;
  pinnedAt?: string | Date | null;
};

type AccessRequest = {
  id: string;
  docId: string;
  docTitle: string | null;
  docSlug?: string | null;
  requesterId: string;
  requesterUsername: string | null;
  requestedRole: "viewer" | "editor";
  status: "pending" | "approved" | "declined";
  createdAt: string | Date;
};

const formatRelativeTime = (date: Date | string) => {
  const dateObj = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays >= 1) {
    return dateObj.toLocaleString();
  } else if (diffHours >= 1) {
    return `${diffHours} hours ago`;
  } else if (diffMinutes >= 1) {
    return `${diffMinutes} minutes ago`;
  } else {
    return 'seconds ago';
  }
};

export default function MultiplayerRationaleIndexPage() {
  const { authenticated, ready, login, user } = usePrivy();
  const router = useRouter();
  const [owned, setOwned] = useState<MpDoc[]>([]);
  const [visited, setVisited] = useState<MpDoc[]>([]);
  const [pinned, setPinned] = useState<MpDoc[]>([]);
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const myId = (user as any)?.id || (user as any)?.sub || (user as any)?.userId || null;
  const [query, setQuery] = useState("");
  const { isCopyingUrl, handleCopyUrl } = useCopyUrl();

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const [o, v, p, r] = await Promise.all([
        listOwnedRationales(),
        listVisitedRationales(),
        listPinnedRationales(),
        listAccessRequests(),
      ]);
      setOwned(o as any);
      setVisited(v as any);
      setPinned(p as any);
      setAccessRequests((r as AccessRequest[]) || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [creatingFromDocument, setCreatingFromDocument] = useState(false);
  const [documentText, setDocumentText] = useState("");
  const [documentFileName, setDocumentFileName] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingDraft, setRenamingDraft] = useState<string>("");
  const [renameLoading, setRenameLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [pinningId, setPinningId] = useState<string | null>(null);
  const [unpinningId, setUnpinningId] = useState<string | null>(null);
  const [requestActionId, setRequestActionId] = useState<string | null>(null);

  const navigateToBoard = (id: string, slug?: string | null) => {
    const host = typeof window !== "undefined" ? window.location.host : "";
    const targetPath = buildRationaleDetailPath(id, host, slug || undefined);
    try {
      router.push(targetPath);
    } catch (error) {
      logger.error("Failed to navigate with router.push", error);
      try {
        if (typeof window !== "undefined") {
          window.location.href = targetPath;
        }
      } catch (fallbackError) {
        logger.error("Failed to navigate using window.location.href", fallbackError);
      }
    }
  };

  const resetCreateDialogState = () => {
    setDocumentText("");
    setDocumentFileName(null);
  };

  const handleStartFresh = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const { id, slug } = await createRationale({});
      setCreateDialogOpen(false);
      resetCreateDialogState();
      navigateToBoard(id, slug || null);
    } catch (e: any) {
      const msg = (e?.message || "").toLowerCase();
      if (msg.includes("unauthorized")) {
        toast.error("Session expired. Please log in again.");
        try { (login as any)?.(); } catch { }
      } else {
        toast.error("Failed to create");
      }
    } finally {
      setCreating(false);
    }
  };

  const createBoardFromDocumentText = async (rawText: string) => {
    if (creatingFromDocument) return;
    setCreatingFromDocument(true);
    try {
      const { id, slug } = await createRationaleFromDocument({
        documentText: rawText,
      });
      setCreateDialogOpen(false);
      resetCreateDialogState();
      navigateToBoard(id, slug || null);
    } catch (e: any) {
      const msg = (e?.message || "").toLowerCase();
      if (msg.includes("unauthorized")) {
        toast.error("Session expired. Please log in again.");
        try { (login as any)?.(); } catch { }
      } else {
        toast.error(e?.message || "Failed to build board from document.");
      }
    } finally {
      setCreatingFromDocument(false);
    }
  };

  const handleDocumentFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2_000_000) {
      toast.error("Document is too large. Max size is 2MB.");
      event.target.value = "";
      return;
    }
    try {
      const text = await file.text();
      if (!text.trim()) {
        toast.error("This file has no readable text.");
        return;
      }
      setDocumentText(text);
      setDocumentFileName(file.name);
      await createBoardFromDocumentText(text.trim());
    } catch (error) {
      logger.error("Failed to read transcript file", error);
      toast.error("Failed to read file.");
    } finally {
      event.target.value = "";
    }
  };

  const handleCreateFromDocument = async () => {
    const rawText = documentText.trim();
    if (!rawText) {
      toast.error("Upload a file or paste text first.");
      return;
    }
    await createBoardFromDocumentText(rawText);
  };

  const handleDelete = async (docId: string) => {
    setDeleteLoading(true);
    try {
      await deleteRationale(docId);
      setOwned((d) => d.filter((x) => x.id !== docId));
      setVisited((d) => d.filter((x) => x.id !== docId));
      setPinned((d) => d.filter((x) => x.id !== docId));
      setDeletingId(null);
      toast.success('Board deleted successfully');
    } catch (e: any) {
      const msg = (e?.message || '').toLowerCase();
      if (msg.includes('forbidden')) toast.error('Only the owner can delete');
      else toast.error(e?.message || "Failed to delete");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRename = async (docId: string, currentTitle: string | null) => {
    setRenamingDraft(currentTitle || '');
    setRenamingId(docId);
  };

  const handleDuplicate = async (docId: string, currentTitle: string | null) => {
    if (duplicatingId) return;
    setDuplicatingId(docId);
    try {
      try {
        logger.log(
          JSON.stringify({
            event: "duplicate_click",
            stage: "begin",
            docId,
            currentTitle,
          })
        );
      } catch { }
      const nextTitle = `${(currentTitle || 'Untitled').trim() || 'Untitled'} (Copy)`;

      const getSnapshotBase64 = async (): Promise<string | null> => {
        try {
          const wsUrl = process.env.NEXT_PUBLIC_YJS_WS_URL || "";
          try {
            logger.log(
              JSON.stringify({
                event: "duplicate_click",
                stage: "ws_config",
                docId,
                hasWsUrl: Boolean(wsUrl),
              })
            );
          } catch { }
          if (!wsUrl) return null;

          const roomName = `rationale:${docId}`;
          const doc = new Y.Doc();

          let token: string | null = null;
          try {
            const auth = await fetchYjsAuthToken({ docId });
            token = auth?.token || null;
            logger.log(
              JSON.stringify({
                event: "duplicate_click",
                stage: "token_fetched",
                docId,
                tokenLength: token?.length || 0,
              })
            );
          } catch (e) {
            try {
              logger.log(
                JSON.stringify({
                  event: "duplicate_click",
                  stage: "token_failed",
                  docId,
                  error: e instanceof Error ? e.message : String(e),
                })
              );
            } catch { }
          }

          const provider = new WebsocketProvider(wsUrl, roomName, doc, {
            WebSocketPolyfill: class extends WebSocket {
              constructor(url: string, protocols?: string | string[]) {
                const withAuth =
                  token && token.length ? `${url}?auth=${encodeURIComponent(token)}` : url;
                super(withAuth, protocols);
              }
            } as unknown as typeof WebSocket,
          });

          const waitForSync = () =>
            new Promise<void>((resolve, reject) => {
              let settled = false;
              const timeout = window.setTimeout(() => {
                if (!settled) {
                  settled = true;
                  try { provider.destroy(); } catch { }
                  try {
                    logger.log(
                      JSON.stringify({
                        event: "duplicate_click",
                        stage: "sync_timeout",
                        docId,
                      })
                    );
                  } catch { }
                  resolve(); // best-effort fallback even if timeout
                }
              }, 2500);
              provider.on("sync", () => {
                if (settled) return;
                settled = true;
                try { window.clearTimeout(timeout); } catch { }
                try {
                  logger.log(
                    JSON.stringify({
                      event: "duplicate_click",
                      stage: "sync_ok",
                      docId,
                    })
                  );
                } catch { }
                resolve();
              });
              provider.on("connection-error", () => {
                if (settled) return;
                settled = true;
                try { window.clearTimeout(timeout); } catch { }
                try {
                  logger.log(
                    JSON.stringify({
                      event: "duplicate_click",
                      stage: "connection_error",
                      docId,
                    })
                  );
                } catch { }
                resolve();
              });
              provider.connect();
            });

          await waitForSync();

          const update = Y.encodeStateAsUpdate(doc);
          const u8 = new Uint8Array(update);
          try {
            logger.log(
              JSON.stringify({
                event: "duplicate_click",
                stage: "encode_state",
                docId,
                bytes: u8.length,
              })
            );
          } catch { }
          let binary = "";
          const chunk = 0x8000;
          for (let i = 0; i < u8.length; i += chunk) {
            binary += String.fromCharCode(...u8.subarray(i, i + chunk));
          }
          try { provider.destroy(); } catch { }
          return btoa(binary);
        } catch {
          return null;
        }
      };

      const snapshotBase64 = await getSnapshotBase64();
      try {
        logger.log(
          JSON.stringify({
            event: "duplicate_click",
            stage: "snapshot_ready",
            docId,
            hasSnapshot: Boolean(snapshotBase64),
            snapshotBytesApprox: snapshotBase64 ? snapshotBase64.length : 0,
          })
        );
      } catch { }

      const res = await duplicateRationale(docId, { title: nextTitle, snapshotBase64: snapshotBase64 || undefined });
      const host = typeof window !== 'undefined' ? window.location.host : '';
      toast.success('Board duplicated');
      try {
        logger.log(
          JSON.stringify({
            event: "duplicate_click",
            stage: "done",
            docId,
            newId: res?.id,
            slug: res?.slug || null,
          })
        );
      } catch { }
      window.location.href = buildRationaleDetailPath(res.id, host, res.slug || undefined);
    } catch (e: any) {
      const msg = (e?.message || '').toLowerCase();
      if (msg.includes('unauthorized')) { toast.error('Session expired. Please log in again.'); try { (login as any)?.(); } catch { } }
      else if (msg.includes('forbidden')) toast.error('You do not have access to duplicate this board');
      else toast.error('Failed to duplicate');
      setDuplicatingId(null);
    }
  };

  const handlePinBoard = async (doc: MpDoc) => {
    if (pinningId || unpinningId) return;
    const wasPinned = pinned.some((item) => item.id === doc.id);
    setPinningId(doc.id);
    setPinned((prev) => {
      const filtered = prev.filter((item) => item.id !== doc.id);
      return [{ ...doc, pinnedAt: new Date().toISOString() }, ...filtered];
    });
    try {
      await pinRationale(doc.id);
      setPinned((prev) => {
        if (prev.some((item) => item.id === doc.id)) return prev;
        return [{ ...doc, pinnedAt: new Date().toISOString() }, ...prev];
      });
      toast.success("Board pinned");
    } catch (e: any) {
      if (!wasPinned) {
        setPinned((prev) => prev.filter((item) => item.id !== doc.id));
      }
      const msg = (e?.message || "").toLowerCase();
      if (msg.includes("unauthorized")) {
        toast.error("Session expired. Please log in again.");
        try { (login as any)?.(); } catch { }
      } else if (msg.includes("forbidden")) {
        toast.error("You do not have access to pin this board");
      } else {
        toast.error("Failed to pin board");
      }
    } finally {
      setPinningId(null);
    }
  };

  const handleUnpinBoard = async (docId: string) => {
    if (pinningId || unpinningId) return;
    const previousEntry = pinned.find((item) => item.id === docId);
    const previousIndex = pinned.findIndex((item) => item.id === docId);
    setUnpinningId(docId);
    setPinned((prev) => prev.filter((item) => item.id !== docId));
    try {
      await unpinRationale(docId);
      setPinned((prev) => prev.filter((item) => item.id !== docId));
      toast.success("Board unpinned");
    } catch (e: any) {
      if (previousEntry) {
        setPinned((prev) => {
          if (prev.some((item) => item.id === docId)) return prev;
          const next = prev.slice();
          const insertIndex = previousIndex >= 0 ? Math.min(previousIndex, next.length) : 0;
          next.splice(insertIndex, 0, previousEntry);
          return next;
        });
      }
      const msg = (e?.message || "").toLowerCase();
      if (msg.includes("unauthorized")) {
        toast.error("Session expired. Please log in again.");
        try { (login as any)?.(); } catch { }
      } else {
        toast.error("Failed to unpin board");
      }
    } finally {
      setUnpinningId(null);
    }
  };

  const handleResolveAccessRequest = async (requestId: string, action: "approve" | "decline", role?: "viewer" | "editor") => {
    if (requestActionId) return;
    setRequestActionId(requestId);
    try {
      const result = await resolveAccessRequest({ requestId, action, role });
      if (result?.ok) {
        setAccessRequests((prev) => prev.filter((req) => req.id !== requestId));
        toast.success(action === "decline" ? "Request declined" : "Access granted");
      } else {
        toast.error("Request already handled");
        setAccessRequests((prev) => prev.filter((req) => req.id !== requestId));
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to update request");
    } finally {
      setRequestActionId(null);
    }
  };

  const handleRenameSubmit = async () => {
    if (!renamingId) return;
    const title = renamingDraft.trim();
    if (!title) return;

    setRenameLoading(true);
    try {
      await renameRationale(renamingId, title);
      setOwned((prev) => prev.map((d) => d.id === renamingId ? { ...d, title } : d));
      setVisited((prev) => prev.map((d) => d.id === renamingId ? { ...d, title } : d));
      setPinned((prev) => prev.map((d) => d.id === renamingId ? { ...d, title } : d));
      setRenamingId(null);
      setRenamingDraft('');
      toast.success('Board renamed successfully');
    } catch (e: any) {
      const msg = (e?.message || '').toLowerCase();
      if (msg.includes('forbidden')) toast.error('Only the owner can rename');
      else toast.error(e?.message || "Failed to rename");
    } finally {
      setRenameLoading(false);
    }
  };
  const documentCharCount = documentText.trim().length;
  const documentLineCount = documentText.trim()
    ? documentText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean).length
    : 0;

  const normalizedQuery = query.trim().toLowerCase();
  const matchesQuery = (doc: MpDoc) => {
    if (!normalizedQuery) return true;
    const title = (doc.title || "").toLowerCase();
    const id = doc.id.toLowerCase();
    return title.includes(normalizedQuery) || id.includes(normalizedQuery);
  };
  const pinnedIds = new Set(pinned.map((doc) => doc.id));
  const pinnedVisible = pinned.filter(matchesQuery);
  const ownedVisible = owned.filter((doc) => !pinnedIds.has(doc.id)).filter(matchesQuery);
  const visitedVisible = visited.filter((doc) => !pinnedIds.has(doc.id)).filter(matchesQuery);
  const accessRequestsVisible = accessRequests.filter((req) => {
    if (!normalizedQuery) return true;
    const title = (req.docTitle || "").toLowerCase();
    const requester = (req.requesterUsername || req.requesterId || "").toLowerCase();
    return title.includes(normalizedQuery) || requester.includes(normalizedQuery) || req.docId.toLowerCase().includes(normalizedQuery);
  });

  const renderBoardCard = (doc: MpDoc) => {
    const title = (doc.title || 'Untitled').trim() || 'Untitled';
    const slug = doc.slug || null;
    const ownerId = doc.ownerId || '';
    const lastOpenAt = doc.lastOpenAt ? new Date(doc.lastOpenAt as any) : null;
    const updatedAt = doc.updatedAt ? new Date(doc.updatedAt as any) : null;
    const canEditMeta = myId && ownerId && myId === ownerId;
    const isPinned = pinnedIds.has(doc.id);
    const isPinUpdating = pinningId === doc.id || unpinningId === doc.id;
    return (
      <Card
        key={doc.id}
        className={`p-4 hover:shadow-md transition w-full cursor-pointer relative ${(openingId === doc.id || duplicatingId === doc.id) ? 'opacity-60 pointer-events-none' : ''}`}
        onClick={async (event) => {
          if (event.metaKey || event.ctrlKey) {
            event.preventDefault();
            if (typeof window !== 'undefined') {
              const host = window.location.host;
              const path = buildRationaleDetailPath(doc.id, host, slug);
              const fullUrl = host
                ? `${window.location.protocol}//${host}${path}`
                : path;
              window.open(fullUrl, "_blank", "noopener");
            }
            return;
          }
          if (openingId) return;
          setOpeningId(doc.id);
          try {
            try { await recordOpen(doc.id); } catch (err: any) {
              const msg = (err?.message || "").toLowerCase();
              if (msg.includes("not found")) {
                toast.error("Board no longer exists.");
                setOpeningId(null);
                return;
              }
            }
            const host = typeof window !== 'undefined' ? window.location.host : '';
            router.push(buildRationaleDetailPath(doc.id, host, slug));
          } catch (e: any) {
            const msg = (e?.message || '').toLowerCase();
            if (msg.includes('unauthorized')) { toast.error('Session expired. Please log in again.'); try { (login as any)?.(); } catch { } }
            setOpeningId(null);
          }
        }}
        role="button"
      >
        {(openingId === doc.id || duplicatingId === doc.id) && (
          <div className="absolute top-3 right-3 h-4 w-4 border-2 border-sync border-t-transparent rounded-full animate-spin" />
        )}
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link href={(() => { const host = typeof window !== 'undefined' ? window.location.host : ''; return buildRationaleDetailPath(doc.id, host, slug); })()} className="text-base font-medium text-blue-600 hover:underline">
              {title}
            </Link>
            <div className="mt-2 flex items-center gap-2 text-xs text-stone-600">
              <Avatar className="h-6 w-6"><AvatarFallback>{(doc.ownerUsername || ownerId || 'U').slice(0, 1).toUpperCase()}</AvatarFallback></Avatar>
              <span className="">{doc.ownerUsername || ownerId || '—'}</span>
              <span className="text-stone-400">•</span>
              <span>{lastOpenAt ? `Opened ${formatRelativeTime(lastOpenAt)}` : updatedAt ? `Updated ${formatRelativeTime(updatedAt)}` : ''}</span>
              <span className="text-stone-400">•</span>
              <span>Created {formatRelativeTime(doc.createdAt as any)}</span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="More" onClick={(e) => e.stopPropagation()}>⋯</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()} onPointerDownCapture={(e) => e.stopPropagation()}>
              <DropdownMenuItem
                disabled={isPinUpdating}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isPinned) {
                    handleUnpinBoard(doc.id);
                  } else {
                    handlePinBoard(doc);
                  }
                }}
              >
                {isPinned ? "Unpin board" : "Pin board"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  const host = typeof window !== 'undefined' ? window.location.host : '';
                  const url = buildRationaleDetailPath(doc.id, host, slug);
                  const fullUrl = `${window.location.protocol}//${host}${url}`;
                  handleCopyUrl(fullUrl);
                }}
              >
                {isCopyingUrl ? "Copied!" : "Copy Link"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleDuplicate(doc.id, title);
                }}
              >
                Duplicate
              </DropdownMenuItem>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuItem
                    className={!canEditMeta ? "opacity-60 cursor-not-allowed" : undefined}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!canEditMeta) return;
                      handleRename(doc.id, title);
                    }}
                  >
                    Rename
                  </DropdownMenuItem>
                </TooltipTrigger>
                {!canEditMeta && <TooltipContent className="z-[9999]">Only the owner can rename</TooltipContent>}
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuItem
                    className={!canEditMeta ? "opacity-60 cursor-not-allowed" : "text-red-600 focus:text-red-700"}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!canEditMeta) return;
                      setDeletingId(doc.id);
                    }}
                  >
                    Delete
                  </DropdownMenuItem>
                </TooltipTrigger>
                {!canEditMeta && <TooltipContent className="z-[9999]">Only the owner can delete</TooltipContent>}
              </Tooltip>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>
    );
  };

  useEffect(() => { if (ready && authenticated) { load(); } }, [ready, authenticated]);

  // Wait for Privy to initialize before checking authentication
  if (!ready) {
    return (
      <div className="fixed inset-0 top-16 bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg border text-center max-w-md">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show landing page for unauthenticated users
  if (!authenticated) {
    return <LandingPage onLogin={login as any} />;
  }

  return (
    <div className={`fixed inset-0 top-16 ${robotoSlab.className} overflow-y-auto bg-white`}>
      <NonDesktopWarning fallbackPath="/" />
      <TooltipProvider>
        <div className="relative max-w-7xl mx-auto p-8 pb-16 pt-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-stone-800">My Boards</h1>
              <p className="text-sm text-stone-600 mt-1">Create, organize, and collaborate on boards.</p>
            </div>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              disabled={creating || creatingFromDocument}
              className="h-9 px-4 bg-sync hover:bg-sync-hover text-white"
            >
              New Board
            </Button>
          </div>
          {/* Search and Stats Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-stone-200/50 shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search boards..."
                    className="max-w-sm pl-10 bg-stone-50/50 border-stone-200/50 focus:bg-white"
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                {loading ? (
                  <Skeleton className="h-5 w-40" />
                ) : (
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-stone-100/50 rounded-full">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span className="text-stone-700">
                        <span className="font-semibold text-stone-900">{owned.length}</span> owned
                      </span>
                    </div>
                    {visited.length > 0 && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-stone-100/50 rounded-full">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-stone-700">
                          <span className="font-semibold text-stone-900">{visited.length}</span> shared
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="p-4 w-full">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-4" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {accessRequestsVisible.length > 0 && (
                <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-stone-200/30 p-6 mb-8">
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
                        <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                      <h2 className="text-xl font-semibold text-stone-800">Access requests</h2>
                    </div>
                    <p className="text-sm text-stone-600 ml-11">People asking to view or edit your boards</p>
                  </div>
                  <div className="space-y-3">
                    {accessRequestsVisible.map((req) => {
                      const title = (req.docTitle || "Untitled").trim() || "Untitled";
                      const requesterLabel = req.requesterUsername || req.requesterId;
                      const createdAt = new Date(req.createdAt as any);
                      const host = typeof window !== 'undefined' ? window.location.host : '';
                      const url = buildRationaleDetailPath(req.docId, host, req.docSlug || undefined);
                      const busy = requestActionId === req.id;
                      return (
                        <div key={req.id} className="rounded-lg border border-stone-200 bg-white px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <Link href={url} className="text-sm font-semibold text-blue-600 hover:underline">
                              {title}
                            </Link>
                            <div className="text-xs text-stone-600 mt-1 flex flex-wrap gap-2">
                              <span>Request from {requesterLabel}</span>
                              <span className="text-stone-400">•</span>
                              <span>Asked for {req.requestedRole === "editor" ? "edit" : "view"} access</span>
                              <span className="text-stone-400">•</span>
                              <span>{formatRelativeTime(createdAt)}</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() => handleResolveAccessRequest(req.id, "approve", "viewer")}
                            >
                              Approve view
                            </Button>
                            <Button
                              size="sm"
                              disabled={busy}
                              onClick={() => handleResolveAccessRequest(req.id, "approve", "editor")}
                            >
                              Approve edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busy}
                              className="text-stone-600 hover:text-stone-900"
                              onClick={() => handleResolveAccessRequest(req.id, "decline")}
                            >
                              Decline
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {pinnedVisible.length > 0 && (
                <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-stone-200/30 p-6 mb-8">
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                        <Pin className="w-4 h-4 text-amber-700" />
                      </div>
                      <h2 className="text-xl font-semibold text-stone-800">Pinned boards</h2>
                    </div>
                    <p className="text-sm text-stone-600 ml-11">Boards pinned for quick access</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
                    {pinnedVisible.map(renderBoardCard)}
                  </div>
                </div>
              )}
              {/* Owned Rationales Section */}
              <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-stone-200/30 p-6 mb-8">
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-stone-800">Owned by you</h2>
                  </div>
                  <p className="text-sm text-stone-600 ml-11">Your personal boards</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
                  {/* Create New Rationale Card */}
                  <Card
                    className={`p-4 hover:shadow-md transition w-full cursor-pointer relative border-2 border-dashed border-stone-300 hover:border-stone-400 hover:bg-stone-50/50 ${(creating || creatingFromDocument) ? 'opacity-60 pointer-events-none' : ''}`}
                    onClick={() => setCreateDialogOpen(true)}
                    role="button"
                  >
                    <div className="flex h-full flex-col justify-between gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100">
                          <PlusCircle className="h-5 w-5 text-stone-600" />
                        </div>
                        <span className="rounded-full bg-stone-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-stone-600">
                          Quick Start
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-stone-800">Create New</div>
                        <div className="mt-1 text-xs text-stone-500">Start fresh or build from a transcript (Beta)</div>
                      </div>
                    </div>
                  </Card>

                  {ownedVisible.map(renderBoardCard)}
                </div>
              </div>

              {visitedVisible.length > 0 && (
                <>
                  {/* Shared Rationales Section */}
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-stone-200/30 p-6 mb-8">
                    <div className="mb-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-stone-800">Shared with you</h2>
                      </div>
                      <p className="text-sm text-stone-600 ml-11">Collaborative boards from others</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
                      {visitedVisible.map(renderBoardCard)}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </TooltipProvider>
      <NotificationsSidebarLauncher enabled={authenticated} />

      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          if (!open && (creating || creatingFromDocument)) return;
          setCreateDialogOpen(open);
          if (!open) {
            resetCreateDialogState();
            setCreating(false);
            setCreatingFromDocument(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl border-stone-200 bg-gradient-to-b from-white to-stone-50/80 p-0">
          <DialogHeader>
            <div className="border-b border-stone-200/70 px-6 pb-4 pt-6">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                <Sparkles className="h-3.5 w-3.5" />
                Beta
              </div>
              <DialogTitle>Create board</DialogTitle>
              <DialogDescription className="mt-2 max-w-2xl text-stone-600">
                Build from document extracts argument points and links, then creates your board instantly.
                Or start with a blank board.
              </DialogDescription>
            </div>
          </DialogHeader>
          <div className="grid gap-4 px-6 pb-6 md:grid-cols-[1.65fr_1fr]">
            <div className="rounded-xl border border-sync/25 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-stone-900">
                    <FileText className="h-4 w-4 text-sync" />
                    Build from document
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                      Beta
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-stone-600">
                    Uploading a file creates the board immediately. Or paste transcript text below.
                  </p>
                </div>
                <span className="rounded-full bg-stone-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-stone-600">
                  Fastest
                </span>
              </div>

              <div className="mt-4">
                <label className="flex w-full cursor-pointer flex-col gap-1 rounded-lg border border-dashed border-stone-300 bg-stone-50/70 p-3 text-sm font-medium text-stone-700">
                  <span className="flex items-center gap-2">
                    <Upload className="h-4 w-4 text-stone-500" />
                    Upload transcript file
                  </span>
                  <span className="text-xs font-normal text-stone-500">Accepted: txt, md, rtf up to 2MB</span>
                  <Input
                    type="file"
                    accept=".txt,.md,.rtf,text/plain,text/markdown"
                    onChange={handleDocumentFileChange}
                    disabled={creatingFromDocument || creating}
                    className="sr-only"
                  />
                </label>
              </div>

              {documentFileName && (
                <div className="mt-3 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-700">
                  Selected file: <span className="font-medium">{documentFileName}</span>
                </div>
              )}

              <div className="mt-3">
                <Textarea
                  value={documentText}
                  onChange={(event) => setDocumentText(event.target.value)}
                  placeholder="Paste transcript text here..."
                  className="min-h-40 resize-y border-stone-300 bg-white"
                  disabled={creatingFromDocument || creating}
                />
                <div className="mt-2 flex items-center justify-between text-xs text-stone-500">
                  <span>{documentLineCount} lines</span>
                  <span>{documentCharCount.toLocaleString()} chars</span>
                </div>
              </div>

              <Button
                className="mt-4 w-full bg-sync hover:bg-sync-hover text-white"
                onClick={handleCreateFromDocument}
                disabled={creatingFromDocument || creating || !documentText.trim()}
              >
                {creatingFromDocument ? (
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Create from document"
                )}
              </Button>
            </div>

            <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex h-full flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-stone-900">
                    <PlusCircle className="h-4 w-4 text-stone-500" />
                    Start fresh
                  </div>
                  <p className="mt-1 text-xs text-stone-600">
                    Open a blank board and add options and objections manually.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="mt-4 w-full border-stone-300 text-stone-800 hover:bg-stone-50"
                  onClick={handleStartFresh}
                  disabled={creating || creatingFromDocument}
                >
                  {creating ? (
                    <span className="h-4 w-4 border-2 border-sync border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Start fresh"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={!!renamingId} onOpenChange={(open) => {
        if (!open) {
          setRenamingId(null);
          setRenamingDraft("");
          setRenameLoading(false);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename board</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={renamingDraft}
              onChange={(e) => setRenamingDraft(e.target.value)}
              placeholder="Enter title"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameSubmit();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRenamingId(null);
                setRenamingDraft("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRenameSubmit}
              disabled={renameLoading || !renamingDraft.trim()}
            >
              {renameLoading ? (
                <span className="h-4 w-4 border-2 border-sync border-t-transparent rounded-full animate-spin" />
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => {
        if (!open) {
          setDeletingId(null);
          setDeleteLoading(false);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete board</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the board.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(deletingId!)}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLoading ? (
                <span className="h-4 w-4 border-2 border-sync border-t-transparent rounded-full animate-spin" />
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
