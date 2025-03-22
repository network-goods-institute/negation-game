"use client";

import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";

export function GitHubButton() {
    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={() => window.open("https://github.com/network-goods-institute/negation-game", "_blank", "noopener,noreferrer")}
            aria-label="GitHub Repository"
        >
            <Github className="h-[1.2rem] w-[1.2rem]" />
        </Button>
    );
} 