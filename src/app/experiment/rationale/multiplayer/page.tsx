"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Roboto_Slab } from 'next/font/google';
import { listOwnedRationales, listVisitedRationales, deleteRationale, renameRationale, createRationale, recordOpen } from "@/actions/experimental/rationales";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCopyUrl } from "@/hooks/viewpoints/useCopyUrl";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
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

const robotoSlab = Roboto_Slab({ subsets: ['latin'] });

type MpDoc = { id: string; title: string | null; updatedAt: string | Date; createdAt: string | Date; ownerId?: string | null; lastOpenAt?: string | Date | null };

export default function MultiplayerRationaleIndexPage() {
  const { authenticated, ready, login, user } = usePrivy();
  const router = useRouter();
  const [owned, setOwned] = useState<MpDoc[]>([]);
  const [visited, setVisited] = useState<MpDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const myId = (user as any)?.id || (user as any)?.sub || (user as any)?.userId || null;
  const [query, setQuery] = useState("");
  const { isCopyingUrl, handleCopyUrl } = useCopyUrl();

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const [o, v] = await Promise.all([
        listOwnedRationales(),
        listVisitedRationales(),
      ]);
      setOwned(o as any);
      setVisited(v as any);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  const [creating, setCreating] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingDraft, setRenamingDraft] = useState<string>("");
  const [renameLoading, setRenameLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const { id } = await createRationale({});
      const host = typeof window !== 'undefined' ? window.location.host : '';
      window.location.href = buildRationaleDetailPath(id, host);
    } catch (e: any) {
      const msg = (e?.message || "").toLowerCase();
      if (msg.includes("unauthorized")) {
        toast.error("Session expired. Please log in again.");
        try { (login as any)?.(); } catch { }
      } else {
        toast.error("Failed to create");
      }
      setCreating(false);
    }
  };

  const handleDelete = async (docId: string) => {
    setDeleteLoading(true);
    try {
      await deleteRationale(docId);
      setOwned((d) => d.filter((x) => x.id !== docId));
      setVisited((d) => d.filter((x) => x.id !== docId));
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

  const handleRenameSubmit = async () => {
    if (!renamingId) return;
    const title = renamingDraft.trim();
    if (!title) return;

    setRenameLoading(true);
    try {
      await renameRationale(renamingId, title);
      setOwned((prev) => prev.map((d) => d.id === renamingId ? { ...d, title } : d));
      setVisited((prev) => prev.map((d) => d.id === renamingId ? { ...d, title } : d));
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

  useEffect(() => { if (ready && authenticated) { load(); } }, [ready, authenticated]);


  if (!ready) {
    return (
      <div className="fixed inset-0 top-16 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="fixed inset-0 top-16 bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg border text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Login Required</h1>
          <p className="text-gray-600 mb-6">You need to be logged in to access the multiplayer board system.</p>
          <Button onClick={login as any}>Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 top-16 ${robotoSlab.className} overflow-y-auto bg-white`}>

      <TooltipProvider>
        <div className="relative max-w-7xl mx-auto p-8 pb-16 pt-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-stone-800">My Boards</h1>
              <p className="text-sm text-stone-600 mt-1">Create, organize, and collaborate on argument boards.</p>
            </div>
            <Button onClick={handleCreate} disabled={creating} aria-busy={creating} className="h-9 px-4">
              {creating ? (
                <span className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                "Untitled"
              )}
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
                    className={`p-4 hover:shadow-md transition w-full cursor-pointer relative border-2 border-dashed border-stone-300 hover:border-stone-400 hover:bg-stone-50/50 ${creating ? 'opacity-60 pointer-events-none' : ''}`}
                    onClick={handleCreate}
                    role="button"
                  >
                    {creating && (
                      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                        <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center mb-2">
                        <svg className="w-4 h-4 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                      <div className="text-sm font-semibold text-stone-700 mb-1">Create New</div>
                      <div className="text-xs text-stone-500">Start a board</div>
                    </div>
                  </Card>

                  {owned
                    .filter((d) => {
                      const t = (d.title || "").toLowerCase();
                      const id = d.id.toLowerCase();
                      const q = query.toLowerCase();
                      return !q || t.includes(q) || id.includes(q);
                    })
                    .map((d) => {
                      const title = (d.title || 'Untitled').trim() || 'Untitled';
                      const ownerId = (d as any).ownerId || '';
                      const lastOpenAt = d.lastOpenAt ? new Date(d.lastOpenAt as any) : null;
                      const updatedAt = d.updatedAt ? new Date(d.updatedAt as any) : null;
                      const canEditMeta = myId && ownerId && myId === ownerId;
                      return (
                        <Card
                          key={d.id}
                          className={`p-4 hover:shadow-md transition w-full cursor-pointer relative ${openingId === d.id ? 'opacity-60 pointer-events-none' : ''}`}
                          onClick={async () => {
                            if (openingId) return;
                            setOpeningId(d.id);
                            try {
                              try { await recordOpen(d.id); } catch { }
                              const host = typeof window !== 'undefined' ? window.location.host : '';
                              router.push(buildRationaleDetailPath(d.id, host));
                            } catch (e: any) {
                              const msg = (e?.message || '').toLowerCase();
                              if (msg.includes('unauthorized')) { toast.error('Session expired. Please log in again.'); try { (login as any)?.(); } catch { } }
                              setOpeningId(null);
                            }
                          }}
                          role="button"
                        >
                          {openingId === d.id && (
                            <div className="absolute top-3 right-3 h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          )}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <Link href={(() => { const host = typeof window !== 'undefined' ? window.location.host : ''; return buildRationaleDetailPath(d.id, host); })()} className="text-base font-medium text-blue-600 hover:underline">
                                {title}
                              </Link>
                              <div className="mt-2 flex items-center gap-2 text-xs text-stone-600">
                                <Avatar className="h-6 w-6"><AvatarFallback>{((d as any).ownerUsername || ownerId || 'U').slice(0, 1).toUpperCase()}</AvatarFallback></Avatar>
                                <span className="">{(d as any).ownerUsername || ownerId || '—'}</span>
                                <span className="text-stone-400">•</span>
                                <span>{lastOpenAt ? `Opened ${lastOpenAt.toLocaleString()}` : updatedAt ? `Updated ${updatedAt.toLocaleString()}` : ''}</span>
                                <span className="text-stone-400">•</span>
                                <span>Created {new Date(d.createdAt as any).toLocaleString()}</span>
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label="More" onClick={(e) => e.stopPropagation()}>⋯</Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()} onPointerDownCapture={(e) => e.stopPropagation()}>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const host = typeof window !== 'undefined' ? window.location.host : '';
                                    const url = buildRationaleDetailPath(d.id, host);
                                    const fullUrl = `${window.location.protocol}//${host}${url}`;
                                    handleCopyUrl(fullUrl);
                                  }}
                                >
                                  {isCopyingUrl ? "Copied!" : "Copy Link"}
                                </DropdownMenuItem>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <DropdownMenuItem
                                      className={!canEditMeta ? "opacity-60 cursor-not-allowed" : undefined}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!canEditMeta) return;
                                        handleRename(d.id, title);
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
                                        setDeletingId(d.id);
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
                    })}
                </div>
              </div>

              {visited.length > 0 && (
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
                      {visited
                        .filter((d) => {
                          const t = (d.title || "").toLowerCase();
                          const id = d.id.toLowerCase();
                          const q = query.toLowerCase();
                          return !q || t.includes(q) || id.includes(q);
                        })
                        .map((d) => {
                          const title = (d.title || 'Untitled').trim() || 'Untitled';
                          const ownerId = (d as any).ownerId || '';
                          const lastOpenAt = d.lastOpenAt ? new Date(d.lastOpenAt as any) : null;
                          const updatedAt = d.updatedAt ? new Date(d.updatedAt as any) : null;
                          const canEditMeta = myId && ownerId && myId === ownerId;
                          return (
                            <Card
                              key={d.id}
                              className={`p-4 hover:shadow-md transition w-full cursor-pointer relative ${openingId === d.id ? 'opacity-60 pointer-events-none' : ''}`}
                              onClick={async () => {
                                if (openingId) return;
                                setOpeningId(d.id);
                                try {
                                  try { await recordOpen(d.id); } catch { }
                                  const host = typeof window !== 'undefined' ? window.location.host : '';
                                  router.push(buildRationaleDetailPath(d.id, host));
                                } catch (e: any) {
                                  const msg = (e?.message || '').toLowerCase();
                                  if (msg.includes('unauthorized')) { toast.error('Session expired. Please log in again.'); try { (login as any)?.(); } catch { } }
                                  setOpeningId(null);
                                }
                              }}
                              role="button"
                            >
                              {openingId === d.id && (
                                <div className="absolute top-3 right-3 h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                              )}
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <Link href={(() => { const host = typeof window !== 'undefined' ? window.location.host : ''; return buildRationaleDetailPath(d.id, host); })()} className="text-base font-medium text-blue-600 hover:underline">
                                    {title}
                                  </Link>
                                  <div className="mt-2 flex items-center gap-2 text-xs text-stone-600">
                                    <Avatar className="h-6 w-6"><AvatarFallback>{((d as any).ownerUsername || ownerId || 'U').slice(0, 1).toUpperCase()}</AvatarFallback></Avatar>
                                    <span className="">{(d as any).ownerUsername || ownerId || '—'}</span>
                                    <span className="text-stone-400">•</span>
                                    <span>{lastOpenAt ? `Opened ${lastOpenAt.toLocaleString()}` : updatedAt ? `Updated ${updatedAt.toLocaleString()}` : ''}</span>
                                    <span className="text-stone-400">•</span>
                                    <span>Created {new Date(d.createdAt as any).toLocaleString()}</span>
                                  </div>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" aria-label="More" onClick={(e) => e.stopPropagation()}>⋯</Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()} onPointerDownCapture={(e) => e.stopPropagation()}>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const host = typeof window !== 'undefined' ? window.location.host : '';
                                        const url = buildRationaleDetailPath(d.id, host);
                                        const fullUrl = `${window.location.protocol}//${host}${url}`;
                                        handleCopyUrl(fullUrl);
                                      }}
                                    >
                                      {isCopyingUrl ? "Copied!" : "Copy Link"}
                                    </DropdownMenuItem>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <DropdownMenuItem
                                          className={!canEditMeta ? "opacity-60 cursor-not-allowed" : undefined}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (!canEditMeta) return;
                                            handleRename(d.id, title);
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
                                            setDeletingId(d.id);
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
                        })}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </TooltipProvider>

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
                <span className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
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
                <span className="h-4 w-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
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
