"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SettingsIcon, ArrowLeftIcon, LoaderCircleIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useNotificationPreferences } from "@/queries/notifications/useNotificationPreferences";
import { useUpdateNotificationPreferences } from "@/mutations/notifications/useUpdateNotificationPreferences";
import { usePrivy } from "@privy-io/react-auth";

export const NotificationSettingsPage = () => {
    const router = useRouter();
    const { ready, authenticated } = usePrivy();
    const { data: preferences, isLoading } = useNotificationPreferences();
    const updatePreferences = useUpdateNotificationPreferences();

    return (
        <div className="container max-w-2xl mx-auto p-6">
            <div className="flex items-center gap-3 mb-6">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.back()}
                    className="mr-2"
                >
                    <ArrowLeftIcon className="w-4 h-4" />
                </Button>
                <SettingsIcon className="w-6 h-6" />
                <h1 className="text-2xl font-bold">Notification Settings</h1>
            </div>

            {!ready || (!authenticated && ready) ? (
                <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                        <LoaderCircleIcon className="w-6 h-6 animate-spin mx-auto mb-4" />
                        {ready && !authenticated ? (
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Sign in to access settings</h3>
                                <p className="text-muted-foreground">
                                    You need to sign in to view and manage your notification preferences
                                </p>
                            </div>
                        ) : (
                            <p className="text-muted-foreground">Loading...</p>
                        )}
                    </div>
                </div>
            ) : isLoading ? (
                <div className="flex items-center justify-center py-8">
                    <LoaderCircleIcon className="w-6 h-6 animate-spin" />
                </div>
            ) : (
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Notification Types</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
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
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>AI Digest Settings</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
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
            )}
        </div>
    );
}; 