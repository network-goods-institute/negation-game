"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeftIcon, ExternalLinkIcon } from "lucide-react";
import { useState, useMemo } from "react";
import { updateUserProfile } from "@/actions/users/updateUserProfile";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { userQueryKey } from "@/queries/users/useUser";
import { usePrivy } from "@privy-io/react-auth";

interface ProfileEditDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentBio?: string | null;
    currentDelegationUrl?: string | null;
    currentAgoraLink?: string | null;
    currentScrollDelegateLink?: string | null;
    currentDiscourseUsername?: string | null;
    currentDiscourseCommunityUrl?: string | null;
    currentDiscourseConsentGiven?: boolean;
}

const ProfileEditDialogContent = ({
    onOpenChange,
    currentBio,
    currentDelegationUrl,
    currentAgoraLink,
    currentScrollDelegateLink,
    currentDiscourseUsername,
    currentDiscourseCommunityUrl,
    currentDiscourseConsentGiven = false,
}: Omit<ProfileEditDialogProps, 'open'>) => {
    const [bio, setBio] = useState(currentBio || "");
    const [delegationUrl, setDelegationUrl] = useState(currentDelegationUrl || "");
    const [agoraLink, setAgoraLink] = useState(currentAgoraLink || "");
    const [scrollDelegateLink, setScrollDelegateLink] = useState(currentScrollDelegateLink || "");
    const [discourseUsername, setDiscourseUsername] = useState(currentDiscourseUsername || "");
    const [discourseCommunityUrl, setDiscourseCommunityUrl] = useState(currentDiscourseCommunityUrl || "");
    const [discourseConsentGiven, setDiscourseConsentGiven] = useState(currentDiscourseConsentGiven);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const queryClient = useQueryClient();
    const { user: privyUser } = usePrivy();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            let processedDelegationUrl = delegationUrl.trim();
            if (processedDelegationUrl && !processedDelegationUrl.startsWith("http")) {
                processedDelegationUrl = `https://${processedDelegationUrl}`;
            }

            let processedAgoraLink = agoraLink.trim();
            if (processedAgoraLink && !processedAgoraLink.startsWith("http")) {
                processedAgoraLink = `https://${processedAgoraLink}`;
            }

            let processedScrollDelegateLink = scrollDelegateLink.trim();
            if (processedScrollDelegateLink && !processedScrollDelegateLink.startsWith("http")) {
                processedScrollDelegateLink = `https://${processedScrollDelegateLink}`;
            }

            let processedDiscourseCommunityUrl = discourseCommunityUrl.trim();
            if (processedDiscourseCommunityUrl && !processedDiscourseCommunityUrl.startsWith("http")) {
                processedDiscourseCommunityUrl = `https://${processedDiscourseCommunityUrl}`;
            }

            const result = await updateUserProfile({
                bio: bio.trim() || null,
                delegationUrl: processedDelegationUrl || null,
                agoraLink: processedAgoraLink || null,
                scrollDelegateLink: processedScrollDelegateLink || null,
                discourseUsername: discourseUsername.trim() || null,
                discourseCommunityUrl: processedDiscourseCommunityUrl || null,
                discourseConsentGiven,
            });

            if (result.success) {
                toast.success("Profile updated successfully");
                onOpenChange(false);

                if (privyUser?.id) {
                    const updateData = {
                        bio: bio.trim() || null,
                        delegationUrl: processedDelegationUrl || null,
                        agoraLink: processedAgoraLink || null,
                        scrollDelegateLink: processedScrollDelegateLink || null,
                        discourseUsername: discourseUsername.trim() || null,
                        discourseCommunityUrl: processedDiscourseCommunityUrl || null,
                        discourseConsentGiven,
                    };

                    queryClient.setQueryData(userQueryKey(privyUser.id), (oldData: any) => {
                        if (!oldData) return oldData;
                        return { ...oldData, ...updateData };
                    });

                    const userData = queryClient.getQueryData(userQueryKey(privyUser.id)) as any;
                    if (userData?.username) {
                        queryClient.setQueryData(userQueryKey(userData.username), (oldData: any) => {
                            if (!oldData) return oldData;
                            return { ...oldData, ...updateData };
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

    const displayUrl = (url: string) => {
        if (!url) return "";
        try {
            const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`);
            return `${urlObj.hostname}${urlObj.pathname.length > 15 ? urlObj.pathname.substring(0, 15) + "..." : urlObj.pathname}`;
        } catch {
            return url.length > 30 ? url.substring(0, 30) + "..." : url;
        }
    };

    const processedDelegationUrl = useMemo(() => {
        if (!delegationUrl) return '';
        return delegationUrl.startsWith("http") ? delegationUrl : `https://${delegationUrl}`;
    }, [delegationUrl]);

    const displayedDelegationUrl = useMemo(() => {
        return displayUrl(delegationUrl);
    }, [delegationUrl]);

    const processedDiscourseUrl = useMemo(() => {
        if (!discourseCommunityUrl) return '';
        return discourseCommunityUrl.startsWith("http") ? discourseCommunityUrl : `https://${discourseCommunityUrl}`;
    }, [discourseCommunityUrl]);

    const displayedDiscourseUrl = useMemo(() => {
        return displayUrl(discourseCommunityUrl);
    }, [discourseCommunityUrl]);

    return (
        <DialogContent className="flex flex-col h-[90vh] max-h-[800px] p-0 gap-0">
            <DialogHeader className="flex-none px-4 py-3 border-b">
                <div className="flex items-center gap-2">
                    <DialogClose asChild>
                        <Button variant="ghost" size="icon" className="text-primary -ml-2">
                            <ArrowLeftIcon className="size-5" />
                        </Button>
                    </DialogClose>
                    <DialogTitle>Edit Profile</DialogTitle>
                </div>
            </DialogHeader>

            <div className="flex-1 min-h-0">
                <ScrollArea className="h-full">
                    <form id="profile-form" onSubmit={handleSubmit}>
                        <div className="px-4 py-6 space-y-8">
                            {/* Bio Section */}
                            <div className="space-y-2">
                                <Label htmlFor="bio" className="text-base font-medium">Bio</Label>
                                <Textarea
                                    id="bio"
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    placeholder="Tell us about yourself"
                                    maxLength={1000}
                                    className="resize-none min-h-24 w-full"
                                />
                                <p className="text-xs text-muted-foreground text-right">
                                    {bio.length}/1000
                                </p>
                            </div>

                            {/* Governance Links Section */}
                            <div className="space-y-6 border-t pt-6">
                                <h3 className="text-lg font-semibold">Governance Links</h3>
                                
                                {/* Agora Link */}
                                <div className="space-y-2">
                                    <div className="mb-1">
                                        <Label htmlFor="agoraLink" className="text-base font-medium">Agora Profile URL</Label>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Your Agora governance profile link
                                        </p>
                                    </div>
                                    <Input
                                        id="agoraLink"
                                        value={agoraLink}
                                        onChange={(e) => setAgoraLink(e.target.value)}
                                        placeholder="https://agora.xyz/delegates/..."
                                        type="url"
                                        className="w-full"
                                    />
                                </div>

                                {/* Scroll Delegate Link */}
                                <div className="space-y-2">
                                    <div className="mb-1">
                                        <Label htmlFor="scrollDelegateLink" className="text-base font-medium">Scroll Delegate URL</Label>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Your Scroll governance delegate link
                                        </p>
                                    </div>
                                    <Input
                                        id="scrollDelegateLink"
                                        value={scrollDelegateLink}
                                        onChange={(e) => setScrollDelegateLink(e.target.value)}
                                        placeholder="https://gov.scroll.io/delegates/..."
                                        type="url"
                                        className="w-full"
                                    />
                                </div>

                                {/* Other Delegation URL */}
                                <div className="space-y-2">
                                    <div className="mb-1">
                                        <Label htmlFor="delegationUrl" className="text-base font-medium">Other Delegation URL</Label>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Other governance delegation link
                                        </p>
                                    </div>
                                    <Input
                                        id="delegationUrl"
                                        value={delegationUrl}
                                        onChange={(e) => setDelegationUrl(e.target.value)}
                                        placeholder="https://..."
                                        type="url"
                                        className="w-full"
                                    />
                                    {delegationUrl && (
                                        <div className="mt-2 p-3 bg-muted/30 rounded-md">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium">Preview:</span>
                                                <a
                                                    href={processedDelegationUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary flex items-center gap-1 ml-auto text-xs hover:underline"
                                                >
                                                    Open link <ExternalLinkIcon className="size-3" />
                                                </a>
                                            </div>
                                            <div className="mt-1.5 text-sm overflow-hidden text-ellipsis">
                                                {displayedDelegationUrl}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                <p className="text-xs text-muted-foreground">
                                    Adding governance links helps others find and delegate to you. Priority: Scroll Delegate &gt; Agora &gt; Other.
                                </p>
                            </div>

                            {/* Discourse Integration Section */}
                            <div className="space-y-6 border-t pt-6">
                                <div className="space-y-2">
                                    <div className="mb-1">
                                        <Label htmlFor="discourseUsername" className="text-base font-medium">Discourse Username</Label>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Your username on the community forum
                                        </p>
                                    </div>
                                    <Input
                                        id="discourseUsername"
                                        value={discourseUsername}
                                        onChange={(e) => setDiscourseUsername(e.target.value)}
                                        placeholder="Enter your Discourse username"
                                        className="w-full"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="mb-1">
                                        <Label htmlFor="discourseCommunityUrl" className="text-base font-medium">Community Forum URL</Label>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            The URL of your community&apos;s Discourse forum
                                        </p>
                                    </div>
                                    <Input
                                        id="discourseCommunityUrl"
                                        value={discourseCommunityUrl}
                                        onChange={(e) => setDiscourseCommunityUrl(e.target.value)}
                                        placeholder="https://forum.example.com"
                                        type="url"
                                        className="w-full"
                                    />
                                    {discourseCommunityUrl && (
                                        <div className="mt-2 p-3 bg-muted/30 rounded-md">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium">Preview:</span>
                                                <a
                                                    href={processedDiscourseUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary flex items-center gap-1 ml-auto text-xs hover:underline"
                                                >
                                                    Open link <ExternalLinkIcon className="size-3" />
                                                </a>
                                            </div>
                                            <div className="mt-1.5 text-sm overflow-hidden text-ellipsis">
                                                {displayedDiscourseUrl}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between space-x-2">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="discourseConsent" className="text-base font-medium">Feature Use and Improvement Consent</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Allow us to use your public forum messages to improve and use our features.
                                        </p>
                                    </div>
                                    <Switch
                                        id="discourseConsent"
                                        checked={discourseConsentGiven}
                                        onCheckedChange={setDiscourseConsentGiven}
                                    />
                                </div>
                            </div>
                        </div>
                    </form>
                </ScrollArea>
            </div>

            <div className="flex-none px-4 py-3 border-t bg-background flex justify-end gap-3">
                <DialogClose asChild>
                    <Button variant="outline" type="button">
                        Cancel
                    </Button>
                </DialogClose>
                <Button type="submit" form="profile-form" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
            </div>
        </DialogContent>
    );
};

export const ProfileEditDialog = ({ open, ...props }: ProfileEditDialogProps) => {
    if (!open) return null;

    return (
        <Dialog open={open} onOpenChange={props.onOpenChange}>
            <ProfileEditDialogContent {...props} />
        </Dialog>
    );
};
