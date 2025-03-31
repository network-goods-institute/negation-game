"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ArrowLeft, Trash2 } from "lucide-react";
import { useUser } from "@/queries/useUser";
import { usePrivy } from "@privy-io/react-auth";
import { updateUserProfile } from "@/actions/updateUserProfile";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { userQueryKey } from "@/queries/useUser";
import { useRouter } from "next/navigation";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";

interface DiscourseMessage {
    id: number;
    content: string;
    raw: string;
    created_at: string;
    topic_id?: number;
    topic_title?: string;
}

export default function AIAssistant() {
    const router = useRouter();
    const { user: privyUser } = usePrivy();
    const { data: userData } = useUser(privyUser?.id);
    const queryClient = useQueryClient();

    const [isConnectingToDiscourse, setIsConnectingToDiscourse] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [discourseUsername, setDiscourseUsername] = useState(userData?.discourseUsername || '');
    const [discourseUrl, setDiscourseUrl] = useState(userData?.discourseCommunityUrl || 'https://forum.scroll.io');
    const [storedMessages, setStoredMessages] = useState<DiscourseMessage[]>([]);
    const [showMessagesModal, setShowMessagesModal] = useState(false);
    const [showConsentDialog, setShowConsentDialog] = useState(false);
    const [hasStoredMessages, setHasStoredMessages] = useState(false);
    const [message, setMessage] = useState('');
    const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
    const [fetchProgress, setFetchProgress] = useState(0);

    useEffect(() => {
        if (userData) {
            setDiscourseUsername(userData.discourseUsername || '');
            setDiscourseUrl(userData.discourseCommunityUrl || 'https://forum.scroll.io');
        }
    }, [userData]);

    // Check for stored messages on client-side only
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const storedData = localStorage.getItem('discourse_messages');
                const hasMessages = !!storedData;
                setHasStoredMessages(hasMessages);
                if (hasMessages) {
                    const messages = loadStoredMessages(); // Pre-load messages if they exist
                    setStoredMessages(messages);
                }
            } catch (error) {
                console.error("Error checking localStorage:", error);
            }
        }
    }, []);

    const loadStoredMessages = () => {
        try {
            console.log("Checking for discourse_messages in localStorage");
            if (typeof window !== 'undefined') {
                const storedData = localStorage.getItem('discourse_messages');

                if (storedData) {
                    console.log("Found discourse_messages in localStorage");
                    const messages = JSON.parse(storedData);
                    console.log(`Parsed ${Array.isArray(messages) ? messages.length : 0} messages from localStorage`);

                    if (Array.isArray(messages) && messages.length > 0) {
                        return messages;
                    }
                } else {
                    console.log("No discourse_messages found in localStorage");
                }
            }
            return [];
        } catch (error) {
            console.error("Error parsing stored messages:", error);
            return [];
        }
    };

    const saveMessagesToStorage = (messages: DiscourseMessage[]) => {
        // Explicitly check if messages is an array and has length
        if (!Array.isArray(messages) || messages.length === 0) {
            console.log('saveMessagesToStorage: No messages to save or empty array');
            if (typeof window !== 'undefined') {
                localStorage.removeItem('discourse_messages');
            }
            setStoredMessages([]);
            setHasStoredMessages(false);
            return;
        }

        console.log(`saveMessagesToStorage: Saving ${messages.length} messages to localStorage`);
        try {
            // Use localStorage instead of cookies to avoid size limitations
            if (typeof window !== 'undefined') {
                const stringified = JSON.stringify(messages);
                localStorage.setItem('discourse_messages', stringified);
                setStoredMessages(messages);
                setHasStoredMessages(true);
                console.log('saveMessagesToStorage: Messages saved successfully');
            }
        } catch (error) {
            console.error('Error saving messages to localStorage:', error);
            toast.error('Error saving messages: Storage error');
        }
    };

    const handleUpdateProfile = async (values: {
        discourseUsername: string;
        discourseCommunityUrl: string;
        discourseConsentGiven: boolean;
    }) => {
        try {
            const result = await updateUserProfile({
                discourseUsername: values.discourseUsername.trim() || null,
                discourseCommunityUrl: values.discourseCommunityUrl.trim() || null,
                discourseConsentGiven: values.discourseConsentGiven,
            });

            if (result.success) {
                if (privyUser?.id) {
                    queryClient.setQueryData(userQueryKey(privyUser.id), (oldData: any) => {
                        if (!oldData) return oldData;
                        return {
                            ...oldData,
                            discourseUsername: values.discourseUsername.trim() || null,
                            discourseCommunityUrl: values.discourseCommunityUrl.trim() || null,
                            discourseConsentGiven: values.discourseConsentGiven,
                        };
                    });
                    queryClient.invalidateQueries({ queryKey: ["user"] });
                }
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Failed to update profile:', error);
            throw error;
        }
    };

    const handleConnectToDiscourse = async () => {
        try {
            if (!discourseUsername.trim()) {
                setError('Please enter your username');
                return;
            }

            // Ensure user data is loaded before checking consent
            if (!userData) {
                setError('User data not loaded yet. Please try again.');
                console.log('handleConnectToDiscourse: userData is not available yet.');
                return;
            }
            console.log('handleConnectToDiscourse: Checking consent. Current value:', userData.discourseConsentGiven);

            // If we don't have consent, show the consent dialog
            if (!userData.discourseConsentGiven) {
                console.log('handleConnectToDiscourse: Consent not given, showing dialog.');
                setShowConsentDialog(true);
                return;
            }

            console.log('handleConnectToDiscourse: Consent already given or not required. Proceeding with connection.');
            setIsConnectingToDiscourse(true);
            setError(null);
            setFetchProgress(10); // Start progress

            const cleanUrl = discourseUrl.trim().replace(/\/$/, '');
            const encodedUrl = encodeURIComponent(cleanUrl);

            // Update the profile first
            await handleUpdateProfile({
                discourseUsername: discourseUsername,
                discourseCommunityUrl: cleanUrl,
                discourseConsentGiven: true, // Ensure consent is set to true
            });

            setFetchProgress(20); // Profile updated

            console.log(`Fetching posts for ${discourseUsername} from ${cleanUrl}`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

            const eventSource = new EventSource(`/api/discourse/posts/stream?username=${encodeURIComponent(discourseUsername)}&url=${encodedUrl}`);

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.progress) {
                        setFetchProgress(20 + (data.progress * 0.7)); // Scale progress between 20-90%
                    }
                    if (data.done) {
                        eventSource.close();
                    }
                } catch (e) {
                    console.error("Error parsing SSE message:", e);
                }
            };

            eventSource.onerror = () => {
                eventSource.close();
            };

            const response = await fetch(`/api/discourse/posts?username=${encodeURIComponent(discourseUsername)}&url=${encodedUrl}`, {
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            eventSource.close();
            setFetchProgress(90); // API call complete

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch user messages');
            }

            const data = await response.json();
            console.log('handleConnectToDiscourse: API Response Data:', data); // Log API response

            // The data should be an array of posts
            let rawPosts = [];
            if (data.latest_posts && Array.isArray(data.latest_posts)) {
                rawPosts = data.latest_posts;
            } else if (Array.isArray(data)) { // Check if the root is an array
                rawPosts = data;
            } else {
                console.error('handleConnectToDiscourse: Expected latest_posts array or root array, got:', data);
                throw new Error('Invalid response structure from API');
            }

            if (!Array.isArray(rawPosts)) {
                console.error('handleConnectToDiscourse: Failed to extract posts array, typeof rawPosts:', typeof rawPosts);
                throw new Error('Invalid response format from API');
            }

            // Debugging: Log the first few raw posts
            if (rawPosts.length > 0) {
                console.log('handleConnectToDiscourse: First raw post:', rawPosts[0]);
            }

            // Process messages from Discourse format to our internal format
            setFetchProgress(95); // Processing data
            const processedMessages: DiscourseMessage[] = rawPosts.map((msg: any) => {
                // Double-check the structure of 'msg' here
                const messageContent = msg.content || msg.cooked || ''; // Prioritize 'content' from simplified API, fallback to cooked
                const messageRaw = msg.raw || ''; // Use raw if available

                // Log if content is empty
                if (!messageContent) {
                    console.warn(`[Discourse Processing] Post ID ${msg.id} has empty content (cooked/content). Raw: ${messageRaw.substring(0, 100)}...`);
                }

                return {
                    id: msg.id || Math.random().toString(36).substring(2, 11),
                    content: messageContent,
                    raw: messageRaw,
                    created_at: msg.created_at || new Date().toISOString(),
                    topic_id: msg.topic_id || '',
                    topic_title: msg.topic_title || msg.topic_slug || ''
                };
            });
            console.log('handleConnectToDiscourse: Processed Messages:', processedMessages.length > 0 ? processedMessages[0] : 'No messages'); // Log first processed message

            // Save messages to storage and update state
            saveMessagesToStorage(processedMessages);

            // Force update the storedMessages state directly
            setStoredMessages(processedMessages);
            setHasStoredMessages(processedMessages.length > 0);
            setFetchProgress(100); // Completed

            if (processedMessages.length > 0) {
                toast.success(`Successfully connected to Discourse! Found ${processedMessages.length} messages.`);
            } else {
                toast.info('Connected to Discourse, but no messages found for this username.');
            }

        } catch (error) {
            setError('Failed to fetch messages. Please check the username and try again.');
            console.error("handleConnectToDiscourse Error:", error); // Log the actual error
        } finally {
            setIsConnectingToDiscourse(false);
            // Reset progress after a delay
            setTimeout(() => setFetchProgress(0), 1000);
        }
    };

    const handleConsentAndConnect = async () => {
        try {
            // Ensure user data is available before updating profile
            if (!userData) {
                toast.error('User data not available. Cannot grant consent.');
                console.error('handleConsentAndConnect: userData is null.');
                setShowConsentDialog(false);
                return;
            }

            console.log('handleConsentAndConnect: Granting consent and updating profile.');
            await handleUpdateProfile({
                discourseUsername,
                discourseCommunityUrl: discourseUrl,
                discourseConsentGiven: true,
            });
            setShowConsentDialog(false);

            if (privyUser?.id) {
                await queryClient.invalidateQueries({ queryKey: userQueryKey(privyUser.id) });
            }
            handleConnectToDiscourse(); // Re-attempt connection
        } catch (error) {
            console.error('Failed to update consent:', error);
            toast.error('Failed to update consent settings');
        }
    };

    const handleViewMessages = () => {
        try {
            console.log("Loading stored messages from localStorage");
            const messages = loadStoredMessages();
            console.log(`Found ${messages.length} messages in localStorage:`, messages);

            // Explicitly update the state with the loaded messages
            setStoredMessages(messages);

            if (messages.length > 0) {
                setShowMessagesModal(true);
            } else {
                toast.error('No messages found. Please connect to Discourse first.');
            }
        } catch (error) {
            console.error("Error loading messages:", error);
            toast.error('Error loading messages from storage');
        }
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        handleConnectToDiscourse();
    };

    const handleDeleteMessages = () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('discourse_messages');
            setStoredMessages([]);
            setHasStoredMessages(false);
            toast.success('Messages deleted successfully');
            router.push('/');
        }
    };

    return (
        <div className="h-screen flex flex-col">
            <div className="bg-background border-b">
                <div className="flex items-center justify-between h-14 px-4">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push('/')}
                            className="text-primary"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <h2 className="text-lg font-semibold">AI Assistant</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        {hasStoredMessages && (
                            <>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleViewMessages}
                                    className="text-primary"
                                    title="View Messages"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-square">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                    </svg>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowDeleteConfirmDialog(true)}
                                    className="text-destructive"
                                    title="Delete Messages"
                                >
                                    <Trash2 className="h-5 w-5" />
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col">
                <div className="flex-1 max-w-2xl mx-auto p-4 space-y-4 w-full">
                    {!hasStoredMessages ? (
                        <div className="text-center space-y-4 py-8">
                            <h3 className="text-lg font-medium">Connect Your Discourse Messages</h3>
                            <p className="text-sm text-muted-foreground">
                                Enter your username to view your messages.
                            </p>
                            <form onSubmit={handleSubmit} className="flex flex-col gap-4 items-center">
                                <div className="w-full max-w-sm space-y-2">
                                    <Label htmlFor="discourse-url">Discourse URL</Label>
                                    <Input
                                        id="discourse-url"
                                        type="url"
                                        name="discourse-url"
                                        placeholder="https://forum.scroll.io"
                                        value={discourseUrl}
                                        onChange={(e) => setDiscourseUrl(e.target.value)}
                                        className="w-full"
                                    />
                                </div>
                                <div className="w-full max-w-sm space-y-2">
                                    <Label htmlFor="discourse-username">Username</Label>
                                    <Input
                                        id="discourse-username"
                                        type="text"
                                        name="discourse-username"
                                        placeholder="username"
                                        value={discourseUsername}
                                        onChange={(e) => setDiscourseUsername(e.target.value)}
                                        className="w-full"
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    disabled={isConnectingToDiscourse || !discourseUsername.trim()}
                                >
                                    {isConnectingToDiscourse ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Connecting...
                                        </>
                                    ) : (
                                        'Connect Messages'
                                    )}
                                </Button>
                            </form>
                            {isConnectingToDiscourse && fetchProgress > 0 && (
                                <div className="mt-4 max-w-sm mx-auto w-full space-y-2">
                                    <Progress value={fetchProgress} className="w-full h-2" />
                                    <p className="text-xs text-muted-foreground text-center">
                                        {fetchProgress < 20 && "Initializing..."}
                                        {fetchProgress >= 20 && fetchProgress < 90 && "Fetching messages..."}
                                        {fetchProgress >= 90 && fetchProgress < 95 && "Processing data..."}
                                        {fetchProgress >= 95 && "Finishing up..."}
                                    </p>
                                </div>
                            )}
                            {error && (
                                <p className="text-sm text-destructive">{error}</p>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col h-full">
                            <div className="flex-1 space-y-4">
                                {/* 
                                  Chat message area - this will be populated later 
                                  with actual chat functionality 
                                */}
                                <div className="p-4 bg-muted/30 rounded-lg">
                                    <p className="text-sm text-muted-foreground">
                                        Connected to {discourseUrl} as @{discourseUsername}
                                    </p>
                                    <p className="text-sm mt-2">
                                        You can now chat with the AI Assistant. Your messages from Discourse
                                        will be used to provide context.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Chat input - fixed at the bottom for better UX */}
                {hasStoredMessages && (
                    <div className="sticky bottom-0 bg-background pt-4 pb-4 px-4 border-t">
                        <div className="max-w-2xl mx-auto w-full">
                            <form className="flex gap-2" onSubmit={(e) => {
                                e.preventDefault();
                                // Handle chat message submission
                                toast.info("Chat functionality coming soon!");
                            }}>
                                <Input
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Type your message..."
                                    className="flex-1"
                                />
                                <Button type="submit">Send</Button>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            {/* Messages Modal */}
            <Dialog open={showMessagesModal} onOpenChange={setShowMessagesModal}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Your Discourse Messages</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                        <div className="space-y-4">
                            {storedMessages && storedMessages.length > 0 ? (
                                storedMessages.map((message, index) => (
                                    <div key={message.id || index} className="space-y-2">
                                        <div className="flex justify-between items-center text-sm text-muted-foreground">
                                            <span>{message.created_at ? new Date(message.created_at).toLocaleString() : 'No date'}</span>
                                            {message.topic_title && (
                                                <span className="text-primary">
                                                    {message.topic_title}
                                                </span>
                                            )}
                                        </div>
                                        {message.content ? (
                                            <div
                                                className="rounded-lg bg-muted p-3"
                                                dangerouslySetInnerHTML={{
                                                    __html: message.content
                                                }}
                                            />
                                        ) : message.raw ? (
                                            <div className="rounded-lg bg-muted p-3">
                                                <p>{message.raw}</p>
                                            </div>
                                        ) : (
                                            <div className="rounded-lg bg-muted p-3">
                                                <p className="text-muted-foreground">No content available</p>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-muted-foreground py-8">
                                    No messages found for this username
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>

            {/* Consent Dialog */}
            <Dialog open={showConsentDialog} onOpenChange={setShowConsentDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Feature Improvement Consent</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground mb-4">
                            To help improve and use our features, we&apos;d like to use your public forum messages. This data will be used to:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground mb-6">
                            <li>Enhance the overall user experience</li>
                            <li>Facilitate the ChatBot feature</li>
                            <li>Enhance our AI suggestions and improvements</li>
                            <li>And more!</li>
                        </ul>
                        <p className="text-sm text-muted-foreground">
                            You can change this setting anytime in your profile settings.
                        </p>
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setShowConsentDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleConsentAndConnect}>
                            Allow and Connect
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Messages</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete all saved messages? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteMessages}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
} 