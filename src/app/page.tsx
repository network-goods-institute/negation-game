"use client";

import { fetchFeedPage } from "@/actions/fetchFeed";
import { MakePointDialog } from "@/components/MakePointDialog";
import { NegateDialog } from "@/components/NegateDialog";
import { PointCard } from "@/components/PointCard";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { encodeId } from "@/lib/encodeId";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery } from "@tanstack/react-query";
import { useToggle } from "@uidotdev/usehooks";
import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
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
    { id: number; content: string; createdAt: Date } | undefined
  >(undefined);

  const [makePointOpen, onMakePointOpenChange] = useToggle(false);
  const { push } = useRouter();

  return (
    <main className="sm:grid sm:grid-cols-[1fr_minmax(200px,600px)_1fr] flex-grow gap-md  bg-background overflow-auto">
      <div className="w-full sm:col-[2] flex flex-col gap-0 border border-t-0">
        {isLoading && <Loader />}
        {points?.map((point, i) => (
          <PointCard
            className="w-full cursor-pointer hover:bg-accent border-b"
            onClick={() => push(`/${encodeId(point.id)}`)}
            key={point.id}
            amountSupporters={point.amountSupporters}
            createdAt={point.createdAt.getTime()}
            totalCred={point.cred}
            pointId={point.id}
            favor={100}
            amountNegations={point.amountNegations}
            content={point.content}
            viewerContext={{ viewerCred: point.viewerCred }}
            onNegate={() => (user !== null ? setNegatedPoint(point) : login())}
          />
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
