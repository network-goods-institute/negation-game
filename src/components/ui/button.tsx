import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { Loader } from "@/components/ui/loader";
import { cn } from "@/lib/utils/cn"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  leftSlot?: React.ReactNode;
  leftLoading?: boolean;
  rightLoading?: boolean;
  rightSlot?: React.ReactNode;
  text?: string;
  textPosition?: 'left' | 'right';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      leftSlot,
      leftLoading,
      rightSlot,
      rightLoading,
      asChild = false,
      text,
      textPosition = 'left',
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";

    // When asChild is true, pass children directly to Slot
    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Comp>
      );
    }

    // For regular buttons, include all the additional slots and text
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {textPosition === 'left' && text && <span className="text-sm font-bold mr-2">{text}</span>}
        {leftSlot ||
          (leftLoading && (
            <span className="mr-2">
              {leftLoading ? (
                <Loader className="text-inherit size-4" />
              ) : (
                leftSlot
              )}
            </span>
          ))}
        {children}
        {rightSlot ||
          (rightLoading && (
            <span className="ml-2">
              {rightLoading ? (
                <Loader className="text-inherit size-4" />
              ) : (
                rightSlot
              )}
            </span>
          ))}
        {textPosition === 'right' && text && <span className="text-sm font-bold ml-2">{text}</span>}
      </Comp>
    );
  },
);
Button.displayName = "Button";


export { Button, buttonVariants };
