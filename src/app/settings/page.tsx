import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BellIcon, SettingsIcon } from "lucide-react";

export default function SettingsPage() {
    return (
        <div className="container max-w-2xl mx-auto p-6">
            <div className="flex items-center gap-3 mb-6">
                <SettingsIcon className="w-6 h-6" />
                <h1 className="text-2xl font-bold">Settings</h1>
            </div>

            <div className="grid gap-4">
                <Link href="/settings/notifications">
                    <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3">
                                <BellIcon className="w-5 h-5" />
                                Notifications
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">
                                Manage your notification preferences and digest settings
                            </p>
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    );
} 