import { FC, useRef, useState, useEffect } from "react";
import { SearchIcon, X } from "lucide-react";
import { useSpaceSearch } from "../contexts/SpaceSearchContext";
import { useSpace } from "@/queries/space/useSpace";
import Image from "next/image";

export const SpaceSearchInput: FC = () => {
    const { searchQuery, setSearchQuery } = useSpaceSearch();
    const { data: spaceInfo } = useSpace();
    const inputRef = useRef<HTMLInputElement>(null);
    const [imageError, setImageError] = useState(false);

    // Reset image error when space changes
    useEffect(() => {
        setImageError(false);
    }, [spaceInfo?.id]);

    return (
        <div className={`relative w-full h-10 rounded-md border border-input flex items-center overflow-hidden transition-all duration-200 focus-within:border-primary focus-within:shadow-sm ${searchQuery ? "bg-muted/80" : "bg-muted/20"
            } ${searchQuery ? "focus-within:bg-muted/90" : "focus-within:bg-muted/30"}`}>
            {/* Space icon and name */}
            {spaceInfo && (
                <div className="flex items-center gap-2 px-3 border-r border-border h-full bg-muted/10">
                    {spaceInfo.icon && !imageError ? (
                        <Image
                            src={spaceInfo.icon}
                            alt=""
                            width={20}
                            height={20}
                            className="rounded-full flex-shrink-0"
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-primary">
                                {spaceInfo.id.charAt(0).toUpperCase()}
                            </span>
                        </div>
                    )}
                    <span className="text-sm font-medium text-foreground/80 whitespace-nowrap">
                        s/{spaceInfo.id}
                    </span>
                </div>
            )}

            {/* Search icon */}
            <div className="px-3 text-muted-foreground">
                <SearchIcon className="w-4 h-4" />
            </div>

            {/* Input field */}
            <input
                ref={inputRef}
                type="text"
                placeholder="Search points, rationales, or authors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent px-2 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                onBlur={(e) => {
                    if (e.currentTarget.contains(e.relatedTarget as Node)) {
                        inputRef.current?.focus();
                    }
                }}
            />

            {/* Clear button */}
            {searchQuery && (
                <button
                    onClick={() => setSearchQuery("")}
                    className="px-3 text-muted-foreground hover:text-foreground transition-colors"
                    type="button"
                    aria-label="Clear search"
                >
                    <X className="w-4 h-4" />
                </button>
            )}
        </div>
    );
};