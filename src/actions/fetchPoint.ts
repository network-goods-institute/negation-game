"use server";

import { fetchPoints } from "@/actions/fetchPoints";

export const fetchPoint = async (id: number) => {
  const points = await fetchPoints([id]);
  return points.length > 0 ? points[0] : null;
};
