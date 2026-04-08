import { EDGE_CONFIGURATIONS } from '../EdgeConfiguration'

describe('EdgeConfiguration', () => {
  it('uses the support toggle palette for support edges', () => {
    expect(EDGE_CONFIGURATIONS.support.visual.stroke).toBe('#10b981')
    expect(EDGE_CONFIGURATIONS.support.visual.borderColor).toBe('#10b981')
    expect(EDGE_CONFIGURATIONS.support.visual.starColor).toBe('text-emerald-600')
    expect(EDGE_CONFIGURATIONS.support.visual.gradientStops).toEqual([
      { offset: '0%', stopColor: '#34d399', stopOpacity: 0.18 },
      { offset: '100%', stopColor: '#10b981', stopOpacity: 0.18 },
    ])
  })

  it('uses the negation toggle palette for negation edges', () => {
    expect(EDGE_CONFIGURATIONS.negation.visual.stroke).toBe('#f43f5e')
    expect(EDGE_CONFIGURATIONS.negation.visual.borderColor).toBe('#f43f5e')
    expect(EDGE_CONFIGURATIONS.negation.visual.starColor).toBe('text-rose-600')
    expect(EDGE_CONFIGURATIONS.negation.visual.gradientStops).toEqual([
      { offset: '0%', stopColor: '#fb7185', stopOpacity: 0.18 },
      { offset: '100%', stopColor: '#f43f5e', stopOpacity: 0.18 },
    ])
  })
})
