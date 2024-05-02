import dynamic from "next/dynamic";
import React, { PropsWithChildren } from "react";

export const Dynamic = (props: PropsWithChildren) => (
  <React.Fragment>{props.children}</React.Fragment>
);

export default dynamic(() => Promise.resolve(Dynamic), {
  ssr: false,
});
