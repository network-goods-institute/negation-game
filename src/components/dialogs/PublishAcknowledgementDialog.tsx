"use client";

import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Sparkles } from "lucide-react";

interface PublishAcknowledgementDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const PublishAcknowledgementDialog: React.FC<
    PublishAcknowledgementDialogProps
> = ({ open, onOpenChange }) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 text-white border-none shadow-2xl rounded-lg overflow-hidden">
                <DialogHeader className="pt-8 text-center">
                    <div className="mx-auto mb-6 bg-white/20 rounded-full p-3 w-20 h-20 flex items-center justify-center">
                        <Sparkles className="w-12 h-12 text-yellow-300 animate-pulse" />
                    </div>
                    <DialogTitle className="text-3xl font-extrabold tracking-tight">
                        <div className="text-center">
                            Huzzah! It&apos;s live!
                        </div>
                    </DialogTitle>
                </DialogHeader>
                <div className="p-6 text-center space-y-4">
                    <p className="text-lg">
                        Your brilliant rationale has been published for all the world to see!
                    </p>
                    <div className="flex items-center justify-center gap-2 bg-white/10 p-3 rounded-md">
                        <CheckCircle className="w-5 h-5 text-lime-300" />
                        <p className="text-sm font-medium">
                            Remember, you can still edit and republish it anytime.
                        </p>
                    </div>
                </div>
                <DialogFooter className="sm:justify-center p-6 bg-black/10">
                    <Button
                        onClick={() => onOpenChange(false)}
                        className="bg-yellow-400 hover:bg-yellow-500 text-emerald-800 font-bold text-lg px-8 py-3 rounded-md transition-all duration-150 ease-in-out transform hover:scale-105"
                    >
                        Sweet!
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}; 