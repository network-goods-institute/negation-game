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
import { LoaderCircleIcon, CoinsIcon, UserIcon, LogOutIcon, TrophyIcon } from "lucide-react";
import { useState } from "react";
import { EarningsDialog } from "../dialogs/EarningsDialog";
import Link from "next/link";
import { LeaderboardDialog } from "@/components/dialogs/LeaderboardDialog";

export const ConnectButton = () => {
  const { login, logout, user: privyUser } = usePrivy();
  const { data: user, isLoading } = useUser();
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
            <Button variant={"outline"} key="connect" className="w-28 sm:w-36 text-sm">
              <p className="overflow-clip max-w-full">{user.username}</p>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="bg-background border rounded-sm p-md text-sm w-48 shadow-md"
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
