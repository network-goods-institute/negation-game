"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSearchUsers } from "@/queries/users/useSearchUsers";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SearchIcon, UserIcon, LoaderIcon, MessageSquareIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function UserSearch({ className }: { className?: string }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();
    const containerRef = useRef<HTMLDivElement>(null);

    const { data: users = [], isLoading, error } = useSearchUsers(searchQuery);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleUserSelect = (username: string) => {
        router.push(`/messages/${encodeURIComponent(username)}`);
        setSearchQuery("");
        setIsOpen(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        setIsOpen(true);
    };

    const shouldShowDropdown = searchQuery.trim().length > 0 && isOpen;

    return (
        <div className={cn("relative max-w-2xl mx-auto", className)} ref={containerRef}>
            <div className="relative">
                <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Search users to start a conversation..."
                    value={searchQuery}
                    onChange={handleInputChange}
                    onFocus={() => setIsOpen(true)}
                    className="pl-12 pr-12 h-12 text-base border-2 focus:border-primary/50 transition-colors"
                />
                {isLoading && (
                    <LoaderIcon className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
            </div>

            {shouldShowDropdown && (
                <div className="absolute top-full z-50 mt-2 w-full rounded-xl border-2 bg-popover shadow-xl">
                    {isLoading ? (
                        <div className="flex items-center gap-3 p-4 text-muted-foreground">
                            <LoaderIcon className="h-5 w-5 animate-spin" />
                            <span>Searching users...</span>
                        </div>
                    ) : error ? (
                        <div className="p-4 text-red-500 font-medium">
                            Error searching users. Please try again.
                        </div>
                    ) : users.length > 0 ? (
                        <div className="max-h-80 overflow-y-auto">
                            {users.map((user, index) => (
                                <button
                                    key={user.id}
                                    onClick={() => handleUserSelect(user.username)}
                                    className={cn(
                                        "flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-accent focus:bg-accent focus:outline-none",
                                        index !== users.length - 1 && "border-b border-border/50"
                                    )}
                                >
                                    <Avatar className="h-12 w-12 border-2 border-border/20">
                                        <AvatarImage src={undefined} />
                                        <AvatarFallback className="bg-primary/10 text-primary">
                                            {user.username[0]?.toUpperCase() || <UserIcon className="h-5 w-5" />}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-lg truncate">
                                            {user.username}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            Tap to start messaging
                                        </div>
                                    </div>
                                    <MessageSquareIcon className="h-5 w-5 text-muted-foreground" />
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="p-6 text-center space-y-2">
                            <UserIcon className="h-12 w-12 mx-auto text-muted-foreground/50" />
                            <p className="text-muted-foreground font-medium">No users found</p>
                            <p className="text-sm text-muted-foreground/60">
                                Try searching for a different username
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
} 