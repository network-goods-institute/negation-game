import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/queries/users/useUser";

interface AdminSpaces {
  siteAdmin: boolean;
  adminSpaces: string[];
  allSpaces: string[];
}

async function fetchAdminStatus(): Promise<AdminSpaces> {
  const response = await fetch("/api/admin/status");
  if (!response.ok) {
    throw new Error("Failed to fetch admin status");
  }
  return response.json();
}

export function useAdminStatus() {
  const { data: user } = useUser();

  return useQuery({
    queryKey: ["admin-status", user?.id],
    queryFn: fetchAdminStatus,
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useIsSpaceAdmin(spaceId: string | undefined) {
  const { data: adminStatus, isLoading: isAdminLoading } = useAdminStatus();
  const { data: user, isLoading: isUserLoading } = useUser();

  const isLoading = isAdminLoading || isUserLoading;

  if (!adminStatus || !spaceId) return { isAdmin: false, isLoading };

  const isAdmin =
    adminStatus.siteAdmin || adminStatus.adminSpaces.includes(spaceId);
  return { isAdmin, isLoading };
}
