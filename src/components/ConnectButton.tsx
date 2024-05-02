"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePrivy } from "@privy-io/react-auth";
import { DropdownMenuContent } from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { useRouter } from "next/navigation";

export const ConnectButton = () => {
  const { ready, authenticated, login, logout, user } = usePrivy();

  const { push } = useRouter();

  //   if (user) return <Button variant={"outline"}>{user.id}</Button>;

  if (authenticated) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="max-w-36">
            <p className="overflow-clip max-w-full">{user?.id}</p>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem asChild>
            <Link href="/profile">Profile</Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={logout}>Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return <Button onClick={login}>Sign in</Button>;
};
