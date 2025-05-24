import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AuthenticatedActionButton } from "@/components/editor/AuthenticatedActionButton";

interface DiscourseConsentDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    isLoading: boolean;
}

export function DiscourseConsentDialog({ isOpen, onOpenChange, onConfirm, isLoading }: DiscourseConsentDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Feature Improvement Consent</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <p className="text-sm text-muted-foreground mb-4">
                        To help improve and use our features, we&apos;d like to use your public forum messages. This data will be used to:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground mb-6">
                        <li>Enhance the overall user experience</li>
                        <li>Facilitate the ChatBot feature</li>
                        <li>Enhance our AI suggestions and improvements</li>
                        <li>And more!</li>
                    </ul>
                    <p className="text-sm text-muted-foreground">
                        You can change this setting anytime in your profile settings.
                    </p>
                </div>
                <div className="flex justify-end gap-3">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <AuthenticatedActionButton
                        onClick={onConfirm}
                        disabled={isLoading}
                        rightLoading={isLoading}
                    >
                        {isLoading ? 'Updating...' : 'Allow and Connect'}
                    </AuthenticatedActionButton>
                </div>
            </DialogContent>
        </Dialog>
    );
} 