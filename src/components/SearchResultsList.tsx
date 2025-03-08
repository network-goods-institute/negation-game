import { Loader } from "@/components/ui/loader";
import { SearchResult } from "@/actions/searchContent";
import { ViewpointCard } from "@/components/ViewpointCard";
import { encodeId } from "@/lib/encodeId";
import { useBasePath } from "@/hooks/useBasePath";
import Link from "next/link";
import { negatedPointIdAtom } from "@/atoms/negatedPointIdAtom";
import { useSetAtom } from "jotai";
import { usePrivy } from "@privy-io/react-auth";
import { PointCard } from "@/components/PointCard";
import { preventDefaultIfContainsSelection } from "@/lib/preventDefaultIfContainsSelection";

interface SearchResultsListProps {
    results: SearchResult[];
    isLoading: boolean;
    query: string;
    hasSearched?: boolean;
}

interface PointData {
    pointId: number;
    content: string;
    createdAt: Date;
    createdBy: string;
    space: string;
    amountNegations: number;
    amountSupporters: number;
    cred: number;
    favor?: number;
    negationsCred: number;
    negationIds: string[];
    username: string;
    relevance: number;
    viewerCred?: number;
}

export function SearchResultsList({ results, isLoading, query, hasSearched = false }: SearchResultsListProps) {
    const { user, login } = usePrivy();
    const basePath = useBasePath();
    const setNegatedPointId = useSetAtom(negatedPointIdAtom);

    if (query.trim().length < 2) {
        return (
            <div className="flex flex-col flex-grow items-center justify-center p-6">
                <span className="text-muted-foreground">Enter at least 2 characters to search</span>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex flex-col flex-grow items-center justify-center p-6">
                <Loader className="mx-auto" />
            </div>
        );
    }

    if (hasSearched && !isLoading && results.length === 0 && query.trim().length >= 2) {
        return (
            <div className="flex flex-col flex-grow items-center justify-center p-6">
                <span className="text-muted-foreground">No results found for &ldquo;{query}&rdquo;</span>
            </div>
        );
    }

    if (!hasSearched && query.trim().length >= 2 && !isLoading) {
        return (
            <div className="flex flex-col flex-grow items-center justify-center p-6">
                <span className="text-muted-foreground">Type to search...</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            {results.map((result) => {
                if (result.type === "point" && result.pointData) {
                    // Cast the pointData to PointData to satisfy TypeScript
                    const pointData = result.pointData as unknown as PointData;

                    return (
                        <Link
                            draggable={false}
                            onClick={preventDefaultIfContainsSelection}
                            href={`${basePath}/${encodeId(Number(result.id))}`}
                            className="flex border-b cursor-pointer hover:bg-accent"
                            key={`point-${result.id}`}
                        >
                            <PointCard
                                className="flex-grow p-6"
                                pointId={Number(result.id)}
                                content={result.content}
                                createdAt={result.createdAt}
                                cred={pointData.cred}
                                favor={pointData.favor || 0}
                                amountNegations={pointData.amountNegations}
                                amountSupporters={pointData.amountSupporters}
                                viewerContext={{ viewerCred: pointData.viewerCred }}
                                onNegate={(e) => {
                                    e.preventDefault();
                                    user !== null ? setNegatedPointId(Number(result.id)) : login();
                                }}
                                space={pointData.space}
                                isCommand={result.content.startsWith('/')}
                            />
                        </Link>
                    );
                } else if (result.type === "viewpoint" && result.title) {
                    return (
                        <ViewpointCard
                            key={`viewpoint-${result.id}`}
                            id={result.id.toString()}
                            title={result.title}
                            description={result.description || ""}
                            author={result.author}
                            createdAt={result.createdAt}
                            space={result.space || "global"}
                            linkable={true}
                        />
                    );
                }
                return null;
            })}
        </div>
    );
}
