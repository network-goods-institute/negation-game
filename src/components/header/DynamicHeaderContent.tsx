'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchSpace } from '@/actions/spaces/fetchSpace';
import { useState, useEffect } from 'react';
import { Loader } from '@/components/ui/loader';

export function DynamicHeaderContent() {
    const pathname = usePathname();
    const router = useRouter();
    const isSpacePage = pathname.startsWith('/s/');
    const [isNavigating, setIsNavigating] = useState(false);
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
    useEffect(() => {
        setIsNavigating(false);
    }, [pathname]);

    const renderIcon = () => {
        const showPlaceholder = isLoadingSpaceData || !spaceData || !spaceData.icon;
        const initial = spaceId ? spaceId.charAt(0).toUpperCase() : '?';

        return (
            <div className="relative w-3 h-3 md:w-4 md:h-4 border border-background rounded-full overflow-hidden mr-0.5 flex items-center justify-center bg-muted">
                {showPlaceholder ? (
                    <span className="text-[10px] font-bold text-muted-foreground">{initial}</span>
                ) : (
                    //eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={spaceData.icon!}
                        alt={`s/${spaceId} icon`}
                        className="w-full h-full object-cover"
                    />
                )}
            </div>
        );
    };

    const handleClick = (e: React.MouseEvent, targetPath: string) => {
        if (pathname === targetPath) {
            e.preventDefault();
            return;
        }
        e.preventDefault();
        setIsNavigating(true);
        router.push(targetPath);
    };

    return (
        <>
            {isSpacePage && spaceId ? (
                <Link
                    prefetch={false}
                    href={`/s/${spaceId}`}
                    className="flex items-center min-w-0 max-w-full"
                    onClick={(e) => handleClick(e, `/s/${spaceId}`)}
                >
                    {isNavigating ? (
                        <div className="flex items-center">
                            <Loader className="size-3 md:size-4 mr-1 text-foreground" />
                            <span className="text-[11px] md:text-base font-bold whitespace-nowrap">Loading...</span>
                        </div>
                    ) : (
                        <>
                            <span className="text-[10px] md:text-base font-bold whitespace-nowrap">Negation Game</span> {/* Mobile: 10px, Medium+: base */}
                            <span className="text-muted-foreground text-[10px] md:text-xs mx-0.5">×</span>
                            <div className="flex items-center min-w-0">
                                {renderIcon()}
                                <span className="text-[10px] md:text-base font-bold truncate">{`s/${spaceId}`}</span> {/* Mobile: 10px with truncate, Medium+: base */}
                            </div>
                        </>
                    )}
                </Link>
            ) : (
                <Link
                    prefetch={false}
                    href="/"
                    className="text-[11px] md:text-base font-bold whitespace-nowrap"
                    onClick={(e) => handleClick(e, "/")}
                > {/* Mobile: 11px, Medium+: base */}
                    {isNavigating ? (
                        <div className="flex items-center">
                            <Loader className="size-3 md:size-4 mr-1 text-foreground" />
                            <span>Loading...</span>
                        </div>
                    ) : (
                        "Negation Game"
                    )}
                </Link>
            )}
        </>
    );
} 