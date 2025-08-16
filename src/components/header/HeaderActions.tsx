'use client';

import { ConnectButton } from "./ConnectButton";
import { ModeToggle } from "@/components/ui/ModeToggle";
import { GitHubButton } from "@/components/icons/GitHubButton";
import { Dynamic } from "@/components/utils/Dynamic";
import { Button } from "@/components/ui/button";
import { InfoIcon, MoreHorizontal, Github, FileText, Library, Keyboard, PlayCircle, BrainCircuit, Moon, Sun } from "lucide-react";
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
import { VideoIntroDialog } from "@/components/dialogs/VideoIntroDialog";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useBasePath } from "@/hooks/utils/useBasePath";
import { Loader } from "@/components/ui/loader";
import { SpaceSearchInput } from "@/components/search/SpaceSearchInput";
import { useSpaceSearch } from "@/components/contexts/SpaceSearchContext";
import { createPortal } from "react-dom";
import { useTheme } from "next-themes";

export const HeaderActions = () => {
    const { openDialog: openOnboardingDialog } = useOnboarding();
    const { openDialog: openKbDialog } = useKnowledgeBase();
    const { openDialog: openWriteupDialog } = useWriteup();
    const [showKeybinds, setShowKeybinds] = useState(false);
    const [showVideo, setShowVideo] = useState(false);

    const [isAiLoading, setIsAiLoading] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const basePath = useBasePath();
    const [searchContainer, setSearchContainer] = useState<HTMLElement | null>(null);
    const { theme, setTheme } = useTheme();
    const { mobileFiltersOpen } = useSpaceSearch();

    const isSpacePage = pathname.match(/^\/s\/[^\/]+$/) !== null;

    useEffect(() => {
        // Get the search container element for portal rendering
        const container = document.getElementById('header-search-container');
        setSearchContainer(container);
    }, []);

    const handleAiClick = () => {
        if (pathname === `${basePath}/chat`) return;
        setIsAiLoading(true);
        router.push(`${basePath}/chat`);
    };

    return (
        <>
            <VideoIntroDialog open={showVideo} onOpenChange={setShowVideo} showBack={false} />
            <KeybindsDialog open={showKeybinds} onOpenChange={setShowKeybinds} />

            {/* Render search bar in the middle container via portal */}
            {isSpacePage && searchContainer && !mobileFiltersOpen && createPortal(
                <div className="hidden lg:block w-full max-w-xl">
                    <SpaceSearchInput />
                </div>,
                searchContainer
            )}

            <div className="flex gap-1 sm:gap-2 flex-shrink-0 items-center">
                {/* Enhanced AI button for mobile only */}
                <div className="hidden sm:block xl:hidden">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleAiClick}
                                disabled={pathname === `${basePath}/chat`}
                            >
                                {isAiLoading ? (
                                    <Loader className="h-4 w-4" />
                                ) : (
                                    <BrainCircuit className="h-4 w-4" />
                                )}
                                <span className="sr-only">AI Assistant</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>AI Assistant</p>
                        </TooltipContent>
                    </Tooltip>
                </div>

                <div className="hidden sm:block flex-shrink-0">
                    <Dynamic>
                        <ModeToggle />
                    </Dynamic>
                </div>

                <ConnectButton />

                {/* Enhanced desktop dropdown with responsive md: breakpoints */}
                <div className="hidden md:flex items-center gap-1 md:gap-2 flex-shrink-0">
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
                            {/* AI Assistant in dropdown as fallback */}
                            <DropdownMenuItem onClick={handleAiClick} disabled={pathname === `${basePath}/chat`}>
                                {isAiLoading ? (
                                    <Loader className="mr-2 h-4 w-4" />
                                ) : (
                                    <BrainCircuit className="mr-2 h-4 w-4" />
                                )}
                                <span>AI Assistant</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                                {theme === 'dark' ? (
                                    <Sun className="mr-2 h-4 w-4" />
                                ) : (
                                    <Moon className="mr-2 h-4 w-4" />
                                )}
                                <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

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
                            <DropdownMenuItem onClick={() => setShowVideo(true)}>
                                <PlayCircle className="mr-2 h-4 w-4" />
                                <span>Video Intro</span>
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

                {/* Enhanced mobile dropdown with all features */}
                <div className="flex md:hidden flex-shrink-0">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">More actions</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {/* AI Assistant for mobile */}
                            <DropdownMenuItem onClick={handleAiClick} disabled={pathname === `${basePath}/chat`}>
                                {isAiLoading ? (
                                    <Loader className="mr-2 h-4 w-4" />
                                ) : (
                                    <BrainCircuit className="mr-2 h-4 w-4" />
                                )}
                                <span>AI Assistant</span>
                            </DropdownMenuItem>

                            {/* Enhanced inline theme toggle for mobile */}
                            <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                                {theme === 'dark' ? (
                                    <Sun className="mr-2 h-4 w-4" />
                                ) : (
                                    <Moon className="mr-2 h-4 w-4" />
                                )}
                                <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {/* All help features available on mobile */}
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
                            <DropdownMenuItem onClick={() => setShowVideo(true)}>
                                <PlayCircle className="mr-2 h-4 w-4" />
                                <span>Video Intro</span>
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