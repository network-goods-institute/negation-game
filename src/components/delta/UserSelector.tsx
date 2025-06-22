"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { fetchAllUsers } from "@/actions/users/fetchAllUsers";
import { SearchIcon, LoaderIcon, UserIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Props = {
    onSelect: (user: { id: string; username: string }) => void;
    className?: string;
};

export function UserSelector({ onSelect, className }: Props) {
    const [searchQuery, setSearchQuery] = useState("");
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const { data: allUsers = [], isLoading, error } = useQuery({
        queryKey: ["all-users"],
        queryFn: fetchAllUsers,
        staleTime: 5 * 60 * 1000,
    });

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filtered = searchQuery.trim()
        ? allUsers.filter((u) => u.username.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 50)
        : allUsers.slice(0, 50);

    return (
        <div ref={containerRef} className={cn("relative", className)}>
            <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Filter user..."
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    className="pl-10"
                />
                {isLoading && <LoaderIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            {open && (
                <div className="absolute top-full mt-2 w-full z-50 rounded-md border bg-popover shadow-lg max-h-72 overflow-y-auto">
                    {error ? (
                        <div className="p-4 text-red-500">Error searching users</div>
                    ) : filtered.length === 0 ? (
                        <div className="p-4 text-muted-foreground">No users found</div>
                    ) : (
                        filtered.map((u) => (
                            <button
                                key={u.id}
                                onClick={() => {
                                    onSelect(u);
                                    setSearchQuery("");
                                    setOpen(false);
                                }}
                                className="flex w-full items-center gap-3 px-4 py-2 hover:bg-accent text-left"
                            >
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={undefined} />
                                    <AvatarFallback>{u.username[0]?.toUpperCase() || <UserIcon />}</AvatarFallback>
                                </Avatar>
                                <span>{u.username}</span>
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
} 