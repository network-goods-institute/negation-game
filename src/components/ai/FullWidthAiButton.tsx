"use client";

import { Button } from "@/components/ui/button";
import { BrainCircuit } from "lucide-react";
import { Loader } from "@/components/ui/loader";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useBasePath } from "@/hooks/utils/useBasePath";

export const FullWidthAiButton = () => {
    const [isAiLoading, setIsAiLoading] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const basePath = useBasePath();

    const handleAiClick = () => {
        if (pathname === `${basePath}/chat`) return;
        setIsAiLoading(true);
        router.push(`${basePath}/chat`);
    };

    return (
        <Button
            onClick={handleAiClick}
            disabled={pathname === `${basePath}/chat`}
            className="w-full flex items-center justify-center gap-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
            size="lg"
        >
            {isAiLoading ? (
                <Loader className="h-5 w-5 text-white" />
            ) : (
                <BrainCircuit className="h-5 w-5" />
            )}
            <span className="font-medium">AI Assistant</span>
        </Button>
    );
};