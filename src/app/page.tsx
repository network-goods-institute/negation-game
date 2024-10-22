"use client";

import { fetchFeedPage } from "@/actions/fetchFeed";
import { MakePointButton } from "@/components/MakePointButton";
import { NegateDialog } from "@/components/NegateDialog";
import { PointCard } from "@/components/PointCard";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { RefreshCwIcon } from "lucide-react";
import { useState } from "react";

const MotionRefreshCwIcon = motion.create(RefreshCwIcon);

export default function Home() {
  const { user } = usePrivy();

  const { data: points, isLoading } = useQuery({
    queryKey: ["feed", user?.id],
    queryFn: () => {
      return fetchFeedPage();
    },
  });

  console.log(points);

  const [negatedPoint, setNegatedPoint] = useState<
    { id: number; content: string; createdAt: Date } | undefined
  >(undefined);

  return (
    <main className="sm:grid sm:grid-cols-[1fr_minmax(200px,600px)_1fr] container-padding flex-grow min-h-screen gap-md py-md bg-secondary">
      <div className="w-full sm:col-[2] flex flex-col gap-sm">
        <AnimatePresence mode="popLayout">
          {isLoading && (
            <MotionRefreshCwIcon
              exit={{ opacity: 0 }}
              className="absolute self-center my-auto top-0 bottom-0 text-primary animate-spin"
            />
          )}
          {points?.map((point, i) => (
            <PointCard
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
              className="w-full"
              key={point.id}
              amountSupporters={point.amountSupporters}
              createdAt={point.createdAt.getTime()}
              totalCred={point.cred}
              pointId={point.id}
              favor={100}
              amountNegations={point.amountNegations}
              content={point.content}
              viewerContext={{ viewerCred: point.viewerCred }}
              onNegate={() => setNegatedPoint(point)}
            />
          ))}
        </AnimatePresence>
      </div>
      <MakePointButton className="fixed bottom-16 right-sm sm:bottom-md sm:right-md rounded-full " />

      <NegateDialog
        negatedPoint={negatedPoint}
        open={negatedPoint !== undefined}
        onOpenChange={(isOpen: boolean) =>
          !isOpen && setNegatedPoint(undefined)
        }
      />
    </main>
  );
}
