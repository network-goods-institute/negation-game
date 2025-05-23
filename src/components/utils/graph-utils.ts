export function calculateInitialLayout(
  parentX: number,
  parentY: number,
  parentHeight: number,
  count: number,
  spacing = 250,
  verticalOffset = 200
): Array<{ x: number; y: number }> {
  if (count === 0) return [];
  if (count === 1) {
    return [{ x: parentX, y: parentY + parentHeight + verticalOffset }];
  }
  const positions: Array<{ x: number; y: number }> = [];
  const totalWidth = (count - 1) * spacing;
  const startX = parentX - totalWidth / 2;
  const dynamicOffset = verticalOffset + (count > 2 ? (count - 2) * 50 : 0);
  for (let i = 0; i < count; i++) {
    const progress = count > 1 ? i / (count - 1) : 0;
    const x = startX + progress * totalWidth;
    const arcHeight = 60 * Math.sin(Math.PI * progress);
    const horizontalVariation = (progress - 0.5) * 30;
    const y = parentY + parentHeight + dynamicOffset + arcHeight;
    positions.push({ x: x + horizontalVariation, y });
  }
  return positions;
}

export function findPathsBetweenPoints(
  startId: number,
  endId: number,
  relationMap: Map<
    number,
    { parentIds: Set<string | number>; childIds: Set<number> }
  >
): number[][] {
  const paths: number[][] = [];
  const visited = new Set<number>();
  function dfs(currentId: number, path: number[]) {
    if (currentId === endId) {
      paths.push([...path, currentId]);
      return;
    }
    visited.add(currentId);
    const relation = relationMap.get(currentId);
    if (relation) {
      for (const childId of relation.childIds) {
        if (!visited.has(childId)) {
          dfs(childId, [...path, currentId]);
        }
      }
    }
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    visited.delete(currentId);
  }
  dfs(startId, []);
  return paths;
}

export function findPathsInGraph(
  edges: any[],
  startId: string,
  endId: string
): number[][] {
  const paths: number[][] = [];
  const visited = new Set<string>();
  function dfs(currentId: string, path: string[]): void {
    if (currentId === endId) {
      paths.push([...path.map((id) => parseInt(id))]);
      return;
    }
    visited.add(currentId);
    const neighbors = edges
      .filter((edge) => edge.source === currentId)
      .map((edge) => edge.target);
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...path, neighbor]);
      }
    }
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    visited.delete(currentId);
  }
  dfs(startId, [startId]);
  return paths;
}
