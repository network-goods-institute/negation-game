export type WithViewerContext<T> = T & {
  viewerContext: {
    stake: number;
  };
};
