import * as Y from 'yjs';
import { createUpdateNodesFromY } from '@/hooks/experiment/multiplayer/yjs/nodeSync';

describe('migration seeds statement text from legacy title node', () => {
  it('converts title->statement and seeds Y.Text + node data.statement', () => {
    const doc = new Y.Doc();
    const yNodes = doc.getMap<any>('nodes');
    const yText = doc.getMap<Y.Text>('node_text');

    yNodes.set('n1', { id: 'n1', type: 'title', position: { x: 0, y: 0 }, data: { content: 'Legacy Title' } });

    const yTextMapRef = { current: yText } as any;
    const lastNodesSigRef = { current: '' } as any;

    let latest: any[] = [];
    const setNodes = (updater: any) => { latest = updater([]); };

    const handler = createUpdateNodesFromY(
      yNodes as any,
      yTextMapRef as any,
      lastNodesSigRef as any,
      setNodes as any
    );

    // simulate a transaction; handler reads values directly
    handler(undefined as any, {} as any);

    const migrated = yNodes.get('n1');
    expect(migrated.type).toBe('statement');
    const seeded = yText.get('n1');
    expect(seeded).toBeInstanceOf(Y.Text);
    expect(seeded?.toString()).toBe('Legacy Title');

    const inState = latest.find((n) => n.id === 'n1');
    expect(inState?.type).toBe('statement');
    expect(inState?.data?.statement).toBe('Legacy Title');
  });
});

