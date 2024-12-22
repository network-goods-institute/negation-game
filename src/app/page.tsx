"use client";

import { fetchFeedPage } from "@/actions/fetchFeed";
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
import { DiscIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function Home() {
  const { user, login } = usePrivy();

  const { data: points, isLoading } = useQuery({
    queryKey: ["feed", user?.id],
    queryFn: () => {
      return fetchFeedPage();
    },
  });

  const [negatedPoint, setNegatedPoint] = useState<
    { id: number; content: string; createdAt: Date; cred: number } | undefined
  >(undefined);

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
            href={`/${encodeId(point.id)}`}
            className="flex border-b cursor-pointer hover:bg-accent py-2"
            key={point.id}
          >
            <DiscIcon className="ml-4 mt-3 shrink-0 size-6 text-muted-foreground stroke-1" />
            <PointCard
              className="flex-grow -mt-0.5 pl-3"
              amountSupporters={point.amountSupporters}
              createdAt={point.createdAt}
              totalCred={point.cred}
              pointId={point.id}
              favor={Math.floor(point.favor)}
              amountNegations={point.amountNegations}
              content={point.content}
              viewerContext={{ viewerCred: point.viewerCred }}
              onNegate={(e) => {
                e.preventDefault();
                user !== null ? setNegatedPoint({
                  id: point.id,
                  content: point.content,
                  createdAt: point.createdAt,
                  cred: point.cred
                }) : login();
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

      <NegateDialog
        negatedPoint={negatedPoint}
        open={negatedPoint !== undefined}
        onOpenChange={(isOpen: boolean) =>
          !isOpen && setNegatedPoint(undefined)
        }
      />
      <MakePointDialog
        open={makePointOpen}
        onOpenChange={onMakePointOpenChange}
      />
    </main>
  );
}
