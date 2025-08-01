"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/queries/users/useUser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateUserSettings } from "@/mutations/user/useUpdateUserSettings";
import { useNotificationPreferences } from "@/queries/notifications/useNotificationPreferences";
import { useUpdateNotificationPreferences } from "@/mutations/notifications/useUpdateNotificationPreferences";
import { usePrivy } from "@privy-io/react-auth";
import { LoaderCircleIcon, MessageCircleIcon, BellIcon } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export const SettingsContainer = () => {
    const { data: user, isLoading } = useUser();
    const { ready, authenticated } = usePrivy();
    const { data: preferences, isLoading: preferencesLoading } = useNotificationPreferences();
    const updateSettings = useUpdateUserSettings();
    const updatePreferences = useUpdateNotificationPreferences();

    const [showReadReceipts, setShowReadReceipts] = useState(user?.showReadReceipts ?? true);
    const [receiveReadReceipts, setReceiveReadReceipts] = useState(user?.receiveReadReceipts ?? true);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        if (user) {
            setShowReadReceipts(user.showReadReceipts);
            setReceiveReadReceipts(user.receiveReadReceipts);
            setHasChanges(false);
        }
    }, [user]);

    const handleSave = async () => {
        if (!user) return;

        try {
            await updateSettings.mutateAsync({
                showReadReceipts,
                receiveReadReceipts,
            });
            setHasChanges(false);
            toast.success("Settings saved successfully");
        } catch (error) {
            toast.error("Failed to save settings");
        }
    };

    const updateShowReadReceipts = (value: boolean) => {
        setShowReadReceipts(value);
        setHasChanges(true);
    };

    const updateReceiveReadReceipts = (value: boolean) => {
        setReceiveReadReceipts(value);
        setHasChanges(true);
    };

    if (isLoading || preferencesLoading) {
        return (
            <div className="space-y-6">
                <div className="border rounded-lg bg-card">
                    <div className="p-6 border-b">
                        <div className="flex items-center space-x-3">
                            <Skeleton className="h-5 w-5" />
                            <Skeleton className="h-6 w-24" />
                        </div>
                    </div>
                    <div className="p-6 space-y-6">
                        {Array.from({ length: 2 }).map((_, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-3 w-64" />
                                </div>
                                <Skeleton className="h-6 w-11 rounded-full" />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="border rounded-lg bg-card">
                    <div className="p-6 border-b">
                        <div className="flex items-center space-x-3">
                            <Skeleton className="h-5 w-5" />
                            <Skeleton className="h-6 w-32" />
                        </div>
                    </div>
                    <div className="p-6 space-y-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-3 w-64" />
                                </div>
                                <Skeleton className="h-6 w-11 rounded-full" />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="border rounded-lg bg-card">
                    <div className="p-6 border-b">
                        <Skeleton className="h-6 w-44" />
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-10 w-48" />
                            <Skeleton className="h-3 w-72" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!user || !ready || !authenticated) {
        return (
            <div className="text-center p-8">
                <p className="text-muted-foreground">Please log in to view settings.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Messages Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <MessageCircleIcon className="w-5 h-5" />
                        Messages
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <Label htmlFor="show-read-receipts" className="text-base font-medium">
                                    Show read receipts
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    Let others see when you&apos;ve read their messages
                                </p>
                            </div>
                            <Switch
                                id="show-read-receipts"
                                checked={showReadReceipts}
                                onCheckedChange={updateShowReadReceipts}
                            />
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <Label htmlFor="receive-read-receipts" className="text-base font-medium">
                                    Receive read receipts
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    See when others have read your messages (only works if they also share read receipts)
                                </p>
                            </div>
                            <Switch
                                id="receive-read-receipts"
                                checked={receiveReadReceipts}
                                onCheckedChange={updateReceiveReadReceipts}
                            />
                        </div>
                    </div>

                    {hasChanges && (
                        <div className="pt-4 border-t">
                            <Button
                                onClick={handleSave}
                                disabled={updateSettings.isPending}
                                className="w-full sm:w-auto"
                            >
                                {updateSettings.isPending ? (
                                    <>
                                        <LoaderCircleIcon className="w-4 h-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    "Save Changes"
                                )}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Notifications Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <BellIcon className="w-5 h-5" />
                        Notifications
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Endorsements</Label>
                                <p className="text-sm text-muted-foreground">
                                    When someone endorses your points
                                </p>
                            </div>
                            <Switch
                                checked={preferences?.endorsementNotifications ?? true}
                                onCheckedChange={(checked) =>
                                    updatePreferences.mutate({ endorsementNotifications: checked })
                                }
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Negations</Label>
                                <p className="text-sm text-muted-foreground">
                                    When someone creates a counterpoint to your points
                                </p>
                            </div>
                            <Switch
                                checked={preferences?.negationNotifications ?? true}
                                onCheckedChange={(checked) =>
                                    updatePreferences.mutate({ negationNotifications: checked })
                                }
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Restakes, Slashes & Doubts</Label>
                                <p className="text-sm text-muted-foreground">
                                    When someone restakes, slashes, or doubts related to your points
                                </p>
                            </div>
                            <Switch
                                checked={preferences?.restakeNotifications ?? true}
                                onCheckedChange={(checked) =>
                                    updatePreferences.mutate({ restakeNotifications: checked })
                                }
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Rationale Mentions</Label>
                                <p className="text-sm text-muted-foreground">
                                    When your points are mentioned in rationales
                                </p>
                            </div>
                            <Switch
                                checked={preferences?.rationaleNotifications ?? true}
                                onCheckedChange={(checked) =>
                                    updatePreferences.mutate({ rationaleNotifications: checked })
                                }
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Scroll Proposals</Label>
                                <p className="text-sm text-muted-foreground">
                                    When new governance proposals are detected from forum.scroll.io
                                </p>
                            </div>
                            <Switch
                                checked={preferences?.scrollProposalNotifications ?? false}
                                onCheckedChange={(checked) =>
                                    updatePreferences.mutate({ scrollProposalNotifications: checked })
                                }
                            />
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                        <Label>AI Summary Frequency</Label>
                        <Select
                            value={preferences?.digestFrequency ?? "daily"}
                            onValueChange={(value: "none" | "daily" | "weekly") =>
                                updatePreferences.mutate({ digestFrequency: value })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">
                            Get AI-generated summaries shown directly in your notifications
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}; 