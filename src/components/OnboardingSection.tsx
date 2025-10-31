'use client';

import { useOptionalOnboarding } from "@/components/contexts/OnboardingContext";
import { useKnowledgeBase } from "@/components/contexts/KnowledgeBaseContext";
import { useWriteup } from "@/components/contexts/WriteupContext";
import { Button } from "@/components/ui/button";
import { Library, FileText, Keyboard, ArrowRight } from "lucide-react";
import { useState } from "react";
import { KeybindsDialog } from "@/components/dialogs/KeybindsDialog";

export function OnboardingSection() {
    const onboarding = useOptionalOnboarding();
    const { openDialog: openKbDialog } = useKnowledgeBase();
    const { openDialog: openWriteupDialog } = useWriteup();
    const [showKeybinds, setShowKeybinds] = useState(false);

    return (
        <>
            <KeybindsDialog open={showKeybinds} onOpenChange={setShowKeybinds} />
            <section className="py-24 bg-slate-50 dark:bg-slate-800/25">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="max-w-3xl mx-auto text-center mb-12">
                        <h2 className="text-3xl font-bold mb-4 dark:text-white">Get Started</h2>
                        <p className="text-lg text-muted-foreground dark:text-slate-400 mb-8">
                            New to the Negation Game? Explore our resources to get up to speed quickly.
                        </p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                            <button
                                className="flex flex-col items-center p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:shadow-lg transition-all duration-200 hover:border-primary/20"
                                onClick={() => openKbDialog(false)}
                            >
                                <Library className="h-8 w-8 mb-3 text-primary" />
                                <span className="font-semibold text-lg mb-2 dark:text-white">Knowledge Base</span>
                                <span className="text-sm text-muted-foreground dark:text-slate-400 text-center">
                                    Explore topics and concepts within the game
                                </span>
                            </button>
                            
                            <button
                                className="flex flex-col items-center p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:shadow-lg transition-all duration-200 hover:border-primary/20"
                                onClick={() => openWriteupDialog(false)}
                            >
                                <FileText className="h-8 w-8 mb-3 text-primary" />
                                <span className="font-semibold text-lg mb-2 dark:text-white">Full Write-up</span>
                                <span className="text-sm text-muted-foreground dark:text-slate-400 text-center">
                                    The complete introduction to the Negation Game
                                </span>
                            </button>
                            
                            <button
                                className="flex flex-col items-center p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:shadow-lg transition-all duration-200 hover:border-primary/20"
                                onClick={() => setShowKeybinds(true)}
                            >
                                <Keyboard className="h-8 w-8 mb-3 text-primary" />
                                <span className="font-semibold text-lg mb-2 dark:text-white">Keybinds</span>
                                <span className="text-sm text-muted-foreground dark:text-slate-400 text-center">
                                    Keyboard shortcuts for power users
                                </span>
                            </button>
                        </div>
                        
                        {onboarding && (
                            <Button 
                                size="lg" 
                                variant="outline" 
                                className="font-medium gap-2 text-base mb-8"
                                onClick={() => onboarding.showVideo()}
                            >
                                Watch Video Tutorial
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                    
                    <div className="max-w-3xl mx-auto text-center">
                        <h3 className="text-2xl font-bold mb-4 dark:text-white">Custom Community Spaces</h3>
                        <p className="text-lg text-muted-foreground dark:text-slate-400 mb-8">
                            Launch a dedicated Negation Game environment tailored for your organization!
                        </p>
                        <Button size="lg" className="font-medium gap-2 text-base" asChild>
                            <a href="https://t.me/+a0y-MpvjAchkM2Qx" target="_blank" rel="noopener noreferrer">
                                Contact Sales
                                <ArrowRight className="w-4 h-4" />
                            </a>
                        </Button>
                    </div>
                </div>
            </section>
        </>
    );
} 