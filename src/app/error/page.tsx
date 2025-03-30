import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

export default function ErrorPage({
    searchParams,
}: {
    searchParams: { message: string };
}) {
    return (
        <div className="container flex h-screen items-center justify-center">
            <Card className="w-full max-w-md p-6">
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="rounded-full bg-destructive/10 p-3">
                        <AlertCircle className="h-8 w-8 text-destructive" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Something went wrong
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {searchParams.message || "An unexpected error occurred"}
                        </p>
                    </div>
                    <Button asChild>
                        <Link href="/">Return Home</Link>
                    </Button>
                </div>
            </Card>
        </div>
    );
} 