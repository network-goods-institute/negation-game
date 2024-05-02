import { UserId } from "@/types/entities/User";
import { Document, ObjectId } from "mongodb";

export interface MongoPledge extends Document {
  fromUser: UserId;
  toPosition: ObjectId;
  pledged: number;
}
