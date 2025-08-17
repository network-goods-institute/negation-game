"use client";
import { Suspense } from "react";
import { LoaderCircleIcon } from "lucide-react";
import { SpaceChildHeader } from "@/components/layouts/headers/SpaceChildHeader";
import { getBackButtonHandler } from "@/lib/negation-game/backButtonUtils";
import { useRouter } from "next/navigation";
import { useSetAtom } from "jotai";
import { initialSpaceTabAtom } from "@/atoms/navigationAtom";
import { SettingsContainer } from "@/components/settings/SettingsContainer";

export default function SettingsPage() {
    const router = useRouter();
    const setInitialTab = useSetAtom(initialSpaceTabAtom);
    const onBack = getBackButtonHandler(router, setInitialTab);
    return (
        <div className="min-h-screen bg-background">
            <SpaceChildHeader title="Settings" onBack={onBack} />
            <div className="container mx-auto max-w-4xl pt-6 pb-8">
                <Suspense
                    fallback={
                        <div className="flex items-center justify-center p-16">
                            <div className="flex flex-col items-center gap-3">
                                <LoaderCircleIcon className="animate-spin size-8 text-primary" />
                                <p className="text-muted-foreground">Loading settings...</p>
                            </div>
                        </div>
                    }
                >
                    <SettingsContainer />
                </Suspense>
            </div>
        </div>
    );
}