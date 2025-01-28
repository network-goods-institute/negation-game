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
import { ArrowLeftIcon } from "lucide-react";
import { Loader } from "@/components/ui/loader";
import { ConnectButton } from "@/components/ConnectButton";

export default function ProfilePage() {
    const { user: privyUser, ready, login } = usePrivy();
    const { data: user } = useUser();
    const router = useRouter();
    const { data: points, isLoading: isLoadingPoints } = useFeed();
    const basePath = useBasePath();

    if (!ready || isLoadingPoints) {
        return (
            <main className="sm:grid sm:grid-cols-[1fr_minmax(200px,600px)_1fr] flex-grow bg-background">
                <div className="w-full sm:col-[2] flex flex-col border-x items-center justify-center">
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
                            <TabsTrigger value="points">My Points</TabsTrigger>
                            <TabsTrigger value="endorsements">Endorsements</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="mt-4">
                            <div className="grid gap-4">
                                <div className="p-4 border rounded-lg">
                                    <h3 className="font-medium mb-2">Stats</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Total Points</p>
                                            <p className="text-2xl font-medium">{myPoints.length}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Total Cred</p>
                                            <p className="text-2xl font-medium">{user.cred}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="points">
                            <div className="space-y-4">
                                {myPoints.length === 0 ? (
                                    <p className="text-muted-foreground text-center py-8">
                                        No points created yet
                                    </p>
                                ) : (
                                    myPoints.map((point) => (
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
                                {endorsedPoints.length === 0 ? (
                                    <p className="text-muted-foreground text-center py-8">
                                        No endorsements yet
                                    </p>
                                ) : (
                                    endorsedPoints.map((point) => (
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
                    </Tabs>
                </div>
            </div>
        </main>
    );
} 