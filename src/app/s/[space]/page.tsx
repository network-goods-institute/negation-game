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
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { useCallback } from "react";

export default function Home() {
  const { user, login } = usePrivy();
  const [makePointOpen, onMakePointOpenChange] = useToggle(false);
  const basePath = useBasePath();
  const space = useSpace();

  const loginOrMakePoint = useCallback(
    () => (user !== null ? onMakePointOpenChange(true) : login()),
    [user, login, onMakePointOpenChange]
  );

  const { data: points, isLoading } = useFeed();
  const setNegatedPointId = useSetAtom(negatedPointIdAtom);

  return (
    <main className="sm:grid sm:grid-cols-[1fr_minmax(200px,600px)_1fr] flex-grow gap-md  bg-background overflow-auto">
      <div className="relative w-full sm:col-[2] h-full flex flex-col gap-0 border-x">
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
        {points === undefined ? (
          <Loader className="absolute self-center my-auto top-0 bottom-0" />
        ) : (
          <>
            {points.length === 0 ? (
              <div className="flex flex-col flex-grow items-center justify-center">
                <span>Nothing here yet</span>
                <Button
                  variant={"link"}
                  className="p-0 text-base"
                  onClick={loginOrMakePoint}
                >
                  Make a Point
                </Button>
              </div>
            ) : (
              points.map((point, i) => (
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
                      user !== null
                        ? setNegatedPointId(point.pointId)
                        : login();
                    }}
                  />
                </Link>
              ))
            )}
          </>
        )}
      </div>
      <Button
        className="fixed bottom-md right-sm sm:right-md rounded-full p-3 h-fit sm:px-4"
        onClick={loginOrMakePoint}
      >
        <PlusIcon className="inline align-baseline" />
        <span className="hidden  sm:block ml-sm">Make a Point</span>
      </Button>

      <NegateDialog />
      <MakePointDialog
        open={makePointOpen}
        onOpenChange={onMakePointOpenChange}
      />
    </main>
  );
}
