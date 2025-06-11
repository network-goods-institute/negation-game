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
import { LoaderCircleIcon, CoinsIcon, UserIcon, LogOutIcon, TrophyIcon, BellIcon, SettingsIcon, MessageSquareIcon } from "lucide-react";
import { useState } from "react";
import { EarningsDialog } from "../dialogs/EarningsDialog";
import Link from "next/link";
import { LeaderboardDialog } from "@/components/dialogs/LeaderboardDialog";
import { useUnreadNotificationCount } from "@/queries/notifications/useNotifications";
import { useUnreadMessageCount } from "@/queries/messages/useUnreadMessageCount";
import { Badge } from "@/components/ui/badge";

export const ConnectButton = () => {
  const { login, logout, user: privyUser } = usePrivy();
  const { data: user, isLoading } = useUser();
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const { data: unreadMessageCount = 0 } = useUnreadMessageCount();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);

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
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant={"outline"} key="connect" className="w-28 sm:w-36 text-sm relative">
              <div className="flex items-center gap-2 overflow-hidden">
                <p className="overflow-clip max-w-full">{user.username}</p>
                {(unreadCount > 0 || unreadMessageCount > 0) && (
                  <Badge
                    variant="destructive"
                    className="h-4 min-w-4 px-1 text-xs absolute -top-1 -right-1"
                  >
                    {(unreadCount + unreadMessageCount) > 99 ? "99+" : (unreadCount + unreadMessageCount)}
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
            <DropdownMenuItem asChild>
              <Link href={`/profile/${user.username}`} className="gap-2">
                <UserIcon className="size-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/messages" className="gap-2">
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
            <DropdownMenuItem asChild>
              <Link href="/notifications" className="gap-2">
                <BellIcon className="size-4" />
                <div className="flex items-center justify-between w-full">
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="h-4 min-w-4 px-1 text-xs ml-2">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Badge>
                  )}
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
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings" className="gap-2">
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
        <LeaderboardDialog open={leaderboardOpen} onOpenChange={setLeaderboardOpen} space="global" />
      </>
    );
};
