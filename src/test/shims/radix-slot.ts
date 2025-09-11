// Minimal shim for @radix-ui/react-slot for Jest in prod to avoid createSlot errors
import * as React from "react";

type AnyProps = Record<string, any>;

export function createSlot(): React.ForwardRefExoticComponent<
  AnyProps & React.RefAttributes<any>
> {
  const Slot = React.forwardRef<any, AnyProps>(function RadixSlotSlot(props, ref) {
    const { asChild, children, ...rest } = props || {};
    return React.createElement("span", { ref, ...rest }, children);
  });
  (Slot as any).displayName = "RadixSlot.Slot";
  return Slot;
}

export const Root = createSlot();
(Root as any).displayName = "RadixSlot.Root";

export default { Root, createSlot } as any;
