"use client";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertUserSchema, InsertUser } from "@/db/tables/usersTable";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect, useRef } from "react";
import { useUsernameSignup } from "@/mutations/user/useUsernameSignup";
import { isUsernameAvailable } from "@/actions/users/isUsernameAvailable";
import { ZodIssueCode } from "zod";
import { USERNAME_MAX_LENGTH } from "@/constants/config";

export interface UsernameSignupDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function UsernameSignupDialog({ open, onOpenChange }: UsernameSignupDialogProps) {
    const { mutate: signup, isPending, isSuccess } = useUsernameSignup();
    const validationInProgress = useRef<string | null>(null);

    const form = useForm<Pick<InsertUser, "username">>({
        resolver: zodResolver(
            insertUserSchema
                .pick({ username: true })
                .superRefine(async ({ username }, ctx) => {
                    const formatValidation = insertUserSchema.pick({ username: true }).safeParse({ username });
                    if (!formatValidation.success) return;
                    if (validationInProgress.current === username) return;
                    validationInProgress.current = username;
                    try {
                        const available = await isUsernameAvailable(username);
                        if (!available) {
                            ctx.addIssue({ path: ["username"], code: ZodIssueCode.custom, message: "username taken. choose another one" });
                        }
                    } catch {
                        ctx.addIssue({ path: ["username"], code: ZodIssueCode.custom, message: "error checking username availability" });
                    } finally {
                        validationInProgress.current = null;
                    }
                }),
            { async: true }
        ),
        defaultValues: { username: "" },
        mode: "onBlur",
    });

    useEffect(() => {
        if (isSuccess) {
            form.reset();
            onOpenChange(false);
        }
    }, [isSuccess, form, onOpenChange]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex flex-col items-center justify-center overflow-auto max-h-[90vh] rounded-none sm:rounded-md gap-0 bg-background p-4 sm:p-10 shadow-sm sm:max-w-xl w-full">
                <DialogTitle className="self-center mb-2xl">{`Let's get you started`}</DialogTitle>
                <DialogDescription hidden>{`Let's set up your account`}</DialogDescription>

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(({ username }) =>
                            signup(
                                { username },
                                {
                                    onSuccess: () => {
                                        form.reset();
                                        onOpenChange(false);
                                    },
                                    onError: (error: any) => {
                                        const message = error?.message || "Unknown error";
                                        if (
                                            message === "USERNAME_TAKEN" ||
                                            error?.code === "USERNAME_TAKEN" ||
                                            message.toLowerCase().includes("username")
                                        ) {
                                            form.setError("username", { type: "server", message: "username taken. choose another one" });
                                        } else {
                                            form.setError("username", { type: "server", message: "could not create account — try again" });
                                        }
                                    },
                                }
                            )
                        )}
                        className="space-y-lg"
                    >
                        <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Username</FormLabel>
                                    <FormControl>
                                        <Input maxLength={USERNAME_MAX_LENGTH} className="max-w-64" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    <ul className="list-inside text-xs text-muted-foreground">
                                        <li className="list-disc">can only contain letters, numbers and underscores</li>
                                        <li className="list-disc">cannot start or end with an underscore</li>
                                    </ul>
                                </FormItem>
                            )}
                        />
                        <div className="flex flex-col md:flex-row-reverse md:gap-md pt-lg">
                            <Button type="submit" className="w-full md:w-32" disabled={isPending || isSuccess} rightLoading={isPending}>
                                Submit
                            </Button>
                            <Button type="button" variant="ghost" className="w-full md:w-fit" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}


