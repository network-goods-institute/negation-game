"use server";

import { SPACE_HEADER } from "@/constants/config";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

export const getSpace = async () => {
  const space = (await headers()).get(SPACE_HEADER);
  if (!space) notFound();

  return space;
};
