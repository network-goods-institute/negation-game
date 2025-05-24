import React from 'react';
import { RationaleMetadataEditor } from '../forms/RationaleMetadataEditor';
import { RationaleSelectionDialog } from '../dialogs/RationaleSelectionDialog';
import { DiscourseConnectDialog } from '../dialogs/DiscourseConnectDialog';
import { DiscourseMessagesDialog } from '../dialogs/DiscourseMessagesDialog';
import { DiscourseConsentDialog } from '../dialogs/DiscourseConsentDialog';
import { ChatSettingsDialog } from '../dialogs/ChatSettingsDialog';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AuthenticatedActionButton } from '@/components/editor/AuthenticatedActionButton';
import { EditMessageDialog } from '../dialogs/EditMessageDialog';
import type { SavedChat } from '@/types/chat';

export interface AIAssistantDialogsProps {
    currentSpace: string | null;
    showDescEditor: boolean;
    setShowDescEditor: (open: boolean) => void;
    metadataEditorProps: Parameters<typeof RationaleMetadataEditor>[0];
    selectionDialogProps: Parameters<typeof RationaleSelectionDialog>[0];
    discourseConnectDialogProps: Parameters<typeof DiscourseConnectDialog>[0];
    discourseMessagesDialogProps: Parameters<typeof DiscourseMessagesDialog>[0];
    discourseConsentDialogProps: Parameters<typeof DiscourseConsentDialog>[0];
    chatSettingsDialogProps: Parameters<typeof ChatSettingsDialog>[0];
    deleteDialogProps: {
        chatToDelete: string | null;
        setChatToDelete: (id: string | null) => void;
        savedChats: SavedChat[];
        deleteChat: (id: string) => void;
    };
    renameDialogProps: {
        chatToRename: string | null;
        setChatToRename: (id: string | null) => void;
        newChatTitle: string;
        setNewChatTitle: (title: string) => void;
        renameChat: (id: string, title: string) => void;
    };
    deleteAllDialogProps: {
        showDeleteAllConfirmation: boolean;
        setShowDeleteAllConfirmation: (open: boolean) => void;
        count: number;
        currentSpace: string | null;
        deleteAllChats: () => void;
    };
    editMessageDialogProps: Parameters<typeof EditMessageDialog>[0];
    mode: 'chat' | 'create_rationale';
}

export function AIAssistantDialogs({
    currentSpace,
    showDescEditor,
    metadataEditorProps,
    selectionDialogProps,
    discourseConnectDialogProps,
    discourseMessagesDialogProps,
    discourseConsentDialogProps,
    chatSettingsDialogProps,
    deleteDialogProps,
    renameDialogProps,
    deleteAllDialogProps,
    editMessageDialogProps,
    mode,
}: AIAssistantDialogsProps) {
    return (
        <>
            {mode === 'create_rationale' && showDescEditor && <RationaleMetadataEditor {...metadataEditorProps} />}
            <RationaleSelectionDialog {...selectionDialogProps} />
            {currentSpace !== null && currentSpace !== 'global' && (
                <>
                    <DiscourseConnectDialog {...discourseConnectDialogProps} />
                    <DiscourseMessagesDialog {...discourseMessagesDialogProps} />
                    <DiscourseConsentDialog {...discourseConsentDialogProps} />
                </>
            )}
            <ChatSettingsDialog {...chatSettingsDialogProps} />
            <AlertDialog
                open={!!deleteDialogProps.chatToDelete}
                onOpenChange={(open) => !open && deleteDialogProps.setChatToDelete(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="break-words">Delete Chat</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this chat ({deleteDialogProps.savedChats.find(c => c.id === deleteDialogProps.chatToDelete)?.title || ''})?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AuthenticatedActionButton
                            onClick={() => {
                                const id = deleteDialogProps.chatToDelete;
                                if (id) {
                                    deleteDialogProps.deleteChat(id);
                                    deleteDialogProps.setChatToDelete(null);
                                }
                            }}
                        >
                            Delete
                        </AuthenticatedActionButton>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <Dialog
                open={renameDialogProps.chatToRename !== null}
                onOpenChange={(open) => !open && renameDialogProps.setChatToRename(null)}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Rename Chat</DialogTitle>
                    </DialogHeader>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (renameDialogProps.chatToRename) {
                                renameDialogProps.renameChat(renameDialogProps.chatToRename, renameDialogProps.newChatTitle);
                            }
                        }}
                    >
                        <div className="grid gap-4 py-4">
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="name" className="text-sm">Chat Name</label>
                                <input
                                    id="name"
                                    value={renameDialogProps.newChatTitle}
                                    onChange={(e) => renameDialogProps.setNewChatTitle(e.target.value)}
                                    placeholder="Enter new chat name"
                                    autoComplete="off"
                                    className="input"
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-end space-x-2 pt-2">
                            <button type="button" onClick={() => renameDialogProps.setChatToRename(null)} className="btn btn-outline">Cancel</button>
                            <AuthenticatedActionButton type="submit" disabled={!renameDialogProps.newChatTitle.trim()}>Save</AuthenticatedActionButton>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
            <AlertDialog
                open={deleteAllDialogProps.showDeleteAllConfirmation}
                onOpenChange={deleteAllDialogProps.setShowDeleteAllConfirmation}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="break-words">Delete All Chats?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete all {deleteAllDialogProps.count} chats in &apos;{deleteAllDialogProps.currentSpace}&apos;?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AuthenticatedActionButton onClick={deleteAllDialogProps.deleteAllChats}>Delete All</AuthenticatedActionButton>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <EditMessageDialog {...editMessageDialogProps} />
        </>
    );
} 