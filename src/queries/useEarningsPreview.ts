import { previewEarnings } from "@/actions/collectEarnings";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery } from "@tanstack/react-query";

interface UseEarningsPreviewOptions {
  enabled?: boolean;
}

export const useEarningsPreview = ({
  enabled = true,
}: UseEarningsPreviewOptions = {}) => {
  const { user, ready, authenticated } = usePrivy();

  return useQuery({
    queryKey: ["earnings-preview", user?.id],
    queryFn: previewEarnings,
    enabled: enabled && ready && authenticated && !!user,
    refetchInterval: enabled && authenticated ? 60 * 1000 : false,
    retry: false, // Don't retry on auth errors
  });
};
