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
      window.location.href = `/experiment/rationale/multiplayer/${encodeURIComponent(id)}`;
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
      toast.success('Rationale deleted successfully');
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
      toast.success('Rationale renamed successfully');
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
          <p className="text-gray-600 mb-6">You need to be logged in to access the multiplayer rationale system.</p>
          <Button onClick={login as any}>Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 top-16 bg-gray-50 ${robotoSlab.className}`}>
      <TooltipProvider>
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-semibold">My Rationales</h1>
              <p className="text-sm text-stone-600">Create, organize, and collaborate on rationale graphs.</p>
            </div>
            <Button onClick={handleCreate} disabled={creating} aria-busy={creating}>
              {creating ? (
                <span className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                "New"
              )}
            </Button>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title or ID"
              className="max-w-sm"
            />
            {loading ? (
              <Skeleton className="h-4 w-36" />
            ) : (
              <div className="text-xs text-stone-600">{owned.length} owned • {visited.length} shared</div>
            )}
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
              <div className="mb-2 text-sm font-medium text-stone-700">Owned by you</div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6 mb-6">
                {owned
                  .filter((d) => {
                    const t = (d.title || "").toLowerCase();
                    const id = d.id.toLowerCase();
                    const q = query.toLowerCase();
                    return !q || t.includes(q) || id.includes(q);
                  })
                  .map((d) => {
                    const title = (d.title || 'New Rationale').trim() || 'New Rationale';
                    const ownerId = (d as any).ownerId || '';
                    const lastOpenAt = d.lastOpenAt ? new Date(d.lastOpenAt as any) : null;
                    const updatedAt = d.updatedAt ? new Date(d.updatedAt as any) : null;
                    const canEditMeta = myId && ownerId && myId === ownerId;
                    console.log('DEBUG: visited card', d.id, 'ownerId:', ownerId, 'myId:', myId, 'canEditMeta:', canEditMeta);
                    return (
                      <Card
                        key={d.id}
                        className={`p-4 hover:shadow-md transition w-full cursor-pointer relative ${openingId === d.id ? 'opacity-60 pointer-events-none' : ''}`}
                        onClick={async () => {
                          if (openingId) return;
                          setOpeningId(d.id);
                          try {
                            try { await recordOpen(d.id); } catch { }
                            router.push(`/experiment/rationale/multiplayer/${encodeURIComponent(d.id)}`);
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
                            <Link href={`/experiment/rationale/multiplayer/${encodeURIComponent(d.id)}`} className="text-base font-medium text-blue-600 hover:underline">
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
              {visited.length > 0 && (
                <>
                  <div className="mt-2 mb-2 text-sm font-medium text-stone-700">Shared with you</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
                    {visited
                      .filter((d) => {
                        const t = (d.title || "").toLowerCase();
                        const id = d.id.toLowerCase();
                        const q = query.toLowerCase();
                        return !q || t.includes(q) || id.includes(q);
                      })
                      .map((d) => {
                        const title = (d.title || 'New Rationale').trim() || 'New Rationale';
                        const ownerId = (d as any).ownerId || '';
                        const lastOpenAt = d.lastOpenAt ? new Date(d.lastOpenAt as any) : null;
                        const updatedAt = d.updatedAt ? new Date(d.updatedAt as any) : null;
                        const canEditMeta = myId && ownerId && myId === ownerId;
                        console.log('DEBUG: card', d.id, 'ownerId:', ownerId, 'myId:', myId, 'canEditMeta:', canEditMeta);
                        return (
                          <Card
                            key={d.id}
                            className={`p-4 hover:shadow-md transition w-full cursor-pointer relative ${openingId === d.id ? 'opacity-60 pointer-events-none' : ''}`}
                            onClick={async () => {
                              if (openingId) return;
                              setOpeningId(d.id);
                              try {
                                try { await recordOpen(d.id); } catch { }
                                router.push(`/experiment/rationale/multiplayer/${encodeURIComponent(d.id)}`);
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
                                <Link href={`/experiment/rationale/multiplayer/${encodeURIComponent(d.id)}`} className="text-base font-medium text-blue-600 hover:underline">
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
                </>
              )}
              {!loading && owned.length === 0 && visited.length === 0 && (
                <div className="mt-10 flex flex-col items-center justify-center text-center">
                  <div className="h-16 w-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-2xl mb-4">💡</div>
                  <h2 className="text-lg font-semibold mb-2">No rationales yet</h2>
                  <p className="text-sm text-stone-600 mb-4">Create your first rationale to start collaborating.</p>
                  <Button onClick={handleCreate}>Create Rationale</Button>
                </div>
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
            <DialogTitle>Rename rationale</DialogTitle>
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
            <AlertDialogTitle>Delete rationale</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the rationale.
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
