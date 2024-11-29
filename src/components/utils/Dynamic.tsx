"use client";

import dynamic from "next/dynamic";
import React, { PropsWithChildren } from "react";

export const Dynamic = dynamic(
  () =>
    Promise.resolve((props: PropsWithChildren) => (
      <React.Fragment>{props.children}</React.Fragment>
    )),
  {
    ssr: false,
  }
);
