"use client";

import { negatedPointIdAtom } from "@/atoms/negatedPointIdAtom";
import { MakePointDialog } from "@/components/MakePointDialog";
import { NegateDialog } from "@/components/NegateDialog";
import { PointCard } from "@/components/PointCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { DEFAULT_SPACE } from "@/constants/config";
import { useBasePath } from "@/hooks/useBasePath";
import { encodeId } from "@/lib/encodeId";
import { preventDefaultIfContainsSelection } from "@/lib/preventDefaultIfContainsSelection";
import { useFeed } from "@/queries/useFeed";
import { useSpace } from "@/queries/useSpace";
import { usePrivy } from "@privy-io/react-auth";
import { useToggle } from "@uidotdev/usehooks";
import { useSetAtom } from "jotai";
import { PlusIcon, TrophyIcon, GroupIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { LeaderboardDialog } from "@/components/LeaderboardDialog";
import { useRouter } from "next/navigation";
import { useViewpoints } from "@/queries/useViewpoints";
import { ViewpointCard } from "@/components/ViewpointCard";
import { cn } from "@/lib/cn";

export default function Home() {
  const { user, login } = usePrivy();
  const [makePointOpen, onMakePointOpenChange] = useToggle(false);
  const basePath = useBasePath();
  const space = useSpace();
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const { push } = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const { data: viewpoints, isLoading: viewpointsLoading } = useViewpoints(space.data?.id || "global");
  const [selectedTab, setSelectedTab] = useState<"points" | "viewpoints">("points");

  const loginOrMakePoint = useCallback(() => {
    if (user !== null) {
      onMakePointOpenChange(true);
    } else {
      login();
    }
  }, [user, login, onMakePointOpenChange]);

  const handleNewViewpoint = () => {
    if (user) {
      setIsNavigating(true);
      push(`${basePath}/viewpoint/new`);
    } else {
      login();
    }
  };

  const { data: points, isLoading } = useFeed();
  const setNegatedPointId = useSetAtom(negatedPointIdAtom);

  return (
    <main className="sm:grid sm:grid-cols-[1fr_minmax(200px,600px)_1fr] flex-grow bg-background">
      <div className="relative w-full sm:col-[2] flex flex-col gap-0 border-x overflow-auto">
        {space && space.data && space.data.id !== DEFAULT_SPACE && (
          <>
            <div className="absolute top-0 h-10 w-full bg-muted" />
            <div className="py-sm px-lg flex items-end gap-sm w-full border-b pb-2xl">
              <Avatar className="border-4 border-background h-20 w-20">
                {space.data.icon && (
                  <AvatarImage
                    src={space.data.icon}
                    alt={`s/${space.data.id} icon`}
                  />
                )}
                <AvatarFallback className="text-4xl font-bold text-muted-foreground">
                  {space.data.id.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h1 className="text-xl mb-md font-semibold">s/{space.data.id}</h1>
            </div>
          </>
        )}
        <div className="flex gap-4 px-lg py-sm border-b">
          <button
            onClick={() => setSelectedTab("points")}
            className={cn(
              "py-2 px-4 rounded focus:outline-none",
              selectedTab === "points" ? "bg-primary text-white" : "bg-transparent text-primary"
            )}
          >
            Points
          </button>
          <button
            onClick={() => setSelectedTab("viewpoints")}
            className={cn(
              "py-2 px-4 rounded focus:outline-none",
              selectedTab === "viewpoints" ? "bg-primary text-white" : "bg-transparent text-primary"
            )}
          >
            Viewpoints
          </button>
        </div>
        {selectedTab === "points" ? (
          points === undefined || isLoading ? (
            <Loader className="absolute self-center my-auto top-0 bottom-0" />
          ) : points.length === 0 ? (
            <div className="flex flex-col flex-grow items-center justify-center">
              <span>Nothing here yet</span>
              <Button variant={"link"} className="p-0 text-base" onClick={loginOrMakePoint}>
                Make a Point
              </Button>
            </div>
          ) : (
            points.map((point) => (
              <Link
                draggable={false}
                onClick={preventDefaultIfContainsSelection}
                href={`${basePath}/${encodeId(point.pointId)}`}
                className="flex border-b cursor-pointer hover:bg-accent "
                key={point.pointId}
              >
                <PointCard
                  className="flex-grow p-6"
                  amountSupporters={point.amountSupporters}
                  createdAt={point.createdAt}
                  cred={point.cred}
                  pointId={point.pointId}
                  favor={point.favor}
                  amountNegations={point.amountNegations}
                  content={point.content}
                  viewerContext={{ viewerCred: point.viewerCred }}
                  onNegate={(e) => {
                    e.preventDefault();
                    user !== null ? setNegatedPointId(point.pointId) : login();
                  }}
                />
              </Link>
            ))
          )
        ) : (
          viewpoints === undefined || viewpointsLoading ? (
            <Loader className="absolute self-center my-auto top-0 bottom-0" />
          ) : viewpoints.length === 0 ? (
            <div className="flex flex-col flex-grow items-center justify-center">
              <span>Nothing here yet</span>
              <Button
                variant={"link"}
                className="p-0 text-base"
                onClick={handleNewViewpoint}
              >
                Create a Viewpoint
              </Button>
            </div>
          ) : (
            viewpoints.map((viewpoint) => (
              <ViewpointCard
                key={viewpoint.id}
                id={viewpoint.id}
                title={viewpoint.title}
                description={viewpoint.description}
                author={viewpoint.author}
                createdAt={new Date(viewpoint.createdAt)}
                space={space.data?.id || "global"}
                className="m-4"
              />
            ))
          )
        )}
      </div>
      <div className="fixed bottom-md right-sm sm:right-md flex flex-col items-end gap-3">
        <Button
          className="aspect-square rounded-full h-[58px] w-[58px] sm:h-10 sm:w-[160px] order-3"
          onClick={loginOrMakePoint}
          disabled={makePointOpen}
        >
          <PlusIcon className="size-7 sm:size-5" />
          <span className="hidden sm:block ml-sm">Make a Point</span>
        </Button>

        <Button
          className="aspect-square rounded-full h-[58px] w-[58px] sm:h-10 sm:w-[160px] order-2"
          onClick={handleNewViewpoint}
          rightLoading={isNavigating}
        >
          {isNavigating ? (
            <>
              <span className="hidden sm:block">Creating...</span>
              <Loader className="sm:hidden size-5 text-primary mx-auto" />
            </>
          ) : (
            <>
              <GroupIcon className="size-7 sm:size-5" />
              <span className="hidden sm:block ml-sm">New Viewpoint</span>
            </>
          )}
        </Button>

        <Button
          variant="ghost"
          className="aspect-square rounded-full h-[58px] w-[58px] sm:h-10 sm:w-auto sm:px-6 order-1"
          onClick={() => setLeaderboardOpen(true)}
        >
          <TrophyIcon className="size-7 sm:size-5" />
          <span className="hidden sm:block ml-sm">Leaderboard</span>
        </Button>
      </div>

      <NegateDialog />
      <MakePointDialog
        open={makePointOpen}
        onOpenChange={onMakePointOpenChange}
      />
      <LeaderboardDialog
        open={leaderboardOpen}
        onOpenChange={setLeaderboardOpen}
        space={space.data?.id || "global"}
      />
    </main>
  );
}
