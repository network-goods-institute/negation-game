// Mock useShareLink hook for embed mode
export function useShareLink() {
  return {
    isSharing: false,
    selectedPointIds: new Set(),
    setSelectedPointIds: () => {},
    toggleSharingMode: () => {},
    handleGenerateAndCopyShareLink: () => {}
  };
}