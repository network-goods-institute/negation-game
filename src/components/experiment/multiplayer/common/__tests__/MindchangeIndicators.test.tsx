import React from 'react';
import { render, screen } from '@testing-library/react';
import { MindchangeIndicators } from '../MindchangeIndicators';

describe('MindchangeIndicators', () => {
  const OLD_ENV = process.env as any;
  beforeEach(() => {
    jest.resetModules();
    (process as any).env = { ...OLD_ENV, NEXT_PUBLIC_ENABLE_MINDCHANGE: 'true' };
  });
  afterAll(() => {
    (process as any).env = OLD_ENV;
  });
  const mockMindchange = {
    forward: { average: 50, count: 3 },
    backward: { average: -30, count: 2 },
  };

  it('renders forward indicator with correct value', () => {
    render(<MindchangeIndicators edgeId="edge1" mindchange={mockMindchange} />);

    expect(screen.getByText('+50%')).toBeInTheDocument();
  });

  it('renders backward indicator with correct value', () => {
    render(<MindchangeIndicators edgeId="edge1" mindchange={mockMindchange} />);

    expect(screen.getByText('-30%')).toBeInTheDocument();
  });

  it('displays loading state when data is not available', () => {
    const emptyMindchange = {
      forward: { average: 0, count: 0 },
      backward: { average: 0, count: 0 },
    };

    render(<MindchangeIndicators edgeId="edge1" mindchange={emptyMindchange} />);

    const loadingIndicators = screen.getAllByText('…');
    expect(loadingIndicators.length).toBeGreaterThan(0);
  });

  it('renders indicators with correct positioning classes', () => {
    const { container } = render(
      <MindchangeIndicators edgeId="edge1" mindchange={mockMindchange} />
    );

    const indicators = container.querySelectorAll('.absolute');
    expect(indicators.length).toBe(2);

    // Check for left and right positioning
    expect(container.querySelector('.-left-14')).toBeInTheDocument();
    expect(container.querySelector('.-right-14')).toBeInTheDocument();
  });

  it('applies correct styling to indicator circles', () => {
    const { container } = render(
      <MindchangeIndicators edgeId="edge1" mindchange={mockMindchange} />
    );

    const circles = container.querySelectorAll('.rounded-full');
    expect(circles.length).toBe(2);

    circles.forEach((circle) => {
      expect(circle).toHaveClass('h-10');
      expect(circle).toHaveClass('w-10');
      expect(circle).toHaveClass('border-2');
      expect(circle).toHaveClass('border-gray-200');
      expect(circle).toHaveClass('bg-white');
      expect(circle).toHaveClass('shadow-lg');
    });
  });

  it('handles positive values with + sign', () => {
    const positiveMindchange = {
      forward: { average: 75, count: 5 },
      backward: { average: 25, count: 3 },
    };

    render(<MindchangeIndicators edgeId="edge1" mindchange={positiveMindchange} />);

    expect(screen.getByText('+75%')).toBeInTheDocument();
    expect(screen.getByText('+25%')).toBeInTheDocument();
  });

  it('handles negative values without double negative', () => {
    const negativeMindchange = {
      forward: { average: -50, count: 2 },
      backward: { average: -80, count: 4 },
    };

    render(<MindchangeIndicators edgeId="edge1" mindchange={negativeMindchange} />);

    expect(screen.getByText('-50%')).toBeInTheDocument();
    expect(screen.getByText('-80%')).toBeInTheDocument();
  });

  it('rounds average values', () => {
    const decimalMindchange = {
      forward: { average: 45.7, count: 3 },
      backward: { average: -33.4, count: 2 },
    };

    render(<MindchangeIndicators edgeId="edge1" mindchange={decimalMindchange} />);

    expect(screen.getByText('+46%')).toBeInTheDocument();
    expect(screen.getByText('-33%')).toBeInTheDocument();
  });

  it('handles zero values correctly', () => {
    const zeroMindchange = {
      forward: { average: 0, count: 1 },
      backward: { average: 0, count: 1 },
    };

    render(<MindchangeIndicators edgeId="edge1" mindchange={zeroMindchange} />);

    // When average is 0 and count > 0, it shows "…" (loading/no cached data)
    const loadingIndicators = screen.getAllByText('…');
    expect(loadingIndicators.length).toBeGreaterThan(0);
  });
});
