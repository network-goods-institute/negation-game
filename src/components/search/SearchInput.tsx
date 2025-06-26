import { ChangeEvent, FC, useRef } from "react";
import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";

interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export const SearchInput: FC<SearchInputProps> = ({
    value,
    onChange,
    placeholder = "Search...",
}) => {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
    };

    return (
        <div className="relative w-full bg-muted/20 rounded-lg border border-border/30 p-2">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-primary">
                <SearchIcon className="w-4 h-4" />
            </div>
            <Input
                ref={inputRef}
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={handleChange}
                className="pl-8 pr-2 py-2 w-full border-none focus:ring-0 bg-transparent"
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