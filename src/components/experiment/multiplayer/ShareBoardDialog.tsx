"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  const isOwner = accessRole === "owner";

  const refresh = useMemo(
    () => async () => {
      if (!open || !docId) return;
      if (!isOwner) {
        setLinks([]);
        setCollaborators([]);
        return;
      }
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
        className="sm:max-w-md overflow-visible"
      >
        <DialogHeader>
          <DialogTitle className="text-lg">Share</DialogTitle>
          <DialogDescription className="text-sm">Anyone with the link can access</DialogDescription>
        </DialogHeader>

        {!isOwner && (
          <div className="rounded-md bg-amber-50 text-amber-900 text-xs p-2.5 border border-amber-100">
            Only the owner can manage sharing
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Select value={shareRole} onValueChange={(v) => setShareRole(v as ShareRole)} disabled={!isOwner}>
                <SelectTrigger className="h-9 flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer" className="cursor-pointer hover:bg-stone-100">Can view</SelectItem>
                  <SelectItem value="editor" className="cursor-pointer hover:bg-stone-100">Can edit</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={() => handleCopyLink(shareRole)}
                disabled={pending || !isOwner}
              >
                {pending ? "..." : "Copy link"}
              </Button>
            </div>

            <div className="space-y-1 text-sm">
              <label className="flex items-center justify-between py-1">
                <span className="text-stone-600">Require sign-in</span>
                <Switch checked={requireLogin} onCheckedChange={setRequireLogin} disabled={!isOwner} />
              </label>
            </div>

            <div className="space-y-1.5 pt-2 border-t">
              <div className="flex items-center justify-between text-xs text-stone-600">
                <span className="font-medium text-stone-700">Share links</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${requireLogin ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                  {requireLogin ? "Sign-in required" : "Works logged out"}
                </span>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto overflow-x-hidden pr-1">
                {links.length === 0 && (
                  <div className="text-xs text-stone-500 px-1 py-1.5 rounded bg-stone-50 border border-dashed border-stone-200">
                    No active links yet. Create a link to share.
                  </div>
                )}
                {links.map((link) => {
                  const url = buildShareUrl(link.token);
                  const isPublic = !link.requireLogin;
                  const label = link.role === "editor" ? "Edit" : "View";
                  return (
                    <div key={link.id} className="group flex items-center gap-2 p-2 rounded border border-stone-200 bg-white hover:border-stone-300">
                      <div className="flex items-start gap-2 min-w-0 flex-1">
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${link.role === "editor" ? "bg-indigo-100 text-indigo-700" : "bg-stone-100 text-stone-700"}`}>
                          {label[0]}
                        </div>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-stone-600">
                            <span className="font-semibold text-stone-800">{label} link</span>
                            <span className={`px-1.5 py-0.5 rounded-full ${isPublic ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                              {isPublic ? "No login" : "Login required"}
                            </span>
                          </div>
                          <button
                            className="text-[11px] text-blue-700 hover:text-blue-900 break-all text-left w-full"
                            onClick={() => copyShareUrl(link.token)}
                            title={url}
                          >
                            {url}
                          </button>
                        </div>
                      </div>
                      {isOwner && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => copyShareUrl(link.token, label)}
                            disabled={pending}
                            className="h-7 px-2 text-[11px]"
                          >
                            Copy
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevoke(link.id)}
                            disabled={pending}
                            className="h-7 px-2 text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            Revoke
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {isOwner && (
            <>
              <Separator />

              <div className="space-y-2">
                <div className="text-sm font-medium text-stone-700">People</div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      type="text"
                      placeholder="Username"
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
                      className="h-9"
                    />
                    {userDropdownOpen && filteredUsers.length > 0 && (
                      <div
                        className="absolute z-50 w-full left-0 right-0 top-full translate-y-1 bg-white border border-stone-200 rounded-md shadow-lg max-h-[152px] overflow-y-auto overflow-x-hidden overscroll-contain"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        style={{ overscrollBehavior: "contain" }}
                      >
                        {filteredUsers.map((user) => (
                          <div
                            key={user.id}
                            className="px-3 py-2 hover:bg-stone-100 cursor-pointer text-sm text-stone-900"
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
                              <span>{user.username}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Select value={targetRole} onValueChange={(v) => setTargetRole(v as ShareRole)}>
                    <SelectTrigger className="h-9 w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer" className="cursor-pointer hover:bg-stone-100">View</SelectItem>
                      <SelectItem value="editor" className="cursor-pointer hover:bg-stone-100">Edit</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={handleAddCollaborator}
                    disabled={pending || !(targetUsername.trim() || userInputValue.trim())}
                  >
                    Add
                  </Button>
                </div>

                {visibleCollaborators.length > 0 && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-stone-500">
                        {visibleCollaborators.length} {visibleCollaborators.length === 1 ? 'person' : 'people'} with access
                      </span>
                    </div>
                    <div className="space-y-0.5 max-h-[180px] overflow-y-auto overflow-x-hidden pr-1">
                      {visibleCollaborators.map((c) => (
                        <div key={`${c.userId}-${c.role}`} className="group flex items-center justify-between p-1 rounded hover:bg-stone-50">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-200 text-[10px] font-medium text-stone-700">
                              {(c.username || c.userId)[0]?.toUpperCase()}
                            </div>
                            <div className="flex items-center justify-between gap-2 min-w-0 flex-1">
                              <span className="text-xs text-stone-700 truncate">{c.username || c.userId}</span>
                              {isOwner ? (
                                <Select
                                  value={c.role === "editor" ? "editor" : "viewer"}
                                  onValueChange={(v) => handleChangeRole(c.userId, v as ShareRole)}
                                  disabled={roleUpdating[c.userId] || pending}
                                >
                                  <SelectTrigger className="h-7 w-24 text-[11px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="viewer" className="cursor-pointer hover:bg-stone-100 text-[11px]">View</SelectItem>
                                    <SelectItem value="editor" className="cursor-pointer hover:bg-stone-100 text-[11px]">Edit</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="text-[10px] text-stone-500 shrink-0">{c.role === "editor" ? "edit" : "view"}</span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveCollaborator(c.userId)}
                            disabled={pending}
                            className="opacity-0 group-hover:opacity-100 h-5 px-1.5 text-[10px] text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
