"use client";

import { fetchFeedPage } from "@/actions/fetchFeed";
import { PointCard } from "@/components/PointCard";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery } from "@tanstack/react-query";

export const HomeFeed = () => {
  const { user } = usePrivy();
  const { data: positions } = useQuery({
    queryKey: ["feed", user?.id],
    queryFn: () => {
      return fetchFeedPage();
    },
  });

  return positions?.map((position) => {
    return (
      <PointCard
        className="w-full"
        key={position.id}
        amountSupporters={position.amountPledgers}
        body={position.description}
        createdAt={position.createdAt}
        favor={100}
        pledged={position.amountPledged}
        pointId={position.id}
        counterpointIds={[]}
        title={position.title}
        viewerContext={position.viewerContext}
      />
    );
  });
};
