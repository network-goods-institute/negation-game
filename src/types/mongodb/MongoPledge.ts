import { UserId } from "@/types/Ids";
import { Document, ObjectId } from "mongodb";

export interface MongoPledge extends Document {
  fromUser: UserId;
  toPosition: ObjectId;
  pledged: number;
}
