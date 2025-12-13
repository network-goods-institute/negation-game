"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { createShareLink, listShareLinks, revokeShareLink, setUserAccess, listCollaborators, removeUserAccess } from "@/actions/experimental/rationaleAccess";
import { buildRationaleDetailPath } from "@/utils/hosts/syncPaths";
import { DocAccessRole } from "@/services/mpAccess";
import { fetchAllUsers } from "@/actions/users/fetchAllUsers";
import { logger } from "@/lib/logger";

type ShareRole = "viewer" | "editor";

type ShareLink = {
  id: string;
  token: string;
  role: ShareRole;
  requireLogin: boolean;
  expiresAt: string | null;
  createdAt?: string | null;
};

type Collaborator = {
  userId: string;
  username: string | null;
  role: DocAccessRole;
  grantedBy: string | null;
  createdAt: string;
};

type ShareBoardDialogProps = {
  docId: string;
  slug?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accessRole?: DocAccessRole | null;
  currentUserId?: string;
  currentUsername?: string;
};

export function ShareBoardDialog({ docId, slug, open, onOpenChange, accessRole, currentUserId, currentUsername }: ShareBoardDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const [shareRole, setShareRole] = useState<ShareRole>("viewer");
  const [requireLogin, setRequireLogin] = useState(false);
  const [links, setLinks] = useState<Array<ShareLink>>([]);
  const [collaborators, setCollaborators] = useState<Array<Collaborator>>([]);
  const [targetUsername, setTargetUsername] = useState("");
  const [targetRole, setTargetRole] = useState<ShareRole>("viewer");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<Array<{ id: string; username: string }>>([]);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [userInputValue, setUserInputValue] = useState("");
  const [roleUpdating, setRoleUpdating] = useState<Record<string, boolean>>({});
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const isOwner = accessRole === "owner";

  const refresh = useMemo(
    () => async () => {
      if (!open || !docId) return;
      if (!isOwner) {
        setLinks([]);
        setCollaborators([]);
        return;
      }
      setLoading(true);
      try {
        const [ls, cs] = await Promise.all([listShareLinks(docId), listCollaborators(docId)]);
        const normalizedLinks = (ls as Array<any>).map((link) => ({
          id: link.id,
          token: link.token,
          role: link.role as ShareRole,
          requireLogin: Boolean(link.requireLogin),
          expiresAt: link.expiresAt ? String(link.expiresAt) : null,
          createdAt: link.createdAt ? String(link.createdAt) : null,
        }));
        setLinks(normalizedLinks);
        if (normalizedLinks[0]) {
          setRequireLogin(Boolean(normalizedLinks[0].requireLogin));
        } else {
          setRequireLogin(false);
        }
        setCollaborators((cs as any[]).map((c) => ({
          userId: c.userId,
          username: c.username || null,
          role: c.role as DocAccessRole,
          grantedBy: c.grantedBy || "",
          createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : String(c.createdAt),
        })));
      } catch (error: any) {
        toast.error(error?.message || "Failed to load sharing state");
      } finally {
        setLoading(false);
      }
    },
    [docId, open, isOwner]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    const stopOutsidePointerMove = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (dialogRef.current && target && dialogRef.current.contains(target)) return;
      event.stopPropagation();
      event.preventDefault();
    };
    const opts: AddEventListenerOptions = { capture: true, passive: false };
    window.addEventListener("pointermove", stopOutsidePointerMove, opts);
    return () => {
      window.removeEventListener("pointermove", stopOutsidePointerMove, opts);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !isOwner) return;
    const loadUsers = async () => {
      try {
        const users = await fetchAllUsers();
        setAllUsers(users.map((u) => ({ id: u.id, username: u.username })));
      } catch (error) {
        logger.error("Failed to fetch users:", error);
      }
    };
    loadUsers();
  }, [open, isOwner]);

  const filteredUsers = useMemo(() => {
    const existingUsernames = new Set(collaborators.map((c) => c.username).filter(Boolean));
    const existingIds = new Set(collaborators.map((c) => c.userId));
    const available = allUsers.filter((u) => {
      // Exclude current user
      if (currentUsername && u.username === currentUsername) return false;
      if (currentUserId && u.id === currentUserId) return false;
      // Exclude existing collaborators
      if (existingUsernames.has(u.username)) return false;
      if (existingIds.has(u.id)) return false;
      return true;
    });

    if (!userInputValue) return available.slice(0, 50);
    const query = userInputValue.toLowerCase();
    return available.filter((u) => u.username.toLowerCase().includes(query)).slice(0, 50);
  }, [allUsers, userInputValue, collaborators, currentUsername, currentUserId]);

  const visibleCollaborators = useMemo(
    () =>
      collaborators.filter((c) => {
        if (c.role === "owner") return false;
        if (currentUserId && c.userId === currentUserId) return false;
        return true;
      }),
    [collaborators, currentUserId]
  );

  useEffect(() => {
    const handleClickOutside = () => {
      setUserDropdownOpen(false);
    };
    if (userDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [userDropdownOpen]);

  const buildShareUrl = (token: string) => {
    const host = typeof window !== "undefined" ? window.location.host : "";
    const protocol = typeof window !== "undefined" ? window.location.protocol : "https:";
    const path = buildRationaleDetailPath(docId, host, slug || undefined);
    return `${protocol}//${host}${path}?share=${token}`;
  };

  const copyShareUrl = async (token: string, label?: string) => {
    try {
      const url = buildShareUrl(token);
      await navigator.clipboard.writeText(url);
      if (label) {
        toast.success(`${label} link copied`);
      } else {
        toast.success("Link copied");
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to copy link");
    }
  };

  const handleCopyLink = (role: ShareRole) => {
    if (!docId) {
      toast.error("Board not ready");
      return;
    }
    if (!isOwner) {
      toast.error("Only owners can create share links");
      return;
    }
    startTransition(async () => {
      try {
        const link = await createShareLink(docId, {
          role,
          requireLogin,
          expiresAt: null,
        });
        await copyShareUrl(link.token, role === "editor" ? "Edit" : "View");
        refresh();
      } catch (error: any) {
        toast.error(error?.message || "Failed to create link");
      }
    });
  };

  const handleRevoke = (linkId: string) => {
    if (!isOwner) return;
    startTransition(async () => {
      try {
        await revokeShareLink(docId, linkId);
        toast.success("Link revoked");
        refresh();
      } catch (error: any) {
        toast.error(error?.message || "Failed to revoke");
      }
    });
  };

  const handleAddCollaborator = () => {
    const usernameValue = (targetUsername || userInputValue).trim();
    if (!isOwner || !usernameValue || !docId) return;
    const matchedUser = selectedUserId
      ? allUsers.find((u) => u.id === selectedUserId)
      : allUsers.find((u) => u.username.toLowerCase() === usernameValue.toLowerCase());
    if (!matchedUser) {
      toast.error("User not found");
      return;
    }
    startTransition(async () => {
      try {
        await setUserAccess(docId, matchedUser.id, targetRole);
        toast.success("Access granted");
        setTargetUsername("");
        setUserInputValue("");
        setSelectedUserId(null);
        refresh();
      } catch (error: any) {
        toast.error(error?.message || "User not found");
      }
    });
  };

  const handleRemoveCollaborator = (userId: string) => {
    if (!isOwner || !docId) return;
    if (currentUserId && userId === currentUserId) return;
    const target = collaborators.find((c) => c.userId === userId);
    if (target?.role === "owner") return;
    startTransition(async () => {
      try {
        await removeUserAccess(docId, userId);
        toast.success("Access removed");
        refresh();
      } catch (error: any) {
        toast.error(error?.message || "Failed to remove access");
      }
    });
  };

  const handleChangeRole = (userId: string, role: ShareRole) => {
    if (!isOwner || !docId) return;
    setRoleUpdating((prev) => ({ ...prev, [userId]: true }));
    startTransition(async () => {
      try {
        await setUserAccess(docId, userId, role);
        toast.success("Access updated");
        refresh();
      } catch (error: any) {
        toast.error(error?.message || "Failed to update access");
      } finally {
        setRoleUpdating((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={dialogRef}
        className="sm:max-w-4xl relative max-h-[85vh] overflow-y-auto top-[38%] translate-y-[-38%] sm:top-[40%] sm:translate-y-[-40%]"
      >
        <DialogClose asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close sharing dialog"
            className="absolute right-3 top-3 h-9 w-9 text-stone-500 hover:text-stone-700 hover:bg-stone-100"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </DialogClose>
        <DialogHeader className="pb-4">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-100">
              <svg className="h-3.5 w-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
            </div>
            Share board
          </DialogTitle>
          <DialogDescription className="text-sm text-stone-600">
            Invite people to collaborate
          </DialogDescription>
        </DialogHeader>

        {!isOwner && (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-3 mb-4">
            <p className="text-sm text-amber-800 font-medium flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            Only the owner can manage sharing
            </p>
          </div>
        )}

        <div className="space-y-5">
          {/* Share Link Card */}
          <div className="rounded-lg border border-stone-200 bg-gradient-to-br from-stone-50 to-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
                <svg className="h-4 w-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Share link
              </h3>
              <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                requireLogin
                  ? "bg-amber-100 text-amber-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}>
                <div className={`h-1.5 w-1.5 rounded-full ${requireLogin ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                {requireLogin ? "Sign-in required" : "No sign-in needed"}
              </div>
            </div>

          <div className="space-y-3">
              <div className="flex gap-2">
                <Select
                  value={shareRole}
                  onValueChange={(v) => setShareRole(v as ShareRole)}
                  disabled={!isOwner}
                >
                  <SelectTrigger className="flex-1 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="viewer">Can view</SelectItem>
                    <SelectItem value="editor">Can edit</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => handleCopyLink(shareRole)}
                disabled={pending || !isOwner}
                  className="h-9 px-3"
              >
                  {pending ? "..." : "Copy"}
              </Button>
            </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-600">Require sign-in</span>
                <Switch
                  checked={requireLogin}
                  onCheckedChange={setRequireLogin}
                  disabled={!isOwner}
                />
              </div>
            </div>
              </div>

          {/* Active Links */}
          {(links.length > 0 || loading) && (
            <div className="rounded-lg border border-stone-200 bg-white p-4">
              <h4 className="text-sm font-semibold text-stone-900 mb-3 flex items-center gap-2">
                <svg className="h-4 w-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Active links
              </h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {loading ? (
                  <div className="animate-pulse flex items-center gap-3 p-2 rounded bg-stone-50">
                    <div className="h-6 w-6 rounded-full bg-stone-200"></div>
                    <div className="flex-1 space-y-1">
                      <div className="h-3 bg-stone-200 rounded w-16"></div>
                      <div className="h-2 bg-stone-200 rounded w-3/4"></div>
                    </div>
                  </div>
                ) : (
                  links.map((link) => {
                  const url = buildShareUrl(link.token);
                  const isPublic = !link.requireLogin;
                  const label = link.role === "editor" ? "Edit" : "View";
                  return (
                      <div key={link.id} className="group flex items-center gap-3 p-2 rounded bg-stone-50 hover:bg-stone-100 transition-colors">
                        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                          link.role === "editor"
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-stone-100 text-stone-700"
                        }`}>
                          {label[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-xs font-medium text-stone-900">{label} link</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                              isPublic
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }`}>
                              {isPublic ? "Public" : "Private"}
                            </span>
                          </div>
                          <button
                            className="text-[10px] text-blue-600 hover:text-blue-800 hover:underline truncate block w-full text-left"
                            onClick={() => copyShareUrl(link.token)}
                            title={url}
                          >
                            {url}
                          </button>
                      </div>
                      {isOwner && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevoke(link.id)}
                            disabled={pending}
                            aria-label="Revoke link"
                            className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                          >
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </Button>
                      )}
                    </div>
                  );
                  })
                )}
              </div>
            </div>
          )}

          {isOwner && (
            <>
              {/* People Card */}
              <div className="rounded-lg border border-stone-200 bg-gradient-to-br from-stone-50 to-white p-4">
                <h3 className="text-sm font-semibold text-stone-900 mb-3 flex items-center gap-2">
                  <svg className="h-4 w-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Add people
                </h3>

                <div className="flex gap-2 mb-3">
                  <div className="relative flex-1">
                    <Input
                      type="text"
                      placeholder="Username..."
                      value={userInputValue}
                      onChange={(e) => {
                        setUserInputValue(e.target.value);
                        setTargetUsername(e.target.value);
                        setUserDropdownOpen(true);
                        setSelectedUserId(null);
                      }}
                      onFocus={() => setUserDropdownOpen(true)}
                      onClick={(e) => {
                        setUserDropdownOpen(true);
                        e.stopPropagation();
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="h-9 text-sm"
                    />
                    {userDropdownOpen && filteredUsers.length > 0 && (
                      <div
                        className="absolute z-50 w-full left-0 right-0 top-full translate-y-1 bg-white border border-stone-200 rounded-md shadow-lg max-h-[160px] overflow-y-auto"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        {filteredUsers.slice(0, 6).map((user) => (
                          <div
                            key={user.id}
                            className="px-3 py-2 hover:bg-stone-50 cursor-pointer text-sm"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setTargetUsername(user.username);
                              setUserInputValue(user.username);
                              setSelectedUserId(user.id);
                              setUserDropdownOpen(false);
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-200 text-xs font-medium text-stone-700">
                                {user.username[0]?.toUpperCase()}
                              </div>
                              <span className="text-stone-900">{user.username}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Select value={targetRole} onValueChange={(v) => setTargetRole(v as ShareRole)}>
                    <SelectTrigger className="w-20 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">View</SelectItem>
                      <SelectItem value="editor">Edit</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleAddCollaborator}
                    disabled={pending || !(targetUsername.trim() || userInputValue.trim())}
                    className="h-9 px-3"
                  >
                    Add
                  </Button>
                </div>

                {/* Collaborators */}
                {loading ? (
                  <div className="space-y-1.5 pt-3 border-t">
                    <div className="animate-pulse flex items-center gap-2 mb-2">
                      <div className="h-3 bg-stone-200 rounded w-24"></div>
                    </div>
                      {[1, 2].map((i) => (
                      <div key={i} className="animate-pulse flex items-center gap-2 p-1.5">
                        <div className="h-4 w-4 rounded-full bg-stone-200"></div>
                            <div className="flex-1 h-3 bg-stone-200 rounded"></div>
                        <div className="h-6 w-16 bg-stone-200 rounded"></div>
                        </div>
                      ))}
                  </div>
                ) : visibleCollaborators.length > 0 ? (
                  <div className="space-y-2 pt-3 border-t">
                    <div className="text-xs text-stone-500 mb-2">
                        {visibleCollaborators.length} {visibleCollaborators.length === 1 ? 'person' : 'people'} with access
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {visibleCollaborators.map((c) => (
                        <div key={`${c.userId}-${c.role}`} className="group flex items-center gap-2 p-1.5 rounded hover:bg-stone-50/80 transition-colors">
                          <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-stone-200 text-[10px] font-medium text-stone-700">
                              {(c.username || c.userId)[0]?.toUpperCase()}
                            </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-medium text-stone-900 truncate">
                              {c.username || c.userId}
                            </span>
                          </div>
                              {isOwner ? (
                                <Select
                                  value={c.role === "editor" ? "editor" : "viewer"}
                                  onValueChange={(v) => handleChangeRole(c.userId, v as ShareRole)}
                                  disabled={roleUpdating[c.userId] || pending}
                                >
                              <SelectTrigger className="h-6 w-16 text-[10px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                <SelectItem value="viewer" className="text-[10px]">View</SelectItem>
                                <SelectItem value="editor" className="text-[10px]">Edit</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                            <span className="text-[10px] text-stone-500 px-1.5 py-0.5 rounded bg-stone-100">
                              {c.role === "editor" ? "edit" : "view"}
                            </span>
                              )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveCollaborator(c.userId)}
                            disabled={pending}
                            className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 transition-opacity"
                          >
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
