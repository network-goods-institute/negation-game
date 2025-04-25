'use client';

import { ConnectButton } from "@/components/ConnectButton";
import { ModeToggle } from "@/components/ui/ModeToggle";
import { GitHubButton } from "../icons/GitHubButton";
import { Dynamic } from "@/components/utils/Dynamic";
import { Button } from "@/components/ui/button";
import { InfoIcon, MoreHorizontal, Github } from "lucide-react";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const HeaderActions = () => {
    const { openDialog } = useOnboarding();

    return (
        <div className="flex gap-1 sm:gap-sm flex-shrink-0 items-center">
            <Dynamic>
                <ModeToggle />
            </Dynamic>
            <ConnectButton />

            <div className="hidden sm:flex items-center gap-1 sm:gap-sm">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={openDialog}>
                            <InfoIcon className="h-4 w-4" />
                            <span className="sr-only">Show Info</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Show Info / Help</p>
                    </TooltipContent>
                </Tooltip>
                <Dynamic>
                    <GitHubButton />
                </Dynamic>
            </div>

            <div className="flex sm:hidden">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">More actions</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={openDialog}>
                            <InfoIcon className="mr-2 h-4 w-4" />
                            <span>Info / Help</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <a href="https://github.com/network-goods-institute/negation-game" target="_blank" rel="noopener noreferrer">
                                <Github className="mr-2 h-4 w-4" />
                                <span>GitHub</span>
                            </a>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}; 