import { createUpdateNodeType } from '../../graphOperations/nodeContent';

describe('createUpdateNodeType', () => {
  it('updates node type to comment and preserves content', () => {
    const setNodes = jest.fn((updater) => {
      const prev = [{ id: 'n1', type: 'point', data: { content: 'Hello' } }];
      const next = updater(prev);
      expect(next[0].type).toBe('comment');
      expect(next[0].data.content).toBe('Hello');
      return next;
    });

    const updateNodeType = createUpdateNodeType(null, null, null, true, {}, setNodes as any);
    updateNodeType('n1', 'comment');

    expect(setNodes).toHaveBeenCalled();
  });

  it('updates node type to statement and maps content correctly', () => {
    const setNodes = jest.fn((updater) => {
      const prev = [{ id: 'n1', type: 'point', data: { content: '' } }];
      const next = updater(prev);
      expect(next[0].type).toBe('statement');
      expect(next[0].data.statement).toBeTruthy();
      return next;
    });

    const updateNodeType = createUpdateNodeType(null, null, null, true, {}, setNodes as any);
    updateNodeType('n1', 'statement');

    expect(setNodes).toHaveBeenCalled();
  });
});

