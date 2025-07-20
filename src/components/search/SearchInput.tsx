import { ChangeEvent, FC, useRef } from "react";
import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";

interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    onEnter?: () => void;
}

export const SearchInput: FC<SearchInputProps> = ({
    value,
    onChange,
    placeholder = "Search...",
    onEnter,
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const safeValue = value || '';

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && onEnter) {
            onEnter();
        }
    };

    return (
        <div className="relative w-full bg-muted/20 rounded-lg border border-border/30 p-1.5 sm:p-2">
            <div className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-primary">
                <SearchIcon className="w-4 h-4" />
            </div>
            <Input
                ref={inputRef}
                type="text"
                placeholder={placeholder}
                value={safeValue}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                className="pl-8 sm:pl-8 pr-2 py-1 sm:py-2 w-full border-none focus:ring-0 bg-transparent text-sm sm:text-base"
                autoFocus={true}
                onBlur={(e) => {
                    if (e.currentTarget.contains(e.relatedTarget as Node)) {
                        inputRef.current?.focus();
                    }
                }}
            />
        </div>
    );
}; 