"use client";

import { NavigationItem } from "@/components/Navigation/NavigationItem";
import { usePrivy } from "@privy-io/react-auth";
import { FC, HTMLAttributes } from "react";

export interface NavigationProps extends HTMLAttributes<HTMLDivElement> {}

export const Navigation: FC<NavigationProps> = ({ ...props }) => {
  const { authenticated } = usePrivy();
  return (
    <nav {...props}>
      <ul className="flex gap-md justify-center">
        <NavigationItem label="Home" path="/" />
        {authenticated && <NavigationItem label="Profile" path="/profile" />}
      </ul>
    </nav>
  );
};
