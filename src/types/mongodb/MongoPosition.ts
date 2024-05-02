import { Document } from "mongodb";

export interface MongoPosition extends Document {
  title: string;
  description: string;
  createdBy: string;
}
