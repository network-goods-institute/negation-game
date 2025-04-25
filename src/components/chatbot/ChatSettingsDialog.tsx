import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ChatSettings } from "@/types/chat";


interface ChatSettingsDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    settings: ChatSettings;
    setSettings: (updater: (prev: ChatSettings) => ChatSettings) => void;
    isNonGlobalSpace: boolean;
    isAuthenticated: boolean;
}

export function ChatSettingsDialog({
    isOpen,
    onOpenChange,
    settings,
    setSettings,
    isNonGlobalSpace,
    isAuthenticated
}: ChatSettingsDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Chat Settings</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    {/* Disable entire section if not authenticated */}
                    <div className={`flex items-center justify-between ${!isNonGlobalSpace || !isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <div className="space-y-0.5">
                            <Label htmlFor="discourse-toggle" className={`${!isNonGlobalSpace || !isAuthenticated ? 'cursor-not-allowed' : ''}`}>Include Discourse Messages</Label>
                            <p className="text-sm text-muted-foreground">
                                Send forum messages to the AI for context {!isNonGlobalSpace && '(Space Only)'}
                            </p>
                        </div>
                        <Switch
                            id="discourse-toggle"
                            checked={settings.includeDiscourseMessages}
                            onCheckedChange={(checked) =>
                                setSettings(prev => ({ ...prev, includeDiscourseMessages: checked }))
                            }
                            disabled={!isNonGlobalSpace || !isAuthenticated}
                            aria-label="Include Discourse Messages"
                        />
                    </div>
                    {/* Disable entire section if not authenticated */}
                    <div className={`flex items-center justify-between ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <div className="space-y-0.5">
                            <Label htmlFor="points-toggle" className={`${!isAuthenticated ? 'cursor-not-allowed' : ''}`}>Include Points</Label>
                            <p className="text-sm text-muted-foreground">
                                Send your points to the AI for context
                            </p>
                        </div>
                        <Switch
                            id="points-toggle"
                            checked={settings.includePoints}
                            onCheckedChange={(checked) =>
                                setSettings(prev => ({ ...prev, includePoints: checked }))
                            }
                            disabled={!isAuthenticated}
                            aria-label="Include Points"
                        />
                    </div>
                    {/* Disable entire section if not authenticated */}
                    <div className={`flex items-center justify-between ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <div className="space-y-0.5">
                            <Label htmlFor="endorsements-toggle" className={`${!isAuthenticated ? 'cursor-not-allowed' : ''}`}>Include Endorsements</Label>
                            <p className="text-sm text-muted-foreground">
                                Send your endorsed points to the AI for context
                            </p>
                        </div>
                        <Switch
                            id="endorsements-toggle"
                            checked={settings.includeEndorsements}
                            onCheckedChange={(checked) =>
                                setSettings(prev => ({ ...prev, includeEndorsements: checked }))
                            }
                            disabled={!isAuthenticated}
                            aria-label="Include Endorsements"
                        />
                    </div>
                    {/* Disable entire section if not authenticated */}
                    <div className={`flex items-center justify-between ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <div className="space-y-0.5">
                            <Label htmlFor="rationales-toggle" className={`${!isAuthenticated ? 'cursor-not-allowed' : ''}`}>Include Rationales</Label>
                            <p className="text-sm text-muted-foreground">
                                Send your rationales to the AI for context
                            </p>
                        </div>
                        <Switch
                            id="rationales-toggle"
                            checked={settings.includeRationales}
                            onCheckedChange={(checked) =>
                                setSettings(prev => ({ ...prev, includeRationales: checked }))
                            }
                            disabled={!isAuthenticated}
                            aria-label="Include Rationales"
                        />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
} 