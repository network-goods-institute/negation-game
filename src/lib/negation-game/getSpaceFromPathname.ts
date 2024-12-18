export const getSpaceFromPathname = (pathname: string) => {
  const match = pathname.match(/^\/s\/([^/]+)/);
  return match ? match[1] : null;
};
