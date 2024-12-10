"use server";

import { fetchPoints } from "@/actions/fetchPoints";

export const fetchPoint = async (id: number) => {
  return await fetchPoints([id]).then((points) => points[0]);
};
