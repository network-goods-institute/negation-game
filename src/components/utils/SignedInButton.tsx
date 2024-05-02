"use client";

import { Button, ButtonProps } from "@/components/ui/button";
import { usePrivy } from "@privy-io/react-auth";
import { forwardRef } from "react";

export const SignedInButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ onClick, ...props }, ref) => {
    const { authenticated, login } = usePrivy();
    return (
      <Button
        ref={ref}
        onClick={
          authenticated
            ? onClick
            : (e) => {
                e.preventDefault();
                login();
              }
        }
        {...props}
      />
    );
  }
);

SignedInButton.displayName = "SignedInButton";
