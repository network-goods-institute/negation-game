"use client";
import { useUser } from "@/queries/users/useUser"
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { PointCard } from "@/components/cards/PointCard";
import Link from "next/link";
import { encodeId } from "@/lib/negation-game/encodeId";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, ArrowDownIcon, PencilIcon, ExternalLinkIcon, MessageSquareIcon, CoinsIcon, InfoIcon } from "lucide-react";
import { useState, useMemo, useCallback, useEffect, memo, Suspense } from "react";
import { useProfilePoints } from "@/queries/points/useProfilePoints";
import { useUserViewpoints } from "@/queries/users/useUserViewpoints";
import { Separator } from "@/components/ui/separator";
import React from "react";
import { useUserAllEndorsedPoints } from "@/queries/users/useUserAllEndorsedPoints";
import { getBackButtonHandler } from "@/lib/negation-game/backButtonUtils";
import { ViewpointCardWrapper } from "@/components/cards/ViewpointCardWrapper";
import { usePathname } from "next/navigation";
import { initialSpaceTabAtom } from "@/atoms/navigationAtom";
import { useSetAtom } from "jotai";
import { preventDefaultIfContainsSelection } from "@/lib/utils/preventDefaultIfContainsSelection";
import { negatedPointIdAtom } from "@/atoms/negatedPointIdAtom";
import { useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ProfilePoint } from "@/actions/points/fetchProfilePoints";
import { ProfileBadge, RationaleRank } from "@/components/ui/ProfileBadge";
import { DeltaComparisonWidget } from "@/components/delta/DeltaComparisonWidget";
import { useEarningsPreview } from "@/queries/epistemic/useEarningsPreview";

const ProfileEditDialog = dynamic(
    () => import("@/components/dialogs/ProfileEditDialog").then(mod => mod.ProfileEditDialog),
    {
        ssr: false,
        loading: () => null
    }
);

const EarningsDialog = dynamic(
    () => import("@/components/dialogs/EarningsDialog").then(mod => mod.EarningsDialog),
    {
        ssr: false,
        loading: () => null
    }
);

type ProfileTab = "profile" | "endorsements" | "dashboard";

const MemoizedPointCard = memo(PointCard);
const MemoizedViewpointCardWrapper = memo(ViewpointCardWrapper);

interface ProfilePageProps {
    params: Promise<{
        username: string;
    }>;
}

