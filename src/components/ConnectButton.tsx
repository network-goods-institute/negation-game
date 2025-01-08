"use client";

import { OnboardingDialog } from "@/components/OnboardingDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useUser } from "@/hooks/useUser";
import { usePrivy } from "@privy-io/react-auth";
import {
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import { LoaderCircleIcon, CoinsIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { collectEarnings } from "@/actions/collectEarnings";
import { EarningsDialog } from "@/components/EarningsDialog";

export const ConnectButton = () => {
  const { login, logout, user: privyUser } = usePrivy();
  const { data: user, isLoading } = useUser();
  const queryClient = useQueryClient();
  const [isCollecting, setIsCollecting] = useState(false);
  const [collectedAmount, setCollectedAmount] = useState<number | null>(null);

  const handleCollectEarnings = async () => {
    if (!user || isCollecting) return;
    
    setIsCollecting(true);
    try {
      const collected = await collectEarnings();
      await queryClient.invalidateQueries({ queryKey: ['user'] });
      setCollectedAmount(collected);
    } finally {
      setIsCollecting(false);
    }
  };

  if (!privyUser)
    return (
      <Button
        key="connect"
        className="w-36 rounded-full"
        size={"sm"}
        onClick={login}
        disabled={privyUser !== null}
      >
        <p className="overflow-clip max-w-full">
          {privyUser ? (
            <LoaderCircleIcon className="animate-spin" />
          ) : (
            "Connect"
          )}
        </p>
      </Button>
    );

  if (!user)
    return (
      <>
        <OnboardingDialog open={!isLoading} />
        <Button
          key="connect"
          className="w-36 rounded-full"
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
            <Button variant={"outline"} key="connect" className="w-36">
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
            <DropdownMenuItem 
              onClick={handleCollectEarnings}
              disabled={isCollecting}
              className="gap-2"
            >
              {isCollecting ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
              ) : (
                <CoinsIcon className="size-4" />
              )}
              Collect Earnings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={logout}>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <EarningsDialog 
          open={collectedAmount !== null}
          onOpenChange={(open) => !open && setCollectedAmount(null)}
        />
      </>
    );
};
