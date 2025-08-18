"use server";

import { db } from "@/services/db";
import { experimentalGraphDocsTable } from "@/db/schema";
import { getSpace } from "@/actions/spaces/getSpace";
import { getUserId } from "@/actions/users/getUserId";
import { nanoid } from "nanoid";

export interface CreateExperimentalDocArgs {
  title?: string;
}

export async function createExperimentalDoc({
  title,
}: CreateExperimentalDocArgs = {}) {
  const [userId, space] = await Promise.all([getUserId(), getSpace()]);
  if (!userId) throw new Error("Must be authenticated");
  if (!space) throw new Error("Space not resolved");

  const id = nanoid();
  const initialDoc = {
    version: 1,
    shapes: [],
    bindings: [],
    assets: [],
    meta: { font: "Roboto Slab", theme: "experimental" },
  } as const;

  await db.insert(experimentalGraphDocsTable).values({
    id,
    space,
    title: title || "Untitled Experimental Rationale",
    doc: initialDoc as any,
    createdBy: userId,
  });

  return { id };
}