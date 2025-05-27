'use client';

import { ConnectButton } from "./ConnectButton";
import { ModeToggle } from "@/components/ui/ModeToggle";
import { GitHubButton } from "@/components/icons/GitHubButton";
import { Dynamic } from "@/components/utils/Dynamic";
import { Button } from "@/components/ui/button";
import { InfoIcon, MoreHorizontal, Github, FileText, Library, Keyboard } from "lucide-react";
import { useOnboarding } from "@/components/contexts/OnboardingContext";
import { useKnowledgeBase } from "@/components/contexts/KnowledgeBaseContext";
import { useWriteup } from "@/components/contexts/WriteupContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { KeybindsDialog } from "@/components/dialogs/KeybindsDialog";
import { useState } from "react";

export const HeaderActions = () => {
    const { openDialog: openOnboardingDialog } = useOnboarding();
    const { openDialog: openKbDialog } = useKnowledgeBase();
    const { openDialog: openWriteupDialog } = useWriteup();
    const [showKeybinds, setShowKeybinds] = useState(false);

    return (
        <>
            <KeybindsDialog open={showKeybinds} onOpenChange={setShowKeybinds} />
            <div className="flex gap-1 sm:gap-sm flex-shrink-0 items-center">
                <Dynamic>
                    <ModeToggle />
                </Dynamic>
                <ConnectButton />

                <div className="hidden sm:flex items-center gap-1 sm:gap-sm">
                    <DropdownMenu>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <InfoIcon className="h-4 w-4" />
                                        <span className="sr-only">Help & Information</span>
                                    </Button>
                                </DropdownMenuTrigger>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Help & Information</p>
                            </TooltipContent>
                        </Tooltip>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openOnboardingDialog()}>
                                <InfoIcon className="mr-2 h-4 w-4" />
                                <span>Onboarding</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openKbDialog()}>
                                <Library className="mr-2 h-4 w-4" />
                                <span>Knowledge Base</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openWriteupDialog()}>
                                <FileText className="mr-2 h-4 w-4" />
                                <span>Full Write-up</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setShowKeybinds(true)}>
                                <Keyboard className="mr-2 h-4 w-4" />
                                <span>Keybinds</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <a href="https://github.com/network-goods-institute/negation-game" target="_blank" rel="noopener noreferrer">
                                    <Github className="mr-2 h-4 w-4" />
                                    <span>GitHub</span>
                                </a>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
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
                            <DropdownMenuItem onClick={() => openOnboardingDialog()}>
                                <InfoIcon className="mr-2 h-4 w-4" />
                                <span>Onboarding</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openKbDialog()}>
                                <Library className="mr-2 h-4 w-4" />
                                <span>Knowledge Base</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openWriteupDialog()}>
                                <FileText className="mr-2 h-4 w-4" />
                                <span>Full Write-up</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setShowKeybinds(true)}>
                                <Keyboard className="mr-2 h-4 w-4" />
                                <span>Keybinds</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
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
        </>
    );
}; 