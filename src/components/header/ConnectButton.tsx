"use client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { useUser } from "@/queries/users/useUser";
import { usePrivy } from "@privy-io/react-auth";
import { clearPrivyCookie } from '@/actions/users/auth';
import { LoaderCircleIcon, CoinsIcon, UserIcon, LogOutIcon, TrophyIcon, BellIcon, SettingsIcon, MessageSquareIcon, BarChart3Icon, ChevronDownIcon, ShieldIcon, ShieldCheckIcon } from "lucide-react";
import { useAdminStatus } from "@/hooks/admin/useAdminStatus";
import { useState, useEffect, useRef, useMemo } from "react";
import { EarningsDialog } from "../dialogs/EarningsDialog";
import Link from "next/link";
import { LeaderboardDialog } from "@/components/dialogs/LeaderboardDialog";
import { useUnreadNotificationCount } from "@/queries/notifications/useNotifications";
import { useUnreadMessageCount } from "@/queries/messages/useUnreadMessageCount";
import { useIncompleteAssignmentCount } from "@/queries/assignments/useIncompleteAssignmentCount";
import { Badge } from "@/components/ui/badge";
import { useRouter, usePathname } from "next/navigation";
import { setPrivyToken } from "@/lib/privy/setPrivyToken";
import { useEnsureUser } from "@/hooks/auth/useEnsureUser";
import { UsernameSignupDialog } from "@/components/dialogs/UsernameSignupDialog";
import { isFeatureEnabled } from "@/lib/featureFlags";

