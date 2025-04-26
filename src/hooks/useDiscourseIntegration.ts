import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateUserProfile } from "@/actions/updateUserProfile";
import { userQueryKey } from "@/queries/useUser";
import { DiscourseMessage, DiscourseConnectionStatus } from "../types/chat";

type UserDataForDiscourse =
  | {
      discourseUsername: string | null | undefined;
      discourseCommunityUrl: string | null | undefined;
      discourseConsentGiven: boolean | null | undefined;
    }
  | null
  | undefined;

interface UseDiscourseIntegrationProps {
  userData: UserDataForDiscourse;
  isAuthenticated: boolean;
  isNonGlobalSpace: boolean;
  currentSpace: string | null;
  privyUserId: string | undefined;
}

export function useDiscourseIntegration({
  userData,
  isAuthenticated,
  isNonGlobalSpace,
  currentSpace,
  privyUserId,
}: UseDiscourseIntegrationProps) {
  const queryClient = useQueryClient();

  const [isCheckingDiscourse, setIsCheckingDiscourse] = useState(true);
  const [showDiscourseDialog, setShowDiscourseDialog] = useState(false);
  const [isConnectingToDiscourse, setIsConnectingToDiscourse] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discourseUsername, setDiscourseUsername] = useState("");
  const [discourseUrl, setDiscourseUrl] = useState("https://forum.scroll.io");
  const [storedMessages, setStoredMessages] = useState<DiscourseMessage[]>([]);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [hasStoredMessages, setHasStoredMessages] = useState(false);
  const [fetchProgress, setFetchProgress] = useState(0);
  const [connectionStatus, setConnectionStatus] =
    useState<DiscourseConnectionStatus>("disconnected");
  const [isUpdatingConsent, setIsUpdatingConsent] = useState(false);

  const loadStoredMessages = useCallback((): DiscourseMessage[] => {
    try {
      if (typeof window !== "undefined") {
        const storedData = localStorage.getItem("discourse_messages");
        if (storedData) {
          const messages = JSON.parse(storedData);
          if (Array.isArray(messages) && messages.length > 0) {
            return messages;
          }
        }
      }
    } catch (error) {
      localStorage.removeItem("discourse_messages");
    }
    return [];
  }, []);

  const saveMessagesToStorage = useCallback((messages: DiscourseMessage[]) => {
    if (!Array.isArray(messages) || messages.length === 0) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("discourse_messages");
      }
      setStoredMessages([]);
      setHasStoredMessages(false);
      return;
    }
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("discourse_messages", JSON.stringify(messages));
        setStoredMessages(messages);
        setHasStoredMessages(true);
      }
    } catch (error) {
      toast.error("Error saving messages: Storage error");
    }
  }, []);

  const handleViewMessages = useCallback(() => {
    try {
      const messages = loadStoredMessages();
      if (messages.length > 0) {
        setShowMessagesModal(true);
      } else {
        toast.error("No messages found. Please connect to Discourse first.");
      }
    } catch (error) {
      toast.error("Error loading messages from storage");
    }
  }, [loadStoredMessages]);

  const handleDeleteMessages = useCallback(() => {
    if (!isAuthenticated) return;
    if (typeof window !== "undefined") {
      localStorage.removeItem("discourse_messages");
      setStoredMessages([]);
      setHasStoredMessages(false);
      toast.success("Messages deleted successfully");
    }
  }, [isAuthenticated]);

  const handleUpdateProfile = useCallback(
    async (values: {
      discourseUsername: string;
      discourseCommunityUrl: string;
      discourseConsentGiven: boolean;
    }) => {
      if (!isAuthenticated || !privyUserId) return;
      try {
        const result = await updateUserProfile({
          discourseUsername: values.discourseUsername.trim() || null,
          discourseCommunityUrl: values.discourseCommunityUrl.trim() || null,
          discourseConsentGiven: values.discourseConsentGiven,
        });

        if (result.success) {
          queryClient.setQueryData<UserDataForDiscourse>(
            userQueryKey(privyUserId),
            (oldData) => {
              if (!oldData) return oldData;
              return {
                ...oldData,
                discourseUsername: values.discourseUsername.trim() || null,
                discourseCommunityUrl:
                  values.discourseCommunityUrl.trim() || null,
                discourseConsentGiven: values.discourseConsentGiven,
              };
            }
          );
          await queryClient.invalidateQueries({
            queryKey: userQueryKey(privyUserId),
          });
        } else {
          throw new Error(result.error || "Unknown error updating profile");
        }
      } catch (error) {
        throw error;
      }
    },
    [privyUserId, queryClient, isAuthenticated]
  );

  const handleConnectToDiscourse = useCallback(async () => {
    if (isConnectingToDiscourse || !isAuthenticated) return;
    if (!isNonGlobalSpace) {
      setError("Discourse integration is only available in spaces");
      return;
    }

    try {
      if (!discourseUsername.trim()) {
        setError("Please enter your Discourse username");
        return;
      }
      if (!userData) {
        setError("User data not loaded yet. Please try again.");
        return;
      }

      if (!userData.discourseConsentGiven) {
        setShowConsentDialog(true);
        return;
      }

      setIsConnectingToDiscourse(true);
      setError(null);
      setFetchProgress(10);

      const cleanUrl = discourseUrl.trim().replace(/\/$/, "");
      if (
        userData.discourseUsername !== discourseUsername.trim() ||
        userData.discourseCommunityUrl !== cleanUrl
      ) {
        await handleUpdateProfile({
          discourseUsername: discourseUsername.trim(),
          discourseCommunityUrl: cleanUrl,
          discourseConsentGiven: true,
        });
        if (privyUserId) {
          await queryClient.refetchQueries({
            queryKey: userQueryKey(privyUserId),
          });
        }
      }

      setFetchProgress(20);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        setError("Connection timed out. Please try again.");
        setFetchProgress(0);
        setIsConnectingToDiscourse(false);
      }, 60000);

      const progressUrl = `/api/discourse/posts/stream?username=${encodeURIComponent(discourseUsername.trim())}&url=${encodeURIComponent(cleanUrl)}`;
      const eventSource = new EventSource(progressUrl);
      let eventSourceClosed = false;

      const closeEventSource = () => {
        if (!eventSourceClosed) {
          eventSource.close();
          eventSourceClosed = true;
        }
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.progress) {
            setFetchProgress((prev) =>
              Math.max(prev, 20 + data.progress * 0.7)
            );
          }
          if (data.done) {
            closeEventSource();
          }
        } catch (e) {}
      };

      eventSource.onerror = (err) => {
        closeEventSource();
      };

      const fetchUrl = `/api/discourse/posts?username=${encodeURIComponent(discourseUsername.trim())}&url=${encodeURIComponent(cleanUrl)}`;
      const response = await fetch(fetchUrl, { signal: controller.signal });

      clearTimeout(timeoutId);
      closeEventSource();

      setFetchProgress((prev) => Math.max(prev, 90));

      if (!response.ok) {
        let errorMsg = `Failed (${response.status}): ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch (e) {}
        throw new Error(errorMsg);
      }

      const data = await response.json();

      setFetchProgress(95);
      let rawPosts = [];
      if (data && typeof data === "object") {
        const potentialKeys = [
          "latest_posts",
          "posts",
          "user_actions",
          "actions_summary",
        ];
        for (const key of potentialKeys) {
          if (Array.isArray(data[key])) {
            rawPosts = data[key];
            break;
          }
        }
        if (rawPosts.length === 0 && Array.isArray(data)) {
          rawPosts = data;
        } else if (rawPosts.length === 0) {
          const firstArrayKey = Object.keys(data).find((key) =>
            Array.isArray(data[key])
          );
          if (firstArrayKey) {
            rawPosts = data[firstArrayKey];
          }
        }
      } else if (Array.isArray(data)) {
        rawPosts = data;
      }
      if (!Array.isArray(rawPosts)) {
        throw new Error("Could not extract posts array from API response");
      }

      const processedMessages: DiscourseMessage[] = rawPosts
        .map((msg: any, index: number): DiscourseMessage | null => {
          if (!msg || typeof msg !== "object") return null;
          return {
            id: msg.id || index, // Use index as fallback ID
            content: msg.cooked || msg.content || "", // Prefer cooked HTML, fallback to content
            raw: msg.raw || "",
            created_at: msg.created_at || new Date().toISOString(),
            topic_id: msg.topic_id,
            topic_title: msg.topic_title || msg.topic_slug || "Untitled Topic",
            space: currentSpace || "global",
          };
        })
        .filter(
          (msg): msg is DiscourseMessage =>
            msg !== null && (!!msg.content || !!msg.raw)
        );

      if (processedMessages.length > 0) {
        saveMessagesToStorage(processedMessages);
        toast.success(
          `Successfully connected! Found ${processedMessages.length} relevant posts.`
        );
        setShowDiscourseDialog(false);
      } else {
        saveMessagesToStorage([]);
        toast.info("Connected, but no relevant posts found for this username.");
        setShowDiscourseDialog(false);
      }

      setFetchProgress(100);
    } catch (error: any) {
      if (error.name === "AbortError") {
        if (!error) setError("Connection timed out. Please try again.");
      } else {
        setError(
          `Connection failed: ${error.message || "Please check username/URL and try again."}`
        );
      }
      setFetchProgress(0);
    } finally {
      setIsConnectingToDiscourse(false);
    }
  }, [
    isConnectingToDiscourse,
    isAuthenticated,
    isNonGlobalSpace,
    discourseUsername,
    discourseUrl,
    userData,
    handleUpdateProfile,
    saveMessagesToStorage,
    queryClient,
    privyUserId,
    currentSpace,
  ]);

  const handleConsentAndConnect = useCallback(async () => {
    if (isUpdatingConsent || !isAuthenticated) return;

    try {
      setIsUpdatingConsent(true);
      if (!userData) {
        toast.error("User data not available. Cannot grant consent.");
        setShowConsentDialog(false);
        return;
      }

      await handleUpdateProfile({
        discourseUsername: discourseUsername.trim(),
        discourseCommunityUrl: discourseUrl.trim().replace(/\/$/, ""),
        discourseConsentGiven: true,
      });

      setShowConsentDialog(false);

      setTimeout(() => {
        handleConnectToDiscourse();
      }, 100);
    } catch (error) {
      toast.error(
        "Failed to update consent settings. Please try connecting again."
      );
      setShowConsentDialog(false);
    } finally {
      setIsUpdatingConsent(false);
    }
  }, [
    isUpdatingConsent,
    isAuthenticated,
    userData,
    discourseUsername,
    discourseUrl,
    handleUpdateProfile,
    handleConnectToDiscourse,
  ]);

  useEffect(() => {
    if (userData?.discourseUsername && !discourseUsername) {
      setDiscourseUsername(userData.discourseUsername);
    }
  }, [userData?.discourseUsername, discourseUsername]);

  useEffect(() => {
    if (!isNonGlobalSpace) {
      setStoredMessages([]);
      setHasStoredMessages(false);
      setConnectionStatus("disconnected");
      setIsCheckingDiscourse(false);
      return;
    }

    const checkStored = () => {
      setIsCheckingDiscourse(true);
      try {
        const messages = loadStoredMessages();
        setStoredMessages(messages);
        setHasStoredMessages(messages.length > 0);
      } catch (error) {
        setStoredMessages([]);
        setHasStoredMessages(false);
      } finally {
        setTimeout(() => setIsCheckingDiscourse(false), 100);
      }
    };

    checkStored();
  }, [isNonGlobalSpace, loadStoredMessages]);

  useEffect(() => {
    // 1. If not in a space, always disconnected
    if (!isNonGlobalSpace) {
      setConnectionStatus("disconnected");
      return;
    }

    // 2. If actively checking messages or initializing user data, wait
    if (isCheckingDiscourse || (!userData && isAuthenticated)) {
      // Wait for userData if authenticated
      return;
    }

    // 3. If in a space, but not logged in
    if (!isAuthenticated) {
      setConnectionStatus("unavailable_logged_out");
      return;
    }

    // 4. Logged in, in a space, userData is available (or non-auth path)
    const hasCreds = discourseUsername.trim();
    const hasMsgs = storedMessages.length > 0;
    const hasConsent = !!userData?.discourseConsentGiven;
    const profileUsernameMatches =
      userData?.discourseUsername === discourseUsername.trim();
    const profileUrlMatches =
      userData?.discourseCommunityUrl ===
      discourseUrl.trim().replace(/\/$/, "");

    if (hasMsgs) {
      // Has messages: Connected if profile creds match & has consent, otherwise partially
      if (profileUsernameMatches && profileUrlMatches && hasConsent) {
        setConnectionStatus("connected");
      } else {
        setConnectionStatus("partially_connected");
      }
    } else if (hasCreds && hasConsent) {
      // No messages, but profile creds match & consent given: Pending fetch
      if (profileUsernameMatches && profileUrlMatches) {
        setConnectionStatus("pending");
      } else {
        // Consent given, but entered creds don't match profile yet
        setConnectionStatus("disconnected");
      }
    } else {
      // No messages, and either no creds entered, or no consent
      setConnectionStatus("disconnected");
    }
  }, [
    isNonGlobalSpace,
    isCheckingDiscourse,
    isAuthenticated,
    userData,
    storedMessages.length,
    discourseUsername,
    discourseUrl,
  ]);

  return {
    isCheckingDiscourse,
    showDiscourseDialog,
    setShowDiscourseDialog,
    isConnectingToDiscourse,
    error,
    setError,
    discourseUsername,
    setDiscourseUsername,
    discourseUrl,
    setDiscourseUrl,
    storedMessages,
    showMessagesModal,
    setShowMessagesModal,
    showConsentDialog,
    setShowConsentDialog,
    hasStoredMessages,
    fetchProgress,
    connectionStatus,
    isUpdatingConsent,
    loadStoredMessages,
    saveMessagesToStorage,
    handleViewMessages,
    handleDeleteMessages,
    handleConnectToDiscourse,
    handleConsentAndConnect,
  };
}
