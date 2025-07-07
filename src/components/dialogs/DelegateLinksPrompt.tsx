"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@radix-ui/react-radio-group";
import { Users, Vote, Link, X } from "lucide-react";
import { updateUserProfile } from "@/actions/users/updateUserProfile";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { userQueryKey } from "@/queries/users/useUser";
import { usePrivy } from "@privy-io/react-auth";
import { useUser } from "@/queries/users/useUser";
import { useCurrentSpace } from "@/hooks/utils/useCurrentSpace";
import { cn } from "@/lib/utils/cn";

interface DelegateLinksPromptProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type DelegateType = "agora" | "scroll" | "delegation" | "none";

export function DelegateLinksPrompt({ open, onOpenChange }: DelegateLinksPromptProps) {
    const [delegateType, setDelegateType] = useState<DelegateType | null>(null);
    const [agoraLink, setAgoraLink] = useState("");
    const [scrollDelegateLink, setScrollDelegateLink] = useState("");
    const [delegationUrl, setDelegationUrl] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const queryClient = useQueryClient();
    const { user: privyUser } = usePrivy();
    const { data: userData } = useUser(privyUser?.id);
    const currentSpace = useCurrentSpace();

    useEffect(() => {
        if (open) {
            const hasSeenPrompt = localStorage.getItem("hasSeenDelegatePrompt");
            if (hasSeenPrompt) {
                onOpenChange(false);
            }
        }
    }, [open, onOpenChange]);

    const availableOptions = {
        agora: !userData?.agoraLink,
        scroll: !userData?.scrollDelegateLink,
        delegation: !userData?.delegationUrl,
    };

    const hasAnyAvailableOptions = Object.values(availableOptions).some(Boolean);

    useEffect(() => {
        if (open && !hasAnyAvailableOptions) {
            localStorage.setItem("hasSeenDelegatePrompt", "true");
            onOpenChange(false);
        }
    }, [open, hasAnyAvailableOptions, onOpenChange]);

    // Don't render if not in scroll space
    if (currentSpace !== "scroll") {
        return null;
    }

    const isValidUrl = (url: string): boolean => {
        if (!url.trim()) return false;
        try {
            const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch {
            return false;
        }
    };

    const getCurrentUrl = (): string => {
        if (delegateType === "agora") return agoraLink;
        if (delegateType === "scroll") return scrollDelegateLink;
        if (delegateType === "delegation") return delegationUrl;
        return "";
    };

    const isCurrentUrlValid = (): boolean => {
        if (delegateType === "none" || delegateType === null) return true;
        return isValidUrl(getCurrentUrl());
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);

        try {
            let updateData: any = {};

            if (delegateType === "none") {
                // For "not a delegate", we just mark the prompt as seen without updating any fields
                localStorage.setItem("hasSeenDelegatePrompt", "true");
                toast.success("Preference saved successfully!");
                onOpenChange(false);
                setIsSubmitting(false);
                return;
            }

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

            if (delegateType === "delegation" && delegationUrl.trim()) {
                let processedDelegationUrl = delegationUrl.trim();
                if (!processedDelegationUrl.startsWith("http")) {
                    processedDelegationUrl = `https://${processedDelegationUrl}`;
                }
                updateData.delegationUrl = processedDelegationUrl;
            }

            const result = await updateUserProfile(updateData);

            if (result.success) {
                toast.success("Governance profile connected successfully!");
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
                toast.error(`Failed to connect governance profile: ${result.error}`);
            }
        } catch (error) {
            toast.error("An error occurred while connecting your governance profile");
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSkip = () => {
        localStorage.setItem("hasSeenDelegatePrompt", "true");
        onOpenChange(false);
    };

    if (!hasAnyAvailableOptions) {
        return null;
    }

    const options = [
        ...(availableOptions.agora ? [{
            value: "agora" as const,
            icon: Users,
            label: "Agora Delegate",
            description: "Connect your Agora governance profile",
            placeholder: "https://agora.xyz/delegates/..."
        }] : []),
        ...(availableOptions.scroll ? [{
            value: "scroll" as const,
            icon: Vote,
            label: "Scroll Delegate", 
            description: "Connect your Scroll governance profile",
            placeholder: "https://gov.scroll.io/delegates/..."
        }] : []),
        ...(availableOptions.delegation ? [{
            value: "delegation" as const,
            icon: Link,
            label: "General Delegation",
            description: "Connect your general delegation profile",
            placeholder: "https://..."
        }] : []),
        {
            value: "none" as const,
            icon: X,
            label: "Not a Delegate",
            description: "I'm not currently a governance delegate",
            placeholder: ""
        }
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader className="text-center space-y-3 pb-6">
                    <DialogTitle className="flex items-center justify-center gap-2 text-xl">
                        <Vote className="h-5 w-5 text-primary" />
                        Connect Governance Profile
                    </DialogTitle>
                    <DialogDescription className="text-base text-muted-foreground">
                        Help others discover your governance participation
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    <RadioGroup value={delegateType || ""} onValueChange={(value: string) => setDelegateType(value as DelegateType)}>
                        <div className="space-y-3">
                            {options.map((option) => {
                                const Icon = option.icon;
                                return (
                                    <div key={option.value} className="space-y-3">
                                        <Label 
                                            htmlFor={option.value} 
                                            className={cn(
                                                "flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer",
                                                delegateType === option.value && "border-primary bg-primary/10 ring-1 ring-primary/20"
                                            )}
                                        >
                                            <RadioGroupItem value={option.value} id={option.value} />
                                            <Icon className={cn(
                                                "h-4 w-4",
                                                delegateType === option.value ? "text-primary" :
                                                option.value === "none" ? "text-muted-foreground" : "text-muted-foreground"
                                            )} />
                                            <div className="flex-1">
                                                <div className={cn(
                                                    "font-medium",
                                                    delegateType === option.value && "text-primary font-semibold"
                                                )}>
                                                    {option.label}
                                                </div>
                                                <p className={cn(
                                                    "text-sm mt-0.5",
                                                    delegateType === option.value ? "text-primary/70" : "text-muted-foreground"
                                                )}>
                                                    {option.description}
                                                </p>
                                            </div>
                                        </Label>

                                        {delegateType === option.value && option.value !== "none" && (
                                            <div className="ml-10 space-y-2">
                                                <Label className="text-sm font-medium">
                                                    {option.label} URL
                                                </Label>
                                                <div className="space-y-1">
                                                    <Input
                                                        value={
                                                            option.value === "agora" ? agoraLink :
                                                            option.value === "scroll" ? scrollDelegateLink :
                                                            delegationUrl
                                                        }
                                                        onChange={(e) => {
                                                            if (option.value === "agora") setAgoraLink(e.target.value);
                                                            else if (option.value === "scroll") setScrollDelegateLink(e.target.value);
                                                            else setDelegationUrl(e.target.value);
                                                        }}
                                                        placeholder={option.placeholder}
                                                        type="url"
                                                        className={cn(
                                                            "text-sm",
                                                            getCurrentUrl() && !isCurrentUrlValid() && "border-destructive focus:border-destructive"
                                                        )}
                                                        required
                                                    />
                                                    {getCurrentUrl() && !isCurrentUrlValid() && (
                                                        <p className="text-xs text-destructive">
                                                            Please enter a valid URL (e.g., https://example.com)
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </RadioGroup>
                </div>

                <div className="flex justify-between pt-6 border-t">
                    <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground">
                        Skip for now
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={
                            !delegateType ||
                            isSubmitting ||
                            !isCurrentUrlValid()
                        }
                        className="px-6"
                    >
                        {isSubmitting ? 
                            ((delegateType as string) === "none" ? "Saving..." : "Connecting...") : 
                            ((delegateType as string) === "none" ? "Save" : "Connect")
                        }
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}