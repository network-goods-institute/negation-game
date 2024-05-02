"use server";

import { getUserId } from "@/actions/getUserId";
import { PositionData } from "@/schemas/PositionSchema";
import { dbTransaction } from "@/services/database.service";
import { PositionId } from "@/types/entities/Position";
import { MongoPledge } from "@/types/mongodb/MongoPledge";
import { MongoPosition } from "@/types/mongodb/MongoPosition";

export const addPosition = async ({
  pledge,
  ...data
}: PositionData): Promise<PositionId> => {
  const userId = await getUserId();

  if (!userId) {
    throw new Error("Must be authenticated to add a position");
  }

  return await dbTransaction(async (client) => {
    const { insertedId: positionId } = await client
      .db()
      .collection<MongoPosition>("positions")
      .insertOne({ ...data, createdBy: userId });

    await client.db().collection<MongoPledge>("pledges").insertOne({
      fromUser: userId,
      toPosition: positionId,
      pledged: pledge,
    });

    return positionId.toString();
  });
};
