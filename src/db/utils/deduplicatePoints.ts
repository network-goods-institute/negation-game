/**
 * Utility function to deduplicate points by pointId
 * Used to prevent duplicate entries when complex joins or subqueries might return duplicates
 *
 * @param points An array of point objects, each containing at least a pointId property
 * @returns A deduplicated array with only unique points
 */
export function deduplicatePoints<T extends { pointId: number }>(
  points: T[]
): T[] {
  // Deduplicate points by using a Map with pointId as the key
  const pointMap = new Map<number, T>();

  // First pass to collect unique points
  points.forEach((point) => {
    pointMap.set(point.pointId, { ...point });
  });

  // Convert map to array
  return Array.from(pointMap.values());
}
