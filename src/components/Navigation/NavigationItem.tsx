"use client";

import { cn } from "@/lib/cn";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FC, HTMLAttributes } from "react";

export interface NavigationItemProps extends HTMLAttributes<HTMLLIElement> {
  label: string;
  path: string;
}

export const NavigationItem: FC<NavigationItemProps> = ({
  className,
  label,
  path,
  ...props
}) => {
  const pathname = usePathname();

  return (
    <li
      className={cn(
        "text-muted-foreground",
        path === pathname && "text-foreground",
        className,
      )}
      {...props}
    >
      <Link href={path}>{label}</Link>
    </li>
  );
};
