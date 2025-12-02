"use server";

import type { VoterData } from "@/types/voters";
import { getVotersByIds } from "@/services/users/getVotersByIds";

export async function fetchVoters(userIds: string[]): Promise<VoterData[]> {
  return getVotersByIds(userIds);
}
