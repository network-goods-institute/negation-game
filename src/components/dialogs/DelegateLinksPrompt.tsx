"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Vote, X } from "lucide-react";
import { updateUserProfile } from "@/actions/users/updateUserProfile";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { userQueryKey } from "@/queries/users/useUser";
import { usePrivy } from "@privy-io/react-auth";

interface DelegateLinksPromptProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type DelegateType = "agora" | "scroll" | "none";

export function DelegateLinksPrompt({ open, onOpenChange }: DelegateLinksPromptProps) {
    const [delegateType, setDelegateType] = useState<DelegateType | null>(null);
    const [agoraLink, setAgoraLink] = useState("");
    const [scrollDelegateLink, setScrollDelegateLink] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const queryClient = useQueryClient();
    const { user: privyUser } = usePrivy();

    useEffect(() => {
        if (open) {
            const hasSeenPrompt = localStorage.getItem("hasSeenDelegatePrompt");
            if (hasSeenPrompt) {
                onOpenChange(false);
            }
        }
    }, [open, onOpenChange]);

    const handleSubmit = async () => {
        setIsSubmitting(true);

        try {
            let updateData: any = {};

            if (delegateType === "agora" && agoraLink.trim()) {
                let processedAgoraLink = agoraLink.trim();
                if (!processedAgoraLink.startsWith("http")) {
                    processedAgoraLink = `https://${processedAgoraLink}`;
                }
                updateData.agoraLink = processedAgoraLink;
            }

            if (delegateType === "scroll" && scrollDelegateLink.trim()) {
                let processedScrollLink = scrollDelegateLink.trim();
                if (!processedScrollLink.startsWith("http")) {
                    processedScrollLink = `https://${processedScrollLink}`;
                }
                updateData.scrollDelegateLink = processedScrollLink;
            }

            const result = await updateUserProfile(updateData);

            if (result.success) {
                toast.success("Delegate links updated successfully");
                localStorage.setItem("hasSeenDelegatePrompt", "true");
                onOpenChange(false);

                if (privyUser?.id) {
                    queryClient.setQueryData(userQueryKey(privyUser.id), (oldData: any) => {
                        if (!oldData) return oldData;
                        return { ...oldData, ...updateData };
                    });
                    queryClient.invalidateQueries({ queryKey: ["user"] });
                }
            } else {
                toast.error(`Failed to update delegate links: ${result.error}`);
            }
        } catch (error) {
            toast.error("An error occurred while updating delegate links");
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSkip = () => {
        localStorage.setItem("hasSeenDelegatePrompt", "true");
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Vote className="h-5 w-5" />
                        Connect Your Governance Profile
                    </DialogTitle>
                    <DialogDescription>
                        Help others discover your governance participation by connecting your delegate profile.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">

                    <div className="grid gap-4">
                        <Card
                            className={`cursor-pointer transition-all ${delegateType === "agora" ? "ring-2 ring-primary" : ""
                                }`}
                            onClick={() => setDelegateType("agora")}
                        >
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Users className="h-4 w-4" />
                                    Agora Delegate
                                </CardTitle>
                                <CardDescription>
                                    Connect your Agora governance profile
                                </CardDescription>
                            </CardHeader>
                            {delegateType === "agora" && (
                                <CardContent>
                                    <div className="space-y-2">
                                        <Label htmlFor="agoraLink">Agora Profile URL</Label>
                                        <Input
                                            id="agoraLink"
                                            value={agoraLink}
                                            onChange={(e) => setAgoraLink(e.target.value)}
                                            placeholder="https://agora.xyz/delegates/..."
                                            type="url"
                                        />
                                    </div>
                                </CardContent>
                            )}
                        </Card>

                        <Card
                            className={`cursor-pointer transition-all ${delegateType === "scroll" ? "ring-2 ring-primary" : ""
                                }`}
                            onClick={() => setDelegateType("scroll")}
                        >
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Vote className="h-4 w-4" />
                                    Scroll Delegate
                                </CardTitle>
                                <CardDescription>
                                    Connect your Scroll governance profile
                                </CardDescription>
                            </CardHeader>
                            {delegateType === "scroll" && (
                                <CardContent>
                                    <div className="space-y-2">
                                        <Label htmlFor="scrollDelegateLink">Scroll Delegate URL</Label>
                                        <Input
                                            id="scrollDelegateLink"
                                            value={scrollDelegateLink}
                                            onChange={(e) => setScrollDelegateLink(e.target.value)}
                                            placeholder="https://gov.scroll.io/delegates/..."
                                            type="url"
                                        />
                                    </div>
                                </CardContent>
                            )}
                        </Card>

                        <Card
                            className={`cursor-pointer transition-all ${delegateType === "none" ? "ring-2 ring-primary" : ""
                                }`}
                            onClick={() => setDelegateType("none")}
                        >
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <X className="h-4 w-4" />
                                    Not a Delegate
                                </CardTitle>
                                <CardDescription>
                                    I&apos;m not currently a governance delegate
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={handleSkip}>
                            Skip for now
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={
                                !delegateType ||
                                isSubmitting ||
                                (delegateType === "agora" && !agoraLink.trim()) ||
                                (delegateType === "scroll" && !scrollDelegateLink.trim())
                            }
                        >
                            {isSubmitting ? "Saving..." : "Save"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}