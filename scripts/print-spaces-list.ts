/**
 * This script simply prints out the current spaces in the static list
 * without attempting to connect to the database.
 *
 * Run this script with:
 * pnpm tsx scripts/print-spaces-list.ts
 */

import { VALID_SPACE_IDS } from "../src/lib/negation-game/staticSpacesList";

// Sort the spaces alphabetically for better readability
const spaces = Array.from(VALID_SPACE_IDS).sort();

console.log("Current spaces in the static list:");
console.log("----------------------------------");
spaces.forEach((space, index) => {
  console.log(`${index + 1}. ${space}`);
});
console.log("----------------------------------");
console.log(`Total: ${spaces.length} spaces`);
console.log("\nTo update this list, run: pnpm update-spaces");
