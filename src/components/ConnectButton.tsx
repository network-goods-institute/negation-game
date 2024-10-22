"use client";

import { OnboardingDialog } from "@/components/OnboardingDialog";
import { AnimatedButton } from "@/components/ui/button";
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
import { AnimatePresence } from "framer-motion";
import { LoaderCircleIcon } from "lucide-react";

export const ConnectButton = () => {
  const { login, logout, user: privyUser } = usePrivy();

  const { data: user, isLoading } = useUser();

  if (!privyUser)
    return (
      <AnimatedButton
        key="connect"
        layoutId="connect"
        className="w-36 rounded-full"
        size={"sm"}
        onClick={login}
        disabled={privyUser !== null}
      >
        <AnimatePresence>
          <p className="overflow-clip max-w-full">
            {privyUser ? (
              <LoaderCircleIcon className="animate-spin" />
            ) : (
              "Connect"
            )}
          </p>
        </AnimatePresence>
      </AnimatedButton>
    );

  if (!user)
    return (
      <>
        <OnboardingDialog open={!isLoading} />
        <AnimatedButton
          key="connect"
          layoutId="connect"
          className="w-36 rounded-full"
          size={"sm"}
          disabled
        >
          <AnimatePresence>
            <LoaderCircleIcon className="animate-spin" />
          </AnimatePresence>
        </AnimatedButton>
      </>
    );

  if (user)
    return (
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <AnimatedButton
            variant={"outline"}
            layoutId="connect"
            key="connect"
            className="w-36"
          >
            <AnimatePresence>
              <p className="overflow-clip max-w-full">{user.username}</p>
            </AnimatePresence>
          </AnimatedButton>
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
          <DropdownMenuItem onClick={logout}>Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
};
