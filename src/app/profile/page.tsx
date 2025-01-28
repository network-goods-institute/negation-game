"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@/queries/useUser";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useFeed } from "@/queries/useFeed";
import { PointCard } from "@/components/PointCard";
import Link from "next/link";
import { encodeId } from "@/lib/encodeId";
import { useBasePath } from "@/hooks/useBasePath";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, ArrowDownIcon } from "lucide-react";
import { Loader } from "@/components/ui/loader";
import { ConnectButton } from "@/components/ConnectButton";
import { useState } from "react";

export default function ProfilePage() {
    const { user: privyUser, ready, login } = usePrivy();
    const { data: user } = useUser();
    const router = useRouter();
    const { data: points, isLoading: isLoadingPoints } = useFeed();
    const basePath = useBasePath();
    const [isTimelineAscending, setIsTimelineAscending] = useState(false);
    const [isEndorsementsAscending, setIsEndorsementsAscending] = useState(false);

    if (!ready || isLoadingPoints) {
        return (
            <main className="sm:grid sm:grid-cols-[1fr_minmax(200px,600px)_1fr] flex-grow bg-background">
                <div className="w-full sm:col-[2] flex flex-col border-x items-center justify-center min-h-[calc(100vh-var(--header-height))] sm:min-h-0">
                    <Loader className="size-6" />
                </div>
            </main>
        );
    }

    if (!privyUser) {
        return (
            <main className="sm:grid sm:grid-cols-[1fr_minmax(200px,600px)_1fr] flex-grow bg-background">
                <div className="w-full sm:col-[2] flex flex-col border-x">
                    <div className="sticky top-0 z-10 w-full flex items-center gap-3 px-4 py-3 bg-background/70 backdrop-blur">
                        <Button
                            variant="link"
                            size="icon"
                            className="text-foreground -ml-3"
                            onClick={() => {
                                if (window.history.state?.idx > 0) {
                                    router.back();
                                    return;
                                }
                                router.push("/");
                            }}
                        >
                            <ArrowLeftIcon />
                        </Button>
                    </div>
                    <div className="flex flex-col items-center justify-center flex-grow gap-3 p-8 text-center">
                        <p className="text-muted-foreground">
                            You need to be logged in to continue
                        </p>
                        <ConnectButton />
                    </div>
                </div>
            </main>
        );
    }

    if (!user || !points) return null;

    const myPoints = points.filter(point => point.createdBy === privyUser?.id);
    const endorsedPoints = points.filter(point => point.viewerCred && point.viewerCred > 0);

    const spaces = Array.from(new Set(myPoints.map(p => p.space))).filter(Boolean) as string[];
    const pointsBySpace = spaces.map(space => ({
        space,
        points: myPoints.filter(p => p.space === space)
    }));

    const generalPoints = myPoints.filter(p => !p.space);
    if (generalPoints.length > 0) {
        pointsBySpace.push({ space: "General", points: generalPoints });
    }

    return (
        <main className="sm:grid sm:grid-cols-[1fr_minmax(200px,600px)_1fr] flex-grow bg-background">
            <div className="w-full sm:col-[2] flex flex-col border-x">
                <div className="sticky top-0 z-10 w-full flex items-center gap-3 px-4 py-3 bg-background/70 backdrop-blur">
                    <Button
                        variant="link"
                        size="icon"
                        className="text-foreground -ml-3"
                        onClick={() => {
                            if (window.history.state?.idx > 0) {
                                router.back();
                                return;
                            }
                            router.push("/");
                        }}
                    >
                        <ArrowLeftIcon />
                    </Button>
                    <h1 className="text-xl font-medium">Profile</h1>
                </div>

                <div className="p-4">
                    <div className="flex items-center gap-4 mb-6">
                        <div>
                            <h2 className="text-lg font-medium">{user.username}</h2>
                            <p className="text-sm text-muted-foreground">{user.cred} cred</p>
                        </div>
                    </div>

                    <Tabs defaultValue="overview" className="w-full">
                        <TabsList>
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="timeline">Timeline</TabsTrigger>
                            <TabsTrigger value="endorsements">Endorsements</TabsTrigger>
                            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="mt-4">
                            <div className="grid gap-4">
                                <div className="p-4 border rounded-lg">
                                    <h3 className="font-medium mb-2">Stats</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-4">
                                        <div className="p-4 border rounded-lg text-center md:text-left">
                                            <p className="text-xs md:text-sm text-muted-foreground mb-1">Points Created</p>
                                            <p className="text-xl md:text-2xl font-medium">{myPoints.length}</p>
                                        </div>
                                        <div className="p-4 border rounded-lg text-center md:text-left">
                                            <p className="text-xs md:text-sm text-muted-foreground mb-1">Points Endorsed</p>
                                            <p className="text-xl md:text-2xl font-medium">{endorsedPoints.length}</p>
                                        </div>
                                        <div className="p-4 border rounded-lg text-center md:text-left">
                                            <p className="text-xs md:text-sm text-muted-foreground mb-1">Total Cred Endorsed</p>
                                            <p className="text-xl md:text-2xl font-medium">
                                                {endorsedPoints.reduce((sum, point) => sum + (point.viewerCred || 0), 0)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="timeline">
                            <div className="space-y-4">
                                <div className="flex items-center justify-end">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsTimelineAscending(!isTimelineAscending)}
                                        className="text-muted-foreground gap-1"
                                    >
                                        {isTimelineAscending ? 'Oldest First' : 'Newest First'}
                                        <ArrowDownIcon className={`size-4 transition-transform ${isTimelineAscending ? 'rotate-180' : ''}`} />
                                    </Button>
                                </div>
                                {myPoints.length === 0 ? (
                                    <p className="text-muted-foreground text-center py-8">
                                        No points created yet
                                    </p>
                                ) : (
                                    [...myPoints]
                                        .sort((a, b) =>
                                            isTimelineAscending
                                                ? a.createdAt.getTime() - b.createdAt.getTime()
                                                : b.createdAt.getTime() - a.createdAt.getTime()
                                        )
                                        .map((point) => (
                                            <Link
                                                key={point.pointId}
                                                href={`${basePath}/${encodeId(point.pointId)}`}
                                                className="flex border-b cursor-pointer hover:bg-accent"
                                            >
                                                <PointCard
                                                    className="flex-grow"
                                                    pointId={point.pointId}
                                                    content={point.content}
                                                    createdAt={point.createdAt}
                                                    cred={point.cred}
                                                    favor={point.favor}
                                                    amountSupporters={point.amountSupporters}
                                                    amountNegations={point.amountNegations}
                                                    viewerContext={{ viewerCred: point.viewerCred }}
                                                    space={point.space ?? undefined}
                                                />
                                            </Link>
                                        ))
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="endorsements">
                            <div className="space-y-4">
                                <div className="flex items-center justify-end">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsEndorsementsAscending(!isEndorsementsAscending)}
                                        className="text-muted-foreground gap-1"
                                    >
                                        {isEndorsementsAscending ? 'Oldest First' : 'Newest First'}
                                        <ArrowDownIcon className={`size-4 transition-transform ${isEndorsementsAscending ? 'rotate-180' : ''}`} />
                                    </Button>
                                </div>
                                {endorsedPoints.length === 0 ? (
                                    <p className="text-muted-foreground text-center py-8">
                                        No endorsements yet
                                    </p>
                                ) : (
                                    [...endorsedPoints]
                                        .sort((a, b) =>
                                            isEndorsementsAscending
                                                ? a.createdAt.getTime() - b.createdAt.getTime()
                                                : b.createdAt.getTime() - a.createdAt.getTime()
                                        )
                                        .map((point) => (
                                            <Link
                                                key={point.pointId}
                                                href={`${basePath}/${encodeId(point.pointId)}`}
                                                className="flex border-b cursor-pointer hover:bg-accent"
                                            >
                                                <PointCard
                                                    className="flex-grow"
                                                    pointId={point.pointId}
                                                    content={point.content}
                                                    createdAt={point.createdAt}
                                                    cred={point.cred}
                                                    favor={point.favor}
                                                    amountSupporters={point.amountSupporters}
                                                    amountNegations={point.amountNegations}
                                                    viewerContext={{ viewerCred: point.viewerCred }}
                                                    space={point.space ?? undefined}
                                                />
                                            </Link>
                                        ))
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="dashboard">
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium">Points by Space</h3>

                                    {pointsBySpace.length === 0 ? (
                                        <p className="text-muted-foreground text-center py-8">
                                            No points across spaces
                                        </p>
                                    ) : (
                                        pointsBySpace.map(({ space, points }) => (
                                            <div key={space} className="space-y-4">
                                                <div className="bg-muted/30 p-3 rounded-lg">
                                                    <h4 className="font-medium text-sm uppercase tracking-wider text-muted-foreground">
                                                        {space}
                                                    </h4>
                                                </div>
                                                {points.map((point) => (
                                                    <Link
                                                        key={point.pointId}
                                                        href={`${basePath}/${encodeId(point.pointId)}`}
                                                        className="flex border-b cursor-pointer hover:bg-accent"
                                                    >
                                                        <PointCard
                                                            className="flex-grow"
                                                            pointId={point.pointId}
                                                            content={point.content}
                                                            createdAt={point.createdAt}
                                                            cred={point.cred}
                                                            favor={point.favor}
                                                            amountSupporters={point.amountSupporters}
                                                            amountNegations={point.amountNegations}
                                                            viewerContext={{ viewerCred: point.viewerCred }}
                                                            space={point.space ?? undefined}
                                                        />
                                                    </Link>
                                                ))}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </main>
    );
} 