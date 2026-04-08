import React from 'react'
import { render } from '@testing-library/react'
import { EdgeArrowMarkers, getMarkerIdForEdgeType } from '../EdgeArrowMarkers'

describe('EdgeArrowMarkers', () => {
  it('renders triangular markers for all edge types', () => {
    const { container } = render(
      <svg>
        <EdgeArrowMarkers />
      </svg>
    )

    const objection = container.querySelector('marker#arrow-objection path')
    expect(objection).toBeTruthy()
    expect(objection?.getAttribute('fill')).toBe('#f97316')

    const negation = container.querySelector('marker#arrow-negation path')
    expect(negation).toBeTruthy()
    expect(negation?.getAttribute('fill')).toBe('#f43f5e')

    const support = container.querySelector('marker#arrow-support path')
    expect(support).toBeTruthy()
    expect(support?.getAttribute('fill')).toBe('#10b981')

    const primary = container.querySelector('marker#arrow-primary path')
    expect(primary).toBeTruthy()
    expect(primary?.getAttribute('fill')).toBe('hsl(var(--sync-primary))')

    const dark = container.querySelector('marker#arrow-dark-gray path')
    expect(dark).toBeTruthy()
    expect(dark?.getAttribute('fill')).toBe('#6b7280')
  })

  it('returns arrow-objection for objection edges', () => {
    expect(getMarkerIdForEdgeType('objection')).toBe('arrow-objection')
  })

  it('returns edge-specific markers for support and negation', () => {
    expect(getMarkerIdForEdgeType('support')).toBe('arrow-support')
    expect(getMarkerIdForEdgeType('negation')).toBe('arrow-negation')
  })
})
