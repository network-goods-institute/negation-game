type HeaderVisibilityOptions = {
  pathname: string;
  isMultiplayerRoute: boolean;
  isMinimalMode: boolean;
};

export function shouldHideAppHeader({
  pathname,
  isMultiplayerRoute,
  isMinimalMode,
}: HeaderVisibilityOptions): boolean {
  const isEmbedRoute = pathname.startsWith("/embed");
  const isExperimentRoute = pathname.startsWith("/experiment");

  return isEmbedRoute || isExperimentRoute || (isMultiplayerRoute && isMinimalMode);
}
