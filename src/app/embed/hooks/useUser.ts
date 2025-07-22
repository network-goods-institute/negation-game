// Mock useUser hook for embed mode
export function useUser() {
  return {
    data: null,
    isLoading: false,
    isError: false,
    error: null
  };
}