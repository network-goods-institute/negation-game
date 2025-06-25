"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/queries/users/useUser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useUpdateUserSettings } from "@/mutations/user/useUpdateUserSettings";
import { LoaderCircleIcon, MessageCircleIcon, EyeIcon, BellIcon } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export const SettingsContainer = () => {
    const { data: user, isLoading } = useUser();
    const updateSettings = useUpdateUserSettings();

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

    if (isLoading) {
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
                    <div className="p-6">
                        <Skeleton className="h-3 w-80 mb-4" />
                        <Skeleton className="h-10 w-48" />
                    </div>
                </div>
            </div>
        );
    }

    if (!user) {
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
                <CardContent>
                    <p className="text-muted-foreground mb-4">
                        Manage your notification preferences and digest settings
                    </p>
                    <Link href="/settings/notifications">
                        <Button variant="outline" className="w-full sm:w-auto">
                            <EyeIcon className="w-4 h-4 mr-2" />
                            View Notification Settings
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
    );
}; 