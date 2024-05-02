"use server";

import { getUserId } from "@/actions/getUserId";
import { db } from "@/services/database.service";
import { MongoPosition } from "@/types/mongodb/MongoPosition";
import { Timestamp } from "@/types/utils/Timestamp";

export interface FeedPosition {
  id: string;
  createdAt: number;
  createdBy: string;
  title: string;
  description: string;
  amountPledged: number;
  amountPledgers: number;
  viewerContext?: {
    pledged: number;
  };
}

export const fetchFeedPage = async (olderThan?: Timestamp) => {
  const viewerId = await getUserId();

  return await db(
    async (client) =>
      await client
        .db()
        .collection<MongoPosition>("positions")
        .aggregate<FeedPosition>([
          { $match: {} },
          { $sort: { _id: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: "pledges",
              let: { positionId: "$_id" },
              as: "pledges",
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$toPosition", "$$positionId"] },
                  },
                },
                {
                  $group: {
                    _id: null,
                    distinctPledgers: { $addToSet: "$fromUser" },
                    amountPledged: { $sum: "$pledged" },
                    ...(viewerId
                      ? {
                          viewerPledged: {
                            $sum: {
                              $cond: {
                                if: { $eq: ["$fromUser", viewerId] },
                                then: "$pledged",
                                else: 0,
                              },
                            },
                          },
                        }
                      : {}),
                  },
                },
                {
                  $project: {
                    _id: 0,
                    amountPledged: 1,
                    viewerPledged: 1,
                    amountPledgers: { $size: "$distinctPledgers" },
                  },
                },
              ],
            },
          },
          {
            $unwind: {
              path: "$pledges",
            },
          },
          {
            $project: {
              _id: 0,
              id: { $toString: "$_id" },
              createdAt: { $toLong: { $toDate: "$_id" } },
              createdBy: "$createdBy",
              title: 1,
              description: 1,
              amountPledged: "$pledges.amountPledged",
              amountPledgers: "$pledges.amountPledgers",
              ...(viewerId
                ? {
                    viewerContext: {
                      pledged: "$pledges.viewerPledged",
                    },
                  }
                : {}),
            },
          },
        ])
        .toArray()
  );
};
