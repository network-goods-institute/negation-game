import { Point } from "@/db/schema";

export const formatPointForEmbedding = ({
  title,
  content,
}: Pick<Point, "content" | "title">) => `#${title}\n${content}`;
