"use client";

import { fetchFeedPage } from "@/actions/fetchFeed";
import { negatedPointIdAtom } from "@/atoms/negatedPointIdAtom";
import { MakePointDialog } from "@/components/MakePointDialog";
import { NegateDialog } from "@/components/NegateDialog";
import { PointCard } from "@/components/PointCard";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { encodeId } from "@/lib/encodeId";
import { preventDefaultIfContainsSelection } from "@/lib/preventDefaultIfContainsSelection";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery } from "@tanstack/react-query";
import { useToggle } from "@uidotdev/usehooks";
import { useSetAtom } from "jotai";
import { PlusIcon } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const { user, login } = usePrivy();

  const { data: points, isLoading } = useQuery({
    queryKey: ["feed", user?.id],
    queryFn: () => {
      return fetchFeedPage();
    },
  });

  const setNegatedPointId = useSetAtom(negatedPointIdAtom);

  const [makePointOpen, onMakePointOpenChange] = useToggle(false);

  return (
    <main className="sm:grid sm:grid-cols-[1fr_minmax(200px,600px)_1fr] flex-grow gap-md  bg-background overflow-auto">
      <div className="w-full sm:col-[2] flex flex-col gap-0 border border-t-0">
        {isLoading && (
          <Loader className="absolute self-center my-auto top-0 bottom-0" />
        )}
        {points?.map((point, i) => (
          <Link
            draggable={false}
            onClick={preventDefaultIfContainsSelection}
            href={`/${encodeId(point.pointId)}`}
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
        ))}
      </div>
      <Button
        className="fixed bottom-md right-sm sm:right-md rounded-full p-3 h-fit sm:px-4"
        onClick={() => {
          user !== null ? onMakePointOpenChange(true) : login();
        }}
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
