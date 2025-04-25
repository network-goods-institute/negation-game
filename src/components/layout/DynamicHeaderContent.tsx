'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchSpace } from '@/actions/fetchSpace';

export function DynamicHeaderContent() {
    const pathname = usePathname();
    const isSpacePage = pathname.startsWith('/s/');
    let spaceId: string | null = null;

    if (isSpacePage) {
        const parts = pathname.split('/');
        if (parts.length > 2 && parts[2]) {
            try {
                spaceId = decodeURIComponent(parts[2]);
            } catch (e) {
                console.error('Failed to decode space ID:', parts[2], e);
                spaceId = parts[2];
            }
        }
    }
    const { data: spaceData, isLoading: isLoadingSpaceData } = useQuery({
        queryKey: ['space', spaceId],
        queryFn: () => fetchSpace(spaceId!),
        enabled: isSpacePage && !!spaceId,
        staleTime: 5 * 60 * 1000,
    });

    const renderIcon = () => {
        const showPlaceholder = isLoadingSpaceData || !spaceData || !spaceData.icon;
        const initial = spaceId ? spaceId.charAt(0).toUpperCase() : '?';

        return (
            <div className="relative w-3 h-3 sm:w-4 sm:h-4 border border-background rounded-full overflow-hidden mr-0.5 flex items-center justify-center bg-muted">
                {showPlaceholder ? (
                    <span className="text-[10px] font-bold text-muted-foreground">{initial}</span>
                ) : (
                    <img
                        src={spaceData.icon!}
                        alt={`s/${spaceId} icon`}
                        className="w-full h-full object-cover"
                    />
                )}
            </div>
        );
    };

    return (
        <>
            {isSpacePage && spaceId ? (
                <Link href={`/s/${spaceId}`} className="flex items-center min-w-0 overflow-hidden">
                    <span className="text-[11px] sm:text-base font-bold whitespace-nowrap">Negation Game</span> {/* Mobile: 11px, Small+: base */}
                    <span className="text-muted-foreground text-xs mx-0.5">×</span>
                    <div className="flex items-center">
                        {renderIcon()}
                        <span className="text-[11px] sm:text-base font-bold whitespace-nowrap">{`s/${spaceId}`}</span> {/* Mobile: 11px, Small+: base */}
                    </div>
                </Link>
            ) : (
                <Link href="/" className="text-[11px] sm:text-base font-bold whitespace-nowrap"> {/* Mobile: 11px, Small+: base */}
                    Negation Game
                </Link>
            )}
        </>
    );
} 