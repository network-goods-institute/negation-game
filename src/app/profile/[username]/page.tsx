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
import { ArrowLeftIcon, ArrowDownIcon, PencilIcon, ExternalLinkIcon } from "lucide-react";
import { Loader } from "@/components/ui/loader";
import { ConnectButton } from "@/components/ConnectButton";
import { useState, useMemo } from "react";
import { useProfilePoints } from "@/queries/useProfilePoints";
import { useUserViewpoints } from "@/queries/useUserViewpoints";
import { ViewpointCard } from "@/components/ViewpointCard";
import { Separator } from "@/components/ui/separator";
import type { ProfilePoint } from "@/actions/fetchProfilePoints";
import React from "react";
import { useUserEndorsedPoints } from "@/queries/useUserEndorsedPoints";
import { ProfileEditDialog } from "@/components/ProfileEditDialog";

interface ProfilePageProps {
    params: Promise<{
        username: string;
    }>;
}

export default function ProfilePage({ params }: ProfilePageProps) {
    // Unwrap params using React.use()
    const unwrappedParams = React.use(params as any) as { username: string };
    const username = unwrappedParams.username;

    // All hooks must be called at the top level, before any conditionals
    const { user: privyUser, ready } = usePrivy();
    const router = useRouter();
    const { data: points, isLoading: isLoadingPoints } = useFeed();
    const basePath = useBasePath();
    const [isTimelineAscending, setIsTimelineAscending] = useState(false);
    const [isEndorsementsAscending, setIsEndorsementsAscending] = useState(false);
    const { data: profilePoints } = useProfilePoints(username);
    const { data: userViewpoints, isLoading: isLoadingViewpoints } = useUserViewpoints(username);
    const { data: endorsedPoints, isLoading: isLoadingEndorsedPoints } = useUserEndorsedPoints(username);
    const { data: userData } = useUser(username);
    const [editProfileOpen, setEditProfileOpen] = useState(false);

    // Wrap myPoints in useMemo to stabilize it
    const myPoints = useMemo(() => profilePoints || [], [profilePoints]);

    // Wrap userEndorsedPoints in useMemo to stabilize it
    const userEndorsedPoints = useMemo(() => endorsedPoints || [], [endorsedPoints]);

    const userCred = profilePoints?.[0]?.cred || 0;
    const isOwnProfile = privyUser?.id === userData?.id;

    // Wrap validPoints in useMemo to stabilize it
    const validPoints = useMemo(() => Array.isArray(myPoints) ? myPoints : [], [myPoints]);

    // Handle all space-related logic at the top level
    const spaces = Array.from(
        new Set(
            validPoints.map((p: ProfilePoint) => p.space)
        )
    ).filter((space): space is string => space !== null && space !== undefined);

    const pointsBySpace = spaces.map(space => ({
        space,
        points: validPoints.filter((p: ProfilePoint) => p.space === space)
    }));

    if (validPoints.some((p: ProfilePoint) => !p.space)) {
        pointsBySpace.push({
            space: "General",
            points: validPoints.filter((p: ProfilePoint) => !p.space)
        });
    }

    pointsBySpace.sort((a, b) => {
        if (a.space === "global") return -1;
        if (b.space === "global") return 1;
        return a.space.localeCompare(b.space);
    });

    // Define interface for space groups
    interface SpaceGroup {
        space: string;
        points: ProfilePoint[];
        spaceViewpoints: any[]; // Using any for viewpoints, ideally would be more specific
    }

    // All useMemo hooks must be defined together after other hooks
    const filteredPoints = useMemo(() => {
        if (!validPoints.length) return [];

        return validPoints.sort((a, b) =>
            isTimelineAscending
                ? a.createdAt.getTime() - b.createdAt.getTime()
                : b.createdAt.getTime() - a.createdAt.getTime()
        );
    }, [validPoints, isTimelineAscending]);

    const filteredViewpoints = useMemo(() => {
        if (!userViewpoints?.length) return [];

        return [...(userViewpoints || [])].sort((a, b) =>
            isTimelineAscending
                ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }, [userViewpoints, isTimelineAscending]);

    const filteredEndorsedPoints = useMemo(() => {
        if (!userEndorsedPoints.length) return [];

        return [...userEndorsedPoints].sort((a, b) =>
            isEndorsementsAscending
                ? a.createdAt.getTime() - b.createdAt.getTime()
                : b.createdAt.getTime() - a.createdAt.getTime()
        );
    }, [userEndorsedPoints, isEndorsementsAscending]);

    const memoizedPointsBySpace = useMemo<SpaceGroup[]>(() => {
        return pointsBySpace.map(({ space, points }) => {
            const spaceViewpoints = userViewpoints?.filter(
                v => v.space === space
            ) || [];

            return {
                space,
                points: points.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
                spaceViewpoints: spaceViewpoints.sort((a, b) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                )
            };
        });
    }, [pointsBySpace, userViewpoints]);

    // Loading states should be checked after all hooks are called
    if (!ready || isLoadingPoints || isLoadingViewpoints || isLoadingEndorsedPoints) {
        return (
            <main className="sm:grid sm:grid-cols-[1fr_minmax(200px,600px)_1fr] flex-grow bg-background">
                <div className="w-full sm:col-[2] flex flex-col border-x items-center justify-center min-h-[calc(100vh-var(--header-height))] sm:min-h-0">
                    <Loader className="size-6" />
                </div>
            </main>
        );
    }

    // Handle invalid username - show not found page
    if (profilePoints === null) {
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
                        <h2 className="text-2xl font-semibold">User Not Found</h2>
                        <p className="text-muted-foreground">
                            The user &quot;{username}&quot; does not exist
                        </p>
                        <Button onClick={() => router.push("/")}>
                            Return Home
                        </Button>
                    </div>
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

    if (!points) return null;

    // Main render
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
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-lg font-medium">{username}</h2>
                            <p className="text-sm text-muted-foreground">{userCred} cred</p>
                        </div>
                        {isOwnProfile && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditProfileOpen(true)}
                                className="gap-1"
                            >
                                <PencilIcon className="size-3" />
                                Edit Profile
                            </Button>
                        )}
                    </div>

                    {userData?.bio && (
                        <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                            <p className="text-sm whitespace-pre-wrap">{userData.bio}</p>
                        </div>
                    )}

                    {userData?.delegationUrl && (
                        <div className="mb-6 p-4 bg-primary/5 border rounded-lg">
                            <div className="flex flex-col items-center text-center space-y-2">
                                <h3 className="font-medium">Delegate Your Voting Power</h3>
                                <p className="text-sm text-muted-foreground max-w-md">
                                    Support {username}&apos;s governance decisions by delegating your voting power
                                </p>
                                <a
                                    href={userData.delegationUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-2 px-8 py-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                                >
                                    <span>Delegate Now</span>
                                    <ExternalLinkIcon className="size-4" />
                                </a>
                            </div>
                        </div>
                    )}

                    <Tabs defaultValue="profile" className="w-full">
                        <TabsList>
                            <TabsTrigger value="profile">Profile</TabsTrigger>
                            <TabsTrigger value="endorsements">Endorsements</TabsTrigger>
                            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                        </TabsList>

                        <TabsContent value="profile" className="mt-4" keepMounted>
                            <div className="space-y-6">
                                <div className="p-4 border rounded-lg">
                                    <h3 className="font-medium mb-2">Stats</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="p-4 border rounded-lg text-center md:text-left">
                                            <p className="text-xs md:text-sm text-muted-foreground mb-1">Points Created</p>
                                            <p className="text-xl md:text-2xl font-medium">{validPoints.length}</p>
                                        </div>
                                        <div className="p-4 border rounded-lg text-center md:text-left">
                                            <p className="text-xs md:text-sm text-muted-foreground mb-1">Points Endorsed</p>
                                            <p className="text-xl md:text-2xl font-medium">{userEndorsedPoints.length}</p>
                                        </div>
                                        <div className="p-4 border rounded-lg text-center md:text-left">
                                            <p className="text-xs md:text-sm text-muted-foreground mb-1">Total Cred Endorsed</p>
                                            <p className="text-xl md:text-2xl font-medium">
                                                {userEndorsedPoints.reduce((sum, point) =>
                                                    sum + (point.endorsedCred || 0)
                                                    , 0)}
                                            </p>
                                        </div>
                                        <div className="p-4 border rounded-lg text-center md:text-left">
                                            <p className="text-xs md:text-sm text-muted-foreground mb-1">Rationales Created</p>
                                            <p className="text-xl md:text-2xl font-medium">{userViewpoints?.length || 0}</p>
                                        </div>
                                    </div>
                                </div>

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
                                    {validPoints.length === 0 ? (
                                        <>
                                            {userViewpoints?.length === 0 ? (
                                                <p className="text-muted-foreground text-center py-8">
                                                    No points or rationales created yet
                                                </p>
                                            ) : (
                                                <p className="text-muted-foreground text-center py-8">
                                                    No points created yet
                                                </p>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            {filteredViewpoints.length > 0 && (
                                                <>
                                                    <h5 className="text-sm font-medium text-muted-foreground ml-2">Rationales</h5>
                                                    {filteredViewpoints.map((viewpoint) => (
                                                        <ViewpointCard
                                                            key={viewpoint.id}
                                                            id={viewpoint.id}
                                                            title={viewpoint.title}
                                                            description={viewpoint.description}
                                                            author={viewpoint.author}
                                                            createdAt={new Date(viewpoint.createdAt)}
                                                            className="mb-2 mx-2"
                                                            space={viewpoint.space ?? "global"}
                                                            linkable={true}
                                                        />
                                                    ))}
                                                </>
                                            )}
                                            {filteredPoints.length > 0 && filteredViewpoints.length > 0 && (
                                                <Separator className="my-4" />
                                            )}
                                            {filteredPoints.length > 0 && (
                                                <>
                                                    <h5 className="text-sm font-medium text-muted-foreground ml-2">Points</h5>
                                                    {filteredPoints.map((point) => (
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
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="endorsements" keepMounted>
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
                                {userEndorsedPoints.length === 0 ? (
                                    <p className="text-muted-foreground text-center py-8">
                                        No endorsements yet
                                    </p>
                                ) : (
                                    filteredEndorsedPoints.map((point) => (
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

                        <TabsContent value="dashboard" keepMounted>
                            <div className="space-y-6">
                                {memoizedPointsBySpace.map(({ space, points, spaceViewpoints }) => (
                                    <div key={space} className="space-y-4">
                                        <div className="bg-muted/30 p-3 rounded-lg">
                                            <h4 className="font-medium text-sm uppercase tracking-wider text-muted-foreground">
                                                {space === "General" ? "General" : `s/${space}`}
                                            </h4>
                                        </div>
                                        {spaceViewpoints.length > 0 && (
                                            <>
                                                <div className="space-y-2">
                                                    <h5 className="text-sm font-medium text-muted-foreground ml-2">Rationales</h5>
                                                    {spaceViewpoints.map(viewpoint => (
                                                        <ViewpointCard
                                                            key={viewpoint.id}
                                                            id={viewpoint.id}
                                                            title={viewpoint.title}
                                                            description={viewpoint.description}
                                                            author={viewpoint.author}
                                                            createdAt={new Date(viewpoint.createdAt)}
                                                            space={viewpoint.space ?? "global"}
                                                            className="mb-2 mx-2"
                                                            linkable={true}
                                                        />
                                                    ))}
                                                </div>
                                                <Separator className="my-4" />
                                            </>
                                        )}
                                        {points.length > 0 && (
                                            <>
                                                <h5 className="text-sm font-medium text-muted-foreground ml-2">Points</h5>
                                                {points.map((point: ProfilePoint) => (
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
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {isOwnProfile && (
                <ProfileEditDialog
                    open={editProfileOpen}
                    onOpenChange={setEditProfileOpen}
                    currentBio={userData?.bio}
                    currentDelegationUrl={userData?.delegationUrl}
                />
            )}
        </main>
    );
} 