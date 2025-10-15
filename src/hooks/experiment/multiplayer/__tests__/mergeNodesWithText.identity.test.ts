import * as Y from 'yjs';
import type { Node } from '@xyflow/react';
import { mergeNodesWithText } from '../yjs/text';

const makeNode = (id: string, x: number, y: number, data?: Record<string, unknown>): Node => ({
  id,
  type: 'point',
  position: { x, y },
  data: { content: '', ...(data || {}) },
});

describe('mergeNodesWithText preserves identity for unchanged nodes', () => {
  it('keeps previous object for unaffected node when another node position changes', () => {
    const doc = new Y.Doc();
    const yText = doc.getMap<Y.Text>('node_text');
    const tA = new Y.Text();
    tA.insert(0, 'Alpha');
    const tB = new Y.Text();
    tB.insert(0, 'Bravo');
    yText.set('a', tA);
    yText.set('b', tB);

    const prevA: Node = {
      ...makeNode('a', 0, 0, { content: 'Alpha' }),
      selected: true,
      draggable: true,
      // preserve style to ensure it is carried forward
      style: { zIndex: 999 },
    };
    const prevB: Node = {
      ...makeNode('b', 100, 100, { content: 'Bravo' }),
      selected: false,
      draggable: true,
    };

    const prevById = new Map<string, Node>([
      ['a', prevA],
      ['b', prevB],
    ]);

    // Incoming Yjs nodes: only B moved
    const incoming: Node[] = [
      makeNode('a', 0, 0, { content: 'Alpha' }),
      makeNode('b', 120, 140, { content: 'Bravo' }),
    ];

    const merged = mergeNodesWithText(incoming, yText, prevById, () => false);

    const aNext = merged.find((n) => n.id === 'a')!;
    const bNext = merged.find((n) => n.id === 'b')!;

    expect(aNext).toBe(prevA);
    expect(bNext).not.toBe(prevB);
    expect(aNext.selected).toBe(true);
    expect((aNext as any).style?.zIndex).toBe(999);
    expect(bNext.position).toEqual({ x: 120, y: 140 });
  });
});
