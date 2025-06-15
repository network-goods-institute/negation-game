import { Suspense } from "react";
import { LoaderCircleIcon } from "lucide-react";
import { SettingsContainer } from "@/components/settings/SettingsContainer";

export default function SettingsPage() {
    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto max-w-4xl py-8">
                <div className="mb-8 space-y-3">
                    <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                    <p className="text-muted-foreground text-lg">
                        Manage your account preferences and privacy settings
                    </p>
                </div>

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