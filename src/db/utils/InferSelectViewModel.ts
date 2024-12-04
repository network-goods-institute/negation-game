import { Equal, View } from "drizzle-orm";
import { SelectResult } from "drizzle-orm/query-builders/select.types";

export type InferSelectViewModel<TView extends View> =
  Equal<TView["_"]["selectedFields"], { [x: string]: unknown }> extends true
    ? { [x: string]: unknown }
    : SelectResult<
        TView["_"]["selectedFields"],
        "single",
        Record<TView["_"]["name"], "not-null">
      >;