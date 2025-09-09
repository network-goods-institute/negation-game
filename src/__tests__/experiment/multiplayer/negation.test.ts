import { isNegatedTargetOfHovered, isDirectNeighbor } from '@/utils/experiment/multiplayer/negation';

describe('isNegatedTargetOfHovered', () => {
  const edges = [
    { id: 'a', source: 'n1', target: 'n2', type: 'negation' },
    { id: 'b', source: 'n3', target: 'n2', type: 'objection' },
    { id: 'c', source: 'n2', target: 'n4', type: 'negation' },
  ] as any;

  it('returns true when hovered is negating candidate target', () => {
    expect(isNegatedTargetOfHovered('n1', 'n2', edges)).toBe(true);
  });

  it('returns false for reverse direction', () => {
    expect(isNegatedTargetOfHovered('n2', 'n1', edges)).toBe(false);
  });

  it('returns false for non-negation edge types', () => {
    expect(isNegatedTargetOfHovered('n3', 'n2', edges)).toBe(false);
  });

  it('returns false when nodes are the same', () => {
    expect(isNegatedTargetOfHovered('n2', 'n2', edges)).toBe(false);
  });

  it('isDirectNeighbor detects either direction and any type', () => {
    expect(isDirectNeighbor('n1', 'n2', edges)).toBe(true);
    expect(isDirectNeighbor('n2', 'n1', edges)).toBe(true);
    expect(isDirectNeighbor('n3', 'n2', edges)).toBe(true);
    expect(isDirectNeighbor('n2', 'n4', edges)).toBe(true);
    expect(isDirectNeighbor('n4', 'n1', edges)).toBe(false);
  });
});
