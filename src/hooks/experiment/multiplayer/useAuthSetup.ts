import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useQueryClient } from '@tanstack/react-query';
import { userQueryKey } from '@/queries/users/useUser';
import { useUserColor } from './useUserColor';
import { useAnonymousId } from './useAnonymousId';

export const useAuthSetup = () => {
  const { authenticated, ready, login, user: privyUser } = usePrivy();
  const queryClient = useQueryClient();

  const [privyTimeout, setPrivyTimeout] = useState(false);

  useEffect(() => {
    if (ready) return;
    const timer = setTimeout(() => {
      console.log('[MultiplayerBoardDetailPage] Privy timeout - proceeding as anonymous');
      setPrivyTimeout(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, [ready]);

  const privyReady = ready || privyTimeout;
  const cachedUser = queryClient.getQueryData(userQueryKey(privyUser?.id));
  const anonymousId = useAnonymousId(authenticated);
  const userId = privyUser?.id || anonymousId;

  const authenticatedUsername = (cachedUser as any)?.username;
  const anonymousSuffix = anonymousId ? anonymousId.slice(-4) : '0000';
  const username = authenticatedUsername || (authenticated ? 'Anonymous' : `Viewer #${anonymousSuffix}`);

  const userColor = useUserColor(userId);

  return {
    authenticated,
    privyReady,
    login,
    privyUser,
    userId,
    username,
    userColor,
  };
};
