"use client";

import { NewUserDialog } from "@/components/dialogs/NewUserDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useUser } from "@/queries/users/useUser";
import { usePrivy } from "@privy-io/react-auth";
import { clearPrivyCookie } from '@/actions/users/auth';
import { LoaderCircleIcon, CoinsIcon, UserIcon, LogOutIcon, TrophyIcon, BellIcon, SettingsIcon, MessageSquareIcon, BarChart3Icon, ChevronDownIcon, ShieldIcon } from "lucide-react";
import { useIsSpaceAdmin } from "@/hooks/admin/useAdminStatus";
import { useState, useEffect, useRef } from "react";
import { EarningsDialog } from "../dialogs/EarningsDialog";
import Link from "next/link";
import { LeaderboardDialog } from "@/components/dialogs/LeaderboardDialog";
import { useUnreadNotificationCount } from "@/queries/notifications/useNotifications";
import { useUnreadMessageCount } from "@/queries/messages/useUnreadMessageCount";
import { useIncompleteAssignmentCount } from "@/queries/assignments/useIncompleteAssignmentCount";
import { Badge } from "@/components/ui/badge";
import { useRouter, usePathname } from "next/navigation";

export const ConnectButton = () => {
  const { login, logout, user: privyUser } = usePrivy();
  const { data: user, isLoading } = useUser();
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const { data: unreadMessageCount = 0 } = useUnreadMessageCount();
  const incompleteAssignmentCount = useIncompleteAssignmentCount();
  const router = useRouter();
  const pathname = usePathname();

  const currentSpace = pathname.match(/^\/s\/([^\/]+)/)?.[1];
  const { isAdmin: isSpaceAdmin } = useIsSpaceAdmin(currentSpace);
  const prevPathRef = useRef(pathname);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loadingRoute, setLoadingRoute] = useState<string | null>(null);

  useEffect(() => {
    if (loadingRoute && pathname !== prevPathRef.current) {
      setMenuOpen(false);
      setLoadingRoute(null);
    }
    prevPathRef.current = pathname;
  }, [pathname, loadingRoute]);

  const navigate = (target: string) => {
    const isCurrent = pathname === target;
    return (e: Event | React.SyntheticEvent) => {
      e.preventDefault();
      if (loadingRoute || isCurrent) return;
      setMenuOpen(true);
      setLoadingRoute(target);
      router.push(target);
    };
  };

  if (!privyUser)
    return (
      <Button
        key="connect"
        className="w-28 sm:w-36 rounded-full text-sm"
        size={"sm"}
        onClick={login}
        disabled={privyUser !== null}
      >
        <p className="overflow-clip max-w-full">
          {privyUser ? <LoaderCircleIcon className="animate-spin" /> : "Connect"}
        </p>
      </Button>
    );

  if (!user)
    return (
      <>
        <NewUserDialog open={!isLoading} />
        <Button
          key="connect"
          className="w-28 sm:w-36 rounded-full text-sm"
          size={"sm"}
          disabled
        >
          <LoaderCircleIcon className="animate-spin" />
        </Button>
      </>
    );

  if (user)
    return (
      <>
        <DropdownMenu modal={false} open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant={"outline"} key="connect" className="w-28 sm:w-36 text-sm relative">
              <div className="flex items-center gap-1 overflow-hidden">
                <p className="overflow-clip max-w-full">{user.username}</p>
                <ChevronDownIcon className="size-4 flex-shrink-0" />
                {(unreadCount > 0 || unreadMessageCount > 0 || incompleteAssignmentCount > 0) && (
                  <Badge
                    variant="destructive"
                    className="h-4 min-w-4 px-1 text-xs absolute -top-1 -right-1"
                  >
                    {(unreadCount + unreadMessageCount + incompleteAssignmentCount) > 99 ? "99+" : (unreadCount + unreadMessageCount + incompleteAssignmentCount)}
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
            <DropdownMenuItem
              asChild
              onSelect={navigate(`/profile/${user.username}`)}
              disabled={!!loadingRoute || pathname === `/profile/${user.username}`}
            >
              <Link href={`/profile/${user.username}`} className="gap-2">
                {loadingRoute === `/profile/${user.username}` ? (
                  <LoaderCircleIcon className="size-4 animate-spin" />
                ) : (
                  <UserIcon className="size-4" />
                )}
                Profile
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem
              asChild
              onSelect={navigate("/messages")}
              disabled={!!loadingRoute || pathname === "/messages"}
            >
              <Link href="/messages" className="gap-2">
                {loadingRoute === "/messages" ? (
                  <LoaderCircleIcon className="size-4 animate-spin" />
                ) : (
                  <MessageSquareIcon className="size-4" />
                )}
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

            <DropdownMenuItem
              asChild
              onSelect={navigate("/notifications")}
              disabled={!!loadingRoute || pathname === "/notifications"}
            >
              <Link href="/notifications" className="gap-2">
                {loadingRoute === "/notifications" ? (
                  <LoaderCircleIcon className="size-4 animate-spin" />
                ) : (
                  <BellIcon className="size-4" />
                )}
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

            <DropdownMenuItem
              onClick={() => setDialogOpen(true)}
              className="gap-2"
            >
              <CoinsIcon className="size-4" />
              Collect Earnings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLeaderboardOpen(true)} className="gap-2">
              <TrophyIcon className="size-4" />
              Leaderboard
            </DropdownMenuItem>
            {currentSpace && (
              <DropdownMenuItem
                asChild
                onSelect={navigate(`/s/${currentSpace}/statistics`)}
                disabled={!!loadingRoute || pathname === `/s/${currentSpace}/statistics`}
              >
                <Link href={`/s/${currentSpace}/statistics`} className="gap-2">
                  {loadingRoute === `/s/${currentSpace}/statistics` ? (
                    <LoaderCircleIcon className="size-4 animate-spin" />
                  ) : (
                    <BarChart3Icon className="size-4" />
                  )}
                  DAO Statistics
                </Link>
              </DropdownMenuItem>
            )}
            {currentSpace && isSpaceAdmin && (
              <DropdownMenuItem
                asChild
                onSelect={navigate(`/s/${currentSpace}/admin`)}
                disabled={!!loadingRoute || pathname === `/s/${currentSpace}/admin`}
              >
                <Link href={`/s/${currentSpace}/admin`} className="gap-2">
                  {loadingRoute === `/s/${currentSpace}/admin` ? (
                    <LoaderCircleIcon className="size-4 animate-spin" />
                  ) : (
                    <ShieldIcon className="size-4" />
                  )}
                  Admin Panel
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              asChild
              onSelect={navigate("/settings")}
              disabled={!!loadingRoute || pathname === "/settings"}
            >
              <Link href="/settings" className="gap-2">
                {loadingRoute === "/settings" ? (
                  <LoaderCircleIcon className="size-4 animate-spin" />
                ) : (
                  <SettingsIcon className="size-4" />
                )}
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
