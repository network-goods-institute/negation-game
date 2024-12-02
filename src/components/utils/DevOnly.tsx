import { PropsWithChildren } from "react";

export const DevOnly = ({ children }: PropsWithChildren) => {
  if (process.env.NODE_ENV !== "development") return <></>;

  return <>{children}</>;
};