export const ConnectButton = () => {
  const { ready, login, logout, user: privyUser, authenticated } = usePrivy();
  const { data: user, isLoading } = useUser(privyUser?.id);
  useEnsureUser();
  const [signupOpen, setSignupOpen] = useState(true);
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const notificationsEnabled = isFeatureEnabled('notifications');
  const incompleteAssignmentCount = useIncompleteAssignmentCount();
  const router = useRouter();
  const pathname = usePathname();

  const currentSpace = pathname.match(/^\/s\/([^\/]+)/)?.[1];
  const { data: unreadMessageCount = 0 } = useUnreadMessageCount(currentSpace || "global");
  const { data: adminStatus } = useAdminStatus();
  const prevPathRef = useRef(pathname);
  const defaultSpacesRef = useRef<string[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await login();
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Proactively set the HttpOnly Privy token cookie once we have a Privy user
  const tokenSetRef = useRef(false);
  useEffect(() => {
    if (!privyUser?.id) {
      tokenSetRef.current = false;
      return;
    }

    tokenSetRef.current = false;
  }, [privyUser?.id]);

  useEffect(() => {
    if (!ready || !authenticated || !privyUser?.id || tokenSetRef.current) return;

    let cancelled = false;

    (async () => {
      try {
        const success = await setPrivyToken({ force: true });
        if (success && !cancelled) {
          tokenSetRef.current = true;
        }
      } catch (error) {
        console.error("Failed to persist Privy token during connect flow", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, privyUser?.id]);

  // Check if user is admin of any space or is site admin
  const isAnySpaceAdmin = adminStatus?.siteAdmin || (adminStatus?.adminSpaces && adminStatus.adminSpaces.length > 0);

  // For site admins, use allSpaces; for space admins, use adminSpaces
  const availableAdminSpaces = adminStatus?.siteAdmin ? (adminStatus.allSpaces || []) : (adminStatus?.adminSpaces || []);

  // If user is admin of multiple spaces, show submenu; otherwise show direct link
  const hasMultipleAdminSpaces = availableAdminSpaces.length > 1;

  const isSiteAdmin = Boolean(adminStatus?.siteAdmin);
  const allSpaces = adminStatus?.allSpaces ?? defaultSpacesRef.current;
  const adminSpacesList = adminStatus?.adminSpaces ?? defaultSpacesRef.current;

  useEffect(() => {
    prevPathRef.current = pathname;
  }, [pathname]);

  const prefetchTargets = useMemo(() => {
    const spaces = isSiteAdmin ? allSpaces : adminSpacesList;
    const targets = spaces.map((space) => `/s/${space}/admin`);
    if (isSiteAdmin) targets.push("/admin");
    return targets;
  }, [isSiteAdmin, allSpaces, adminSpacesList]);

  useEffect(() => {
    if (!menuOpen || prefetchTargets.length === 0) return;
    prefetchTargets.forEach((t) => {
      try {
        router.prefetch?.(t as any);
      } catch { }
    });
  }, [menuOpen, prefetchTargets, router]);

  if (!ready) {
    return (
      <Button
        key="connect"
        variant="outline"
        className="w-32 sm:w-36 text-sm"
        size={"sm"}
        disabled
      >
        <div className="flex items-center gap-1 overflow-hidden">
          <div className="h-4 w-16 bg-muted animate-pulse rounded" />
          <ChevronDownIcon className="size-4 flex-shrink-0 opacity-50" />
        </div>
      </Button>
    );
  }

  if (!privyUser)
    return (
      <Button
        key="connect"
        className="w-28 sm:w-36 rounded-full text-sm"
        size={"sm"}
        onClick={handleLogin}
        disabled={isLoggingIn}
      >
        <p className="overflow-clip max-w-full">
          {isLoggingIn ? <LoaderCircleIcon className="animate-spin" /> : "Connect"}
        </p>
      </Button>
    );

  if (privyUser && !user && isLoading) {
    return (
      <Button
        key="connect-loading"
        variant="outline"
        className="w-32 sm:w-36 text-sm"
        size={"sm"}
        disabled
      >
        <div className="flex items-center gap-1 overflow-hidden">
          <div className="h-4 w-16 bg-muted animate-pulse rounded" />
          <ChevronDownIcon className="size-4 flex-shrink-0 opacity-50" />
        </div>
      </Button>
    );
  }

  if (privyUser && !user)
    return (
      <>
        <UsernameSignupDialog open={signupOpen} onOpenChange={setSignupOpen} />
        <Button
          key="connect"
          variant="outline"
          className="w-32 sm:w-36 text-sm"
          size={"sm"}
          disabled
        >
          <div className="flex items-center gap-1 overflow-hidden">
            <div className="h-4 w-16 bg-muted animate-pulse rounded" />
            <ChevronDownIcon className="size-4 flex-shrink-0 opacity-50" />
          </div>
        </Button>
      </>
    );

  if (user)
    return (
      <>
        <DropdownMenu modal={false} open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant={"outline"} key="connect" className="w-32 sm:w-36 text-sm relative">
              <div className="flex items-center gap-1 overflow-hidden">
                <p className="overflow-clip max-w-full">{user.username}</p>
                <ChevronDownIcon className="size-4 flex-shrink-0" />
                {((notificationsEnabled && unreadCount > 0) || unreadMessageCount > 0 || incompleteAssignmentCount > 0) && (
                  <Badge
                    variant="destructive"
                    className="h-4 min-w-4 px-1 text-xs absolute -top-1 -right-1"
                  >
                    {((notificationsEnabled ? unreadCount : 0) + unreadMessageCount + incompleteAssignmentCount) > 99 ? "99+" : ((notificationsEnabled ? unreadCount : 0) + unreadMessageCount + incompleteAssignmentCount)}
                  </Badge>
                )}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="bg-background border rounded-sm p-md text-sm w-52 shadow-md"
          >
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuLabel className="font-normal text-muted-foreground">
              {user.cred} cred
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild disabled={pathname === `/profile/${user.username}`}>
              <Link prefetch href={`/profile/${user.username}`} className="gap-2">
                <UserIcon className="size-4" />
                Profile
              </Link>
            </DropdownMenuItem>

            {currentSpace && (
              <DropdownMenuItem asChild disabled={pathname === `/s/${currentSpace}/messages`}>
                <Link prefetch href={`/s/${currentSpace}/messages`} className="gap-2">
                  <MessageSquareIcon className="size-4" />
                  <div className="flex items-center justify-between w-full">
                    <span>Messages</span>
                    {unreadMessageCount > 0 && (
                      <Badge variant="destructive" className="h-4 min-w-4 px-1 text-xs ml-2">
                        {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                      </Badge>
                    )}
                  </div>
                </Link>
              </DropdownMenuItem>
            )}

            {notificationsEnabled && (
              <DropdownMenuItem asChild disabled={pathname === "/notifications"}>
                <Link prefetch href="/notifications" className="gap-2">
                  <BellIcon className="size-4" />
                  <div className="flex items-center justify-between w-full">
                    <span>Notifications</span>
                    <div className="flex space-x-1">
                      {unreadCount > 0 && (
                        <Badge variant="destructive" className="h-4 min-w-4 px-1 text-xs">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </Badge>
                      )}
                      {incompleteAssignmentCount > 0 && (
                        <Badge variant="secondary" className="h-4 min-w-4 px-1 text-xs">
                          {incompleteAssignmentCount > 99 ? "99+" : incompleteAssignmentCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </Link>
              </DropdownMenuItem>
            )}

            {currentSpace && (
              <DropdownMenuItem
                onClick={() => setDialogOpen(true)}
                className="gap-2"
              >
                <CoinsIcon className="size-4" />
                Collect Earnings
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setLeaderboardOpen(true)} className="gap-2">
              <TrophyIcon className="size-4" />
              Leaderboard
            </DropdownMenuItem>
            {currentSpace && (
              <DropdownMenuItem asChild disabled={pathname === `/s/${currentSpace}/statistics`}>
                <Link prefetch href={`/s/${currentSpace}/statistics`} className="gap-2">
                  <BarChart3Icon className="size-4" />
                  DAO Statistics
                </Link>
              </DropdownMenuItem>
            )}
            {isAnySpaceAdmin && (
              hasMultipleAdminSpaces ? (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="gap-2">
                    <ShieldIcon className="size-4" />
                    Admin Panel
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {availableAdminSpaces?.map((space) => (
                      <DropdownMenuItem key={space} asChild disabled={pathname === `/s/${space}/admin`}>
                        <Link prefetch href={`/s/${space}/admin`} className="gap-2">
                          <ShieldIcon className="size-4" />
                          {space.charAt(0).toUpperCase() + space.slice(1)}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              ) : (
                <DropdownMenuItem asChild disabled={pathname === `/s/${availableAdminSpaces?.[0] || 'global'}/admin`}>
                  <Link prefetch href={`/s/${availableAdminSpaces?.[0] || 'global'}/admin`} className="gap-2">
                    <ShieldIcon className="size-4" />
                    Admin Panel
                  </Link>
                </DropdownMenuItem>
              )
            )}
            {adminStatus?.siteAdmin && (
              <DropdownMenuItem asChild disabled={pathname === "/admin"}>
                <Link prefetch href="/admin" className="gap-2">
                  <ShieldCheckIcon className="size-4" />
                  Site Admin
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild disabled={pathname === "/settings"}>
              <Link prefetch href="/settings" className="gap-2">
                <SettingsIcon className="size-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={async () => { await clearPrivyCookie(); logout(); }} className="gap-2">
              <LogOutIcon className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <EarningsDialog open={dialogOpen} onOpenChange={setDialogOpen} />
        <LeaderboardDialog open={leaderboardOpen} onOpenChange={setLeaderboardOpen} space={currentSpace || "global"} />
      </>
    );
};
