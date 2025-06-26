"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";

interface GoToSpaceButtonProps {
    href: string;
}

export function GoToSpaceButton({ href }: GoToSpaceButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleClick = () => {
        setIsLoading(true);
        router.push(href);

        setTimeout(() => {
            setIsLoading(false);
        }, 3000);
    };

    // Reset loading state when href changes (new space)
    useEffect(() => {
        setIsLoading(false);
    }, [href]);

    return (
        <Button
            size="sm"
            className="mt-4 font-medium gap-2 text-base"
            onClick={handleClick}
            disabled={isLoading}
        >
            {isLoading ? (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                </>
            ) : (
                <>
                    Go to Space
                    <ArrowRight className="w-4 h-4" />
                </>
            )}
        </Button>
    );
} 