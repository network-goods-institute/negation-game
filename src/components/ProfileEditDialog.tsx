"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeftIcon, ExternalLinkIcon } from "lucide-react";
import { useState } from "react";
import { updateUserProfile } from "@/actions/updateUserProfile";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { userQueryKey } from "@/queries/useUser";
import { usePrivy } from "@privy-io/react-auth";

interface ProfileEditDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentBio?: string | null;
    currentDelegationUrl?: string | null;
}

export const ProfileEditDialog = ({
    open,
    onOpenChange,
    currentBio,
    currentDelegationUrl,
}: ProfileEditDialogProps) => {
    const [bio, setBio] = useState(currentBio || "");
    const [delegationUrl, setDelegationUrl] = useState(currentDelegationUrl || "");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const queryClient = useQueryClient();
    const { user: privyUser } = usePrivy();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            let processedUrl = delegationUrl.trim();
            if (processedUrl && !processedUrl.startsWith("http")) {
                processedUrl = `https://${processedUrl}`;
            }

            const result = await updateUserProfile({
                bio: bio.trim() || null,
                delegationUrl: processedUrl || null,
            });

            if (result.success) {
                toast.success("Profile updated successfully");
                onOpenChange(false);

                // Immediately update the cached user data with the new bio and delegation URL
                if (privyUser?.id) {
                    // Update all user queries that might be showing this user's data
                    // 1. Update by user ID
                    queryClient.setQueryData(userQueryKey(privyUser.id), (oldData: any) => {
                        if (!oldData) return oldData;
                        return {
                            ...oldData,
                            bio: bio.trim() || null,
                            delegationUrl: processedUrl || null,
                        };
                    });

                    const userData = queryClient.getQueryData(userQueryKey(privyUser.id)) as any;
                    if (userData?.username) {
                        queryClient.setQueryData(userQueryKey(userData.username), (oldData: any) => {
                            if (!oldData) return oldData;
                            return {
                                ...oldData,
                                bio: bio.trim() || null,
                                delegationUrl: processedUrl || null,
                            };
                        });
                    }
                    queryClient.invalidateQueries({ queryKey: ["user"] });
                }
            } else {
                toast.error(`Failed to update profile: ${result.error}`);
            }
        } catch (error) {
            toast.error("An error occurred while updating your profile");
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Function to display a shortened version of the URL
    const displayUrl = (url: string) => {
        if (!url) return "";
        try {
            const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`);
            return `${urlObj.hostname}${urlObj.pathname.length > 15 ? urlObj.pathname.substring(0, 15) + "..." : urlObj.pathname}`;
        } catch {
            return url.length > 30 ? url.substring(0, 30) + "..." : url;
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md max-h-[90vh] p-0 overflow-hidden">
                <DialogHeader className="p-4 border-b sticky top-0 bg-background z-10">
                    <div className="flex items-center gap-2">
                        <DialogClose asChild>
                            <Button variant="ghost" size="icon" className="text-primary -ml-2">
                                <ArrowLeftIcon className="size-5" />
                            </Button>
                        </DialogClose>
                        <DialogTitle>Edit Profile</DialogTitle>
                    </div>
                </DialogHeader>

                <div className="overflow-y-auto p-4">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="bio" className="text-base font-medium">Bio</Label>
                            <Textarea
                                id="bio"
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                placeholder="Tell us about yourself"
                                maxLength={500}
                                className="resize-none min-h-24 w-full"
                            />
                            <p className="text-xs text-muted-foreground text-right">
                                {bio.length}/500
                            </p>
                        </div>

                        <div className="space-y-2">
                            <div className="mb-1">
                                <Label htmlFor="delegationUrl" className="text-base font-medium">Delegation URL</Label>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Your governance account delegation link
                                </p>
                            </div>
                            <Input
                                id="delegationUrl"
                                value={delegationUrl}
                                onChange={(e) => setDelegationUrl(e.target.value)}
                                placeholder="https://gov.scroll.io/delegates/..."
                                type="url"
                                className="w-full"
                            />

                            {delegationUrl && (
                                <div className="mt-2 p-3 bg-muted/30 rounded-md">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">Preview:</span>
                                        <a
                                            href={delegationUrl.startsWith("http") ? delegationUrl : `https://${delegationUrl}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary flex items-center gap-1 ml-auto text-xs hover:underline"
                                        >
                                            Open link <ExternalLinkIcon className="size-3" />
                                        </a>
                                    </div>
                                    <div className="mt-1.5 text-sm overflow-hidden text-ellipsis">
                                        {displayUrl(delegationUrl)}
                                    </div>
                                </div>
                            )}

                            <p className="text-xs text-muted-foreground mt-2">
                                Adding your delegation URL shows a heart icon next to your name in the leaderboard and prompts viewers to delegate to you.
                            </p>
                        </div>

                        <div className="flex justify-end gap-3 pt-2 sticky bottom-0 bg-background border-t p-4 -mx-4 -mb-4 mt-8">
                            <DialogClose asChild>
                                <Button variant="outline" type="button">
                                    Cancel
                                </Button>
                            </DialogClose>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
};
