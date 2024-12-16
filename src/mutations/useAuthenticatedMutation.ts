import { usePrivy } from "@privy-io/react-auth";
import { useMutation } from "@tanstack/react-query";

// This function is a wrapper around useMutation that conditionally uses the login mutation function if the user is not authenticated.
// This is a fallback. Ideally, the button that initiates the flow should the login form to prevent form data loss when signing in.
export const useAuthenticatedMutation: typeof useMutation = (
  { mutationFn, ...options },
  queryClient
) => {
  const { user, login } = usePrivy();

  return useMutation(
    {
      ...options,
      mutationFn: !user ? (login as unknown as typeof mutationFn) : mutationFn,
    },
    queryClient
  );
};
