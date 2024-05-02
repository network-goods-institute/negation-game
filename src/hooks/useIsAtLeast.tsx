import { tailwindConfig } from "@/constants/tailwindConfig";
import { useMedia } from "react-use";

export const useIsAtLeast = (
  breakpoint: keyof typeof tailwindConfig.theme.screens,
  defaultState?: boolean
) => {
  return useMedia(
    `(min-width: ${tailwindConfig.theme.screens[breakpoint]})`,
    defaultState
  );
};
