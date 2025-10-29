import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EdgeTypeToggle } from '../EdgeTypeToggle';

describe('EdgeTypeToggle', () => {
  const mockOnToggle = jest.fn();
  const mockOnMouseEnter = jest.fn();
  const mockOnMouseLeave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders "Supports" label for support edge type', () => {
    render(
      <EdgeTypeToggle
        edgeType="support"
        onToggle={mockOnToggle}
        onMouseEnter={mockOnMouseEnter}
        onMouseLeave={mockOnMouseLeave}
      />
    );

    expect(screen.getByText('Supports')).toBeInTheDocument();
  });

  it('renders "Negates" label for negation edge type', () => {
    render(
      <EdgeTypeToggle
        edgeType="negation"
        onToggle={mockOnToggle}
        onMouseEnter={mockOnMouseEnter}
        onMouseLeave={mockOnMouseLeave}
      />
    );

    expect(screen.getByText('Negates')).toBeInTheDocument();
  });

  it('applies emerald gradient for support edge', () => {
    const { container } = render(
      <EdgeTypeToggle
        edgeType="support"
        onToggle={mockOnToggle}
        onMouseEnter={mockOnMouseEnter}
        onMouseLeave={mockOnMouseLeave}
      />
    );

    const toggle = container.querySelector('[role="button"]');
    expect(toggle).toHaveClass('bg-gradient-to-r');
    expect(toggle).toHaveClass('from-emerald-400');
    expect(toggle).toHaveClass('to-emerald-500');
  });

  it('applies rose gradient for negation edge', () => {
    const { container } = render(
      <EdgeTypeToggle
        edgeType="negation"
        onToggle={mockOnToggle}
        onMouseEnter={mockOnMouseEnter}
        onMouseLeave={mockOnMouseLeave}
      />
    );

    const toggle = container.querySelector('[role="button"]');
    expect(toggle).toHaveClass('bg-gradient-to-r');
    expect(toggle).toHaveClass('from-rose-400');
    expect(toggle).toHaveClass('to-rose-500');
  });

  it('calls onToggle when clicked', () => {
    const { container } = render(
      <EdgeTypeToggle
        edgeType="support"
        onToggle={mockOnToggle}
        onMouseEnter={mockOnMouseEnter}
        onMouseLeave={mockOnMouseLeave}
      />
    );

    const toggle = container.querySelector('[role="button"]');
    fireEvent.click(toggle!);

    expect(mockOnToggle).toHaveBeenCalledTimes(1);
  });

  it('calls onMouseEnter when mouse enters', () => {
    const { container } = render(
      <EdgeTypeToggle
        edgeType="support"
        onToggle={mockOnToggle}
        onMouseEnter={mockOnMouseEnter}
        onMouseLeave={mockOnMouseLeave}
      />
    );

    const toggle = container.querySelector('[role="button"]');
    fireEvent.mouseEnter(toggle!);

    expect(mockOnMouseEnter).toHaveBeenCalledTimes(1);
  });

  it('calls onMouseLeave when mouse leaves', () => {
    const { container } = render(
      <EdgeTypeToggle
        edgeType="support"
        onToggle={mockOnToggle}
        onMouseEnter={mockOnMouseEnter}
        onMouseLeave={mockOnMouseLeave}
      />
    );

    const toggle = container.querySelector('[role="button"]');
    fireEvent.mouseLeave(toggle!);

    expect(mockOnMouseLeave).toHaveBeenCalledTimes(1);
  });

  it('positions toggle knob correctly for support edge', () => {
    const { container } = render(
      <EdgeTypeToggle
        edgeType="support"
        onToggle={mockOnToggle}
        onMouseEnter={mockOnMouseEnter}
        onMouseLeave={mockOnMouseLeave}
      />
    );

    const knob = container.querySelector('.translate-x-5');
    expect(knob).toBeInTheDocument();
  });

  it('positions toggle knob correctly for negation edge', () => {
    const { container } = render(
      <EdgeTypeToggle
        edgeType="negation"
        onToggle={mockOnToggle}
        onMouseEnter={mockOnMouseEnter}
        onMouseLeave={mockOnMouseLeave}
      />
    );

    const knob = container.querySelector('.translate-x-0\\.5');
    expect(knob).toBeInTheDocument();
  });
});
