"use client";

import { negatedPointIdAtom } from "@/atoms/negatedPointIdAtom";
import { MakePointDialog } from "@/components/MakePointDialog";
import { NegateDialog } from "@/components/NegateDialog";
import { PointCard } from "@/components/PointCard";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { encodeId } from "@/lib/encodeId";
import { preventDefaultIfContainsSelection } from "@/lib/preventDefaultIfContainsSelection";
import { useFeed } from "@/queries/useFeed";
import { usePrivy } from "@privy-io/react-auth";
import { useToggle } from "@uidotdev/usehooks";
import { useSetAtom } from "jotai";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { useCallback } from "react";

export default function Home() {
  const { user, login } = usePrivy();
  const [makePointOpen, onMakePointOpenChange] = useToggle(false);

  const loginOrMakePoint = useCallback(
    () => (user !== null ? onMakePointOpenChange(true) : login()),
    [user, login, onMakePointOpenChange]
  );

  const { data: points, isLoading } = useFeed();
  const setNegatedPointId = useSetAtom(negatedPointIdAtom);

  return (
    <main className="sm:grid sm:grid-cols-[1fr_minmax(200px,600px)_1fr] flex-grow gap-md  bg-background overflow-auto">
      <div className="w-full sm:col-[2] flex flex-col gap-0 border border-t-0">
        {points === undefined ? (
          <Loader className="absolute self-center my-auto top-0 bottom-0" />
        ) : (
          <>
            {points.length === 0 ? (
              <span className="absolute self-center my-auto top-0 bottom-0">
                {`Nothing here yet. Why don't you `}
                <Button
                  variant={"link"}
                  className="p-0 text-base"
                  onClick={loginOrMakePoint}
                >
                  make a point
                </Button>
                ?
              </span>
            ) : (
              points.map((point, i) => (
                <Link
                  draggable={false}
                  onClick={preventDefaultIfContainsSelection}
                  href={`/s/${point.space}/${encodeId(point.pointId)}`}
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
