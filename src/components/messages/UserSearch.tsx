"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSearchUsers } from "@/queries/users/useSearchUsers";
import { Input } from "@/components/ui/input";
import { SearchIcon, UserIcon, LoaderIcon, MessageSquareIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface UserSearchProps {
    spaceId: string;
    className?: string;
}

export function UserSearch({ spaceId, className }: UserSearchProps) {
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
        router.push(`/s/${encodeURIComponent(spaceId)}/messages/${encodeURIComponent(username)}`);
        setSearchQuery("");
        setIsOpen(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        setIsOpen(true);
    };

    const shouldShowDropdown = searchQuery.trim().length > 0 && isOpen;

    return (
        <div className={cn("relative w-full", className)} ref={containerRef}>
            <div className="relative">
                <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={handleInputChange}
                    onFocus={() => setIsOpen(true)}
                    className="pl-12 pr-12 h-10 text-sm rounded-lg"
                />
                {isLoading && (
                    <LoaderIcon className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
            </div>

            {shouldShowDropdown && (
                <div className="absolute top-full z-50 mt-2 w-full rounded-lg border border-border bg-popover shadow-xl">
                    {isLoading ? (
                        <div className="flex items-center gap-4 p-4 text-muted-foreground">
                            <LoaderIcon className="h-5 w-5 animate-spin text-primary" />
                            <span className="font-medium">Searching users...</span>
                        </div>
                    ) : error ? (
                        <div className="p-4 text-destructive font-medium">
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
                                        index === 0 && "rounded-t-lg",
                                        index === users.length - 1 && "rounded-b-lg",
                                        index !== users.length - 1 && "border-b border-border"
                                    )}
                                >
                                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                                        {user.username[0]?.toUpperCase() || 'U'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-popover-foreground truncate">
                                            {user.username}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            Start a conversation
                                        </div>
                                    </div>
                                    <MessageSquareIcon className="h-5 w-5 text-muted-foreground" />
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center space-y-3">
                            <UserIcon className="h-12 w-12 mx-auto text-muted-foreground/40" />
                            <p className="text-popover-foreground font-semibold">No users found</p>
                            <p className="text-sm text-muted-foreground">
                                Try searching for a different username
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
} 