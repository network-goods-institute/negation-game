import React from 'react'
import { render } from '@testing-library/react'
import { EdgeArrowMarkers, getMarkerIdForEdgeType } from '../EdgeArrowMarkers'

describe('EdgeArrowMarkers', () => {
  it('renders half-arrow markers with a single stroke and no fill', () => {
    const { container } = render(
      <svg>
        <EdgeArrowMarkers />
      </svg>
    )

    const gray = container.querySelector('marker#arrow-gray line, marker#arrow-gray path, marker#arrow-gray polyline')
    expect(gray).toBeTruthy()
    expect(gray?.getAttribute('stroke')).toBe('#9CA3AF')

    const primary = container.querySelector('marker#arrow-primary line, marker#arrow-primary path, marker#arrow-primary polyline')
    expect(primary).toBeTruthy()
    expect(primary?.getAttribute('stroke')).toBe('hsl(var(--sync-primary))')

    const dark = container.querySelector('marker#arrow-dark-gray line, marker#arrow-dark-gray path, marker#arrow-dark-gray polyline')
    expect(dark).toBeTruthy()
    expect(dark?.getAttribute('stroke')).toBe('#6b7280')
  })

  it('returns null for objection edge type', () => {
    expect(getMarkerIdForEdgeType('objection')).toBeNull()
  })
})
