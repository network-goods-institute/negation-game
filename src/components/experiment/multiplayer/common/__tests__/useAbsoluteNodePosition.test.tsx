import React from 'react'
import { render } from '@testing-library/react'
import { useAbsoluteNodePosition } from '../useAbsoluteNodePosition'

jest.mock('@xyflow/react', () => {
  let nodes: Record<string, any> = {}
  return {
    useReactFlow: () => ({
      getNode: (id: string) => nodes[id],
    }),
    __setNodes: (next: Record<string, any>) => { nodes = next },
  }
})

const setNodes = (map: Record<string, any>) => {
  ;(require('@xyflow/react') as any).__setNodes(map)
}

const TestProbe: React.FC<{ probe: (vals: any) => void, compute: (api: ReturnType<typeof useAbsoluteNodePosition>) => any }> = ({ probe, compute }) => {
  const api = useAbsoluteNodePosition()
  const vals = compute(api)
  React.useEffect(() => { probe(vals) }, [probe, vals])
  return <div />
}

describe('useAbsoluteNodePosition', () => {
  test('ellipse position uses absolute coordinates with padding', () => {
    setNodes({ parent: { id: 'parent', position: { x: 100, y: 200 } } })
    const node = { id: 'child', parentId: 'parent', position: { x: 30, y: 40 }, measured: { width: 50, height: 20 } }
    const probe = jest.fn()
    render(<TestProbe probe={probe} compute={({ getEllipsePosition }) => getEllipsePosition(node, true)} />)
    const { cx, cy, rx, ry } = probe.mock.calls[0][0]
    expect(cx).toBe(155)
    expect(cy).toBe(250)
    expect(rx).toBe(33)
    expect(ry).toBe(18)
  })

  test('rect position uses absolute coordinates with padding', () => {
    setNodes({})
    const node = { id: 'solo', position: { x: 10, y: 20 }, measured: { width: 100, height: 40 } }
    const probe = jest.fn()
    render(<TestProbe probe={probe} compute={({ getRectPosition }) => getRectPosition(node, true)} />)
    const { x, y, width, height } = probe.mock.calls[0][0]
    expect(x).toBe(6)
    expect(y).toBe(16)
    expect(width).toBe(108)
    expect(height).toBe(48)
  })
})