export default function ProfilePage({ params }: ProfilePageProps) {
    // Properly unwrap the params promise
    const resolvedParams = React.use(params);
    const username = resolvedParams.username;

    // All hooks must be called at the top level, before any conditionals
    const { user: privyUser, ready, login } = usePrivy();
    const router = useRouter();
    const [isTimelineAscending, setIsTimelineAscending] = useState(false);
    const [isEndorsementsAscending, setIsEndorsementsAscending] = useState(false);
    const { data: profilePoints } = useProfilePoints(username);
    const [activeTab, setActiveTab] = useState<ProfileTab>("profile");
    const setInitialTab = useSetAtom(initialSpaceTabAtom);
    const [loadingCardId, setLoadingCardId] = useState<string | null>(null);
    const pathname = usePathname();
    const queryClient = useQueryClient();
    const setNegatedPointId = useSetAtom(negatedPointIdAtom);

    const [loadingProgress, setLoadingProgress] = useState(0);
    const [loadingStage, setLoadingStage] = useState("Initializing");

    // Fetch viewpoints always (needed for profile and dashboard)
    const { data: userViewpoints, isLoading: isLoadingViewpoints } = useUserViewpoints(username);
    // Fetch endorsed points always (needed for profile stats)
    const { data: endorsedPoints, isLoading: isLoadingEndorsedPoints } = useUserAllEndorsedPoints(username);
    const { data: userData, isLoading: isLoadingUserData } = useUser(username);
    const [editProfileOpen, setEditProfileOpen] = useState(false);
    const [earningsDialogOpen, setEarningsDialogOpen] = useState(false);
    const [showCredInfo, setShowCredInfo] = useState(false);

    const { data: earningsPreview = 0 } = useEarningsPreview({
        enabled: !!privyUser && privyUser?.id === userData?.id
    });

    const isInitialLoading = isLoadingViewpoints || isLoadingEndorsedPoints || isLoadingUserData;

    useEffect(() => {
        // Progress reflects loading user data, viewpoints and endorsements
        if (isInitialLoading) {
            let completedSteps = 0;
            const totalSteps = 3; // user data, viewpoints, endorsements

            if (!isLoadingUserData) completedSteps++;
            if (!isLoadingViewpoints) completedSteps++;
            if (!isLoadingEndorsedPoints) completedSteps++;

            const stage = completedSteps === 0 ? "Loading user data..." :
                completedSteps === 1 ? "Loading rationales..." :
                completedSteps === 2 ? "Loading endorsements..." : "Finalizing...";
            setLoadingStage(stage);


            const timer = setTimeout(() => {
                setLoadingProgress(prev => {
                    const increment = completedSteps < totalSteps ? 15 : 50; // Smaller increments while waiting, larger jump when done
                    const currentTarget = (completedSteps + (completedSteps < totalSteps ? 0.8 : 1)) / totalSteps * 100;
                    return Math.min(prev + increment, currentTarget);
                });
            }, 150);
            return () => clearTimeout(timer);

        } else {
            setLoadingProgress(100);
            setLoadingStage("Ready");
        }
    }, [isInitialLoading, isLoadingUserData, isLoadingViewpoints, isLoadingEndorsedPoints]); // Dependencies updated

    // Wrap myPoints in useMemo to stabilize it
    const myPoints = useMemo(() => profilePoints || [], [profilePoints]);

    // Wrap userEndorsedPoints in useMemo to stabilize it
    const userEndorsedPoints = useMemo(() => endorsedPoints || [], [endorsedPoints]);

    const userCred = userData?.cred || 0;
    const isOwnProfile = privyUser?.id === userData?.id;
    const rationaleCount = userViewpoints?.length || 0;
    const rationaleBadgeThresholds = [1, 5, 10, 25, 50, 100];
    const earnedRationaleBadges = rationaleBadgeThresholds.filter(threshold => rationaleCount >= threshold);

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

    const handleBackClick = getBackButtonHandler(router, setInitialTab);

    useEffect(() => {
        setLoadingCardId(null);
        return () => {
            setLoadingCardId(null);
        };
    }, [pathname]);

    const handleCardClick = useCallback((id: string) => {
        setLoadingCardId(id);
    }, []);

    useEffect(() => {
        const handleEndorsementChange = (event: Event) => {
            if (username) {
                const pointId = (event as CustomEvent)?.detail?.pointId;

                queryClient.invalidateQueries({ queryKey: ["profile-points", username] });
                queryClient.invalidateQueries({ queryKey: ["user-endorsed-points", username] });
                queryClient.invalidateQueries({ queryKey: ["user-rationales", username] });

                if (pointId) {
                    queryClient.invalidateQueries({ queryKey: ["point", pointId] });
                }

                queryClient.invalidateQueries({ queryKey: ["feed"] });
            }
        };

        window.addEventListener("endorse-event", handleEndorsementChange);

        return () => {
            window.removeEventListener("endorse-event", handleEndorsementChange);
        };
    }, [username, queryClient]);

    // --- Main Loading Check ---
    // Show loading screen if initial data is loading
    if (isInitialLoading) {
        return (
            <main className="sm:grid sm:grid-cols-[1fr_minmax(200px,600px)_1fr] flex-grow bg-background">
                <div className="hidden sm:block"></div>
                <div className="px-4 pt-20 pb-4 flex-grow">
                    <div className="flex justify-center items-center h-full">
                        <div className="w-full max-w-md p-8 bg-muted/30 rounded-lg shadow">
                            <h2 className="text-2xl font-semibold text-center mb-6">Loading Profile</h2>
                            <Progress value={loadingProgress} className="w-full h-2 mb-4" />
                            <p className="text-center text-sm text-muted-foreground mb-6">{loadingStage}</p>
                        </div>
                    </div>
                </div>
                <div className="hidden sm:block"></div>
            </main>
        );
    }

    // --- User Not Found Check ---
    // Show user not found screen if data finished loading but no user exists
    if (!isInitialLoading && !userData) {
        return (
            <main className="sm:grid sm:grid-cols-[1fr_minmax(200px,600px)_1fr] flex-grow bg-background">
                <div className="hidden sm:block"></div>
                <div className="px-4 pt-20 pb-4 flex-grow">
                    <div className="flex justify-center items-center h-full">
                        <div className="w-full max-w-md p-8 bg-muted/30 rounded-lg shadow text-center">
                            <h2 className="text-2xl font-semibold mb-4">User Not Found</h2>
                            <p className="text-muted-foreground mb-6">
                                User &quot;{username}&quot; not found.
                            </p>
                            <Button
                                variant="outline"
                                onClick={handleBackClick}
                                className="gap-1"
                            >
                                <ArrowLeftIcon className="size-4" />
                                Go Back
                            </Button>
                        </div>
                    </div>
                </div>
                <div className="hidden sm:block"></div>
            </main>
        );
    }

    // Main render
    return (
        <main className="sm:grid sm:grid-cols-[1fr_minmax(200px,600px)_1fr] flex-grow bg-background">
            <div className="w-full sm:col-[2] flex flex-col border-x">
                <div className="sticky top-0 z-10 w-full flex items-center gap-3 px-4 py-3 bg-background/70 backdrop-blur">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1.5 px-2 rounded-md -ml-1"
                        onClick={handleBackClick}
                    >
                        <ArrowLeftIcon className="size-4" />
                        <span className="text-sm">Back</span>
                    </Button>
                    <h1 className="text-xl font-medium">Profile</h1>
                </div>

                <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-lg font-medium">{username}</h2>
                            <div className="flex items-center gap-1">
                                <p className="text-sm text-muted-foreground">{userCred} cred</p>
                                <button
                                    onClick={() => setShowCredInfo(!showCredInfo)}
                                    className="hover:text-foreground transition-colors"
                                >
                                    <InfoIcon className="size-3 text-muted-foreground" />
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {!isOwnProfile && userData?.id && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    asChild
                                    className="gap-1"
                                >
                                    <Link href={`/s/global/messages/${username}`}>
                                        <MessageSquareIcon className="size-3" />
                                        Send Message
                                    </Link>
                                </Button>
                            )}
                            {isOwnProfile && (
                                <>
                                    {earningsPreview > 0 && (
                                        <Button
                                            variant="default"
                                            size="sm"
                                            onClick={() => setEarningsDialogOpen(true)}
                                            className="gap-1"
                                        >
                                            <CoinsIcon className="size-3" />
                                            Collect {earningsPreview < 0.01 ? "< 0.01" : earningsPreview.toFixed(0)} Cred
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setEditProfileOpen(true)}
                                        className="gap-1"
                                    >
                                        <PencilIcon className="size-3" />
                                        Edit Profile
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    {showCredInfo && (
                        <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                            <p className="text-sm font-medium mb-2">How to gain cred:</p>
                            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                                <li>Create high-quality points that gain endorsements</li>
                                <li>Write comprehensive rationales that connect multiple points</li>
                                <li>Successfully doubt restakes that won&apos;t be slashed</li>
                                <li>Collect earnings from your successful doubts regularly</li>
                            </ul>
                            <p className="text-xs text-muted-foreground mt-2 italic">
                                Remember: Cred represents your credibility and influence in the system. Use it wisely!
                            </p>
                        </div>
                    )}

                    {userData?.delegationUrl && (
                        <div className="mb-6 p-4 bg-primary/5 border rounded-lg">
                            <div className="flex flex-col items-center text-center space-y-2">
                                <h3 className="font-medium">
                                    Governance Delegate
                                </h3>
                                <p className="text-sm text-muted-foreground max-w-md">
                                    {`${username} is a governance delegate. View their profile or delegate your voting power.`}
                                </p>
                                <div className="flex flex-wrap gap-2 justify-center">
                                    <a
                                        href={userData.delegationUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm"
                                    >
                                        <span>View Delegate Profile</span>
                                        <ExternalLinkIcon className="size-3" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}

                    {userData?.bio && (
                        <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                            <p className="text-sm whitespace-pre-wrap">{userData.bio}</p>
                        </div>
                    )}

                    {/* Badges Section */}
                    {earnedRationaleBadges.length > 0 && (
                        <div className="mb-6 p-4 bg-muted/10 border border-muted rounded-lg">
                            <h3 className="text-lg font-medium mb-2">Badges</h3>
                            <div className="flex flex-wrap gap-4">
                                {earnedRationaleBadges.map((threshold) => (
                                    <ProfileBadge key={threshold} threshold={threshold as RationaleRank} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Earnings Section for Own Profile */}
                    {isOwnProfile && earningsPreview === 0 && (
                        <div className="mb-6 p-4 bg-muted/10 border border-muted rounded-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-medium">No earnings available</h3>
                                    <p className="text-xs text-muted-foreground">Check if you have any pending earnings from doubts</p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEarningsDialogOpen(true)}
                                >
                                    <CoinsIcon className="size-3 mr-1" />
                                    Check Earnings
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Delta Comparison Widget - Only show if viewing your own profile or you're authenticated */}
                    {userData?.id && privyUser?.id && (
                        <div className="mb-6">
                            <DeltaComparisonWidget
                                comparison={{ type: "user", userId: userData.id, username: username }}
                                title="User Alignment Discovery"
                                description="Find users who agree or disagree with you most across all points created by this user"
                                currentUserId={privyUser.id}
                            />
                        </div>
                    )}

                    <Tabs
                        defaultValue="profile"
                        value={activeTab}
                        onValueChange={(value) => setActiveTab(value as ProfileTab)}
                        className="w-full"
                    >
                        <TabsList>
                            <TabsTrigger value="profile">Profile</TabsTrigger>
                            <TabsTrigger value="endorsements">Endorsements</TabsTrigger>
                            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                        </TabsList>

                        <TabsContent value="profile" className="mt-4">
                            <div className="space-y-6">
                                <div className="p-4 border rounded-lg">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-medium">Stats</h3>
                                        {isOwnProfile && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setEarningsDialogOpen(true)}
                                                className="gap-2"
                                            >
                                                <CoinsIcon className="size-4" />
                                                Collect Earnings
                                            </Button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="p-4 border rounded-lg text-center">
                                            <p className="text-xs md:text-sm text-muted-foreground mb-1">Points Created</p>
                                            <p className="text-xl md:text-2xl font-medium">{validPoints.length}</p>
                                        </div>
                                        <div className="p-4 border rounded-lg text-center">
                                            <p className="text-xs md:text-sm text-muted-foreground mb-1">Points Endorsed</p>
                                            <p className="text-xl md:text-2xl font-medium">{userEndorsedPoints.length}</p>
                                        </div>
                                        <div className="p-4 border rounded-lg text-center">
                                            <p className="text-xs md:text-sm text-muted-foreground mb-1">Total Cred Endorsed</p>
                                            <p className="text-xl md:text-2xl font-medium">
                                                {userEndorsedPoints.reduce((sum, point) =>
                                                    sum + (point.endorsedCred || 0)
                                                    , 0)}
                                            </p>
                                        </div>
                                        <div className="p-4 border rounded-lg text-center">
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
                                                        <MemoizedViewpointCardWrapper
                                                            key={viewpoint.id}
                                                            id={viewpoint.id}
                                                            title={viewpoint.title}
                                                            description={viewpoint.description}
                                                            author={viewpoint.author}
                                                            authorId={viewpoint.createdBy}
                                                            createdAt={new Date(viewpoint.createdAt)}
                                                            className="flex-grow"
                                                            space={viewpoint.space ?? "global"}
                                                            statistics={viewpoint.statistics || {
                                                                views: 0,
                                                                copies: 0,
                                                                totalCred: 0,
                                                                averageFavor: 0
                                                            }}
                                                            loadingCardId={loadingCardId}
                                                            handleCardClick={handleCardClick}
                                                            topic={viewpoint.topic ?? undefined}
                                                            topicId={viewpoint.topicId ?? undefined}
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
                                                            href={`/s/${point.space || 'global'}/${encodeId(point.pointId)}`}
                                                            className="flex border-b cursor-pointer hover:bg-accent"
                                                            draggable={false}
                                                            onClick={(e) => {
                                                                preventDefaultIfContainsSelection(e);
                                                                // Don't navigate if text is selected or if it's an action button
                                                                const isActionButton = (e.target as HTMLElement).closest('[data-action-button="true"]');
                                                                if (!isActionButton && window.getSelection()?.isCollapsed !== false) {
                                                                    handleCardClick(`point-${point.pointId}`);
                                                                }
                                                            }}
                                                        >
                                                            <MemoizedPointCard
                                                                className="flex-grow"
                                                                pointId={point.pointId}
                                                                content={point.content}
                                                                createdAt={point.createdAt}
                                                                cred={point.cred}
                                                                favor={point.favor}
                                                                amountSupporters={point.amountSupporters}
                                                                amountNegations={point.amountNegations}
                                                                viewerContext={{ viewerCred: point.viewerCred, viewerNegationsCred: point.viewerNegationsCred ?? 0 }}
                                                                space={point.space ?? undefined}
                                                                isLoading={loadingCardId === `point-${point.pointId}`}
                                                                onNegate={(e) => {

                                                                    if (privyUser) {
                                                                        setNegatedPointId(point.pointId);
                                                                    } else {
                                                                        login();
                                                                    }
                                                                }}
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

                        <TabsContent value="endorsements" className="mt-4">
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
                                            href={`/s/${point.space || 'global'}/${encodeId(point.pointId)}`}
                                            className="flex border-b cursor-pointer hover:bg-accent"
                                            draggable={false}
                                            onClick={(e) => {
                                                preventDefaultIfContainsSelection(e);
                                                // Don't navigate if text is selected or if it's an action button
                                                const isActionButton = (e.target as HTMLElement).closest('[data-action-button="true"]');
                                                if (!isActionButton && window.getSelection()?.isCollapsed !== false) {
                                                    handleCardClick(`point-${point.pointId}`);
                                                }
                                            }}
                                        >
                                            <MemoizedPointCard
                                                className="flex-grow"
                                                pointId={point.pointId}
                                                content={point.content}
                                                createdAt={point.createdAt}
                                                cred={point.cred}
                                                favor={point.favor}
                                                amountSupporters={point.amountSupporters}
                                                amountNegations={point.amountNegations}
                                                viewerContext={{ viewerCred: point.viewerCred, viewerNegationsCred: point.viewerNegationsCred ?? 0 }}
                                                space={point.space ?? undefined}
                                                isLoading={loadingCardId === `point-${point.pointId}`}
                                                onNegate={(e) => {
                                                    e.preventDefault();
                                                    if (privyUser) {
                                                        setNegatedPointId(point.pointId);
                                                    } else {
                                                        login();
                                                    }
                                                }}
                                            />
                                        </Link>
                                    ))
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="dashboard" className="mt-4">
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
                                                        <MemoizedViewpointCardWrapper
                                                            key={viewpoint.id}
                                                            id={viewpoint.id}
                                                            title={viewpoint.title}
                                                            description={viewpoint.description}
                                                            author={viewpoint.author}
                                                            authorId={viewpoint.createdBy}
                                                            createdAt={new Date(viewpoint.createdAt)}
                                                            space={viewpoint.space ?? "global"}
                                                            className="flex-grow"
                                                            statistics={viewpoint.statistics || {
                                                                views: 0,
                                                                copies: 0,
                                                                totalCred: 0,
                                                                averageFavor: 0
                                                            }}
                                                            loadingCardId={loadingCardId}
                                                            handleCardClick={handleCardClick}
                                                            topic={viewpoint.topic ?? undefined}
                                                            topicId={viewpoint.topicId ?? undefined}
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
                                                        href={`/s/${point.space || 'global'}/${encodeId(point.pointId)}`}
                                                        className="flex border-b cursor-pointer hover:bg-accent"
                                                        draggable={false}
                                                        onClick={(e) => {
                                                            preventDefaultIfContainsSelection(e);
                                                            // Don't navigate if text is selected or if it's an action button
                                                            const isActionButton = (e.target as HTMLElement).closest('[data-action-button="true"]');
                                                            if (!isActionButton && window.getSelection()?.isCollapsed !== false) {
                                                                handleCardClick(`point-${point.pointId}`);
                                                            }
                                                        }}
                                                    >
                                                        <MemoizedPointCard
                                                            className="flex-grow"
                                                            pointId={point.pointId}
                                                            content={point.content}
                                                            createdAt={point.createdAt}
                                                            cred={point.cred}
                                                            favor={point.favor}
                                                            amountSupporters={point.amountSupporters}
                                                            amountNegations={point.amountNegations}
                                                            viewerContext={{ viewerCred: point.viewerCred, viewerNegationsCred: point.viewerNegationsCred ?? 0 }}
                                                            space={point.space ?? undefined}
                                                            isLoading={loadingCardId === `point-${point.pointId}`}
                                                            onNegate={(e) => {
                                                                e.preventDefault();
                                                                if (privyUser) {
                                                                    setNegatedPointId(point.pointId);
                                                                } else {
                                                                    login();
                                                                }
                                                            }}
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
                <Suspense fallback={null}>
                    <ProfileEditDialog
                        open={editProfileOpen}
                        onOpenChange={setEditProfileOpen}
                        currentBio={userData?.bio}
                        currentDelegationUrl={userData?.delegationUrl}
                        currentDiscourseUsername={userData?.discourseUsername}
                        currentDiscourseCommunityUrl={userData?.discourseCommunityUrl}
                        currentDiscourseConsentGiven={userData?.discourseConsentGiven}
                    />
                    <EarningsDialog
                        open={earningsDialogOpen}
                        onOpenChange={setEarningsDialogOpen}
                    />
                </Suspense>
            )}
        </main>
    );
}