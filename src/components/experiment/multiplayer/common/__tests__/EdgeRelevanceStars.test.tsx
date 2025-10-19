import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EdgeRelevanceStars } from '../EdgeRelevanceStars';

describe('EdgeRelevanceStars', () => {
  const mockOnUpdateRelevance = jest.fn();
  const mockOnConnectionAwareClick = jest.fn((e, action) => action());

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders 5 stars for non-support/negation edges', () => {
    render(
      <EdgeRelevanceStars
        relevance={3}
        starColor="text-stone-600"
        onUpdateRelevance={mockOnUpdateRelevance}
        onConnectionAwareClick={mockOnConnectionAwareClick}
      />
    );

    const stars = screen.getAllByText('★');
    expect(stars).toHaveLength(5);
  });

  it('renders + and - symbols for support/negation edges', () => {
    render(
      <EdgeRelevanceStars
        relevance={3}
        edgeType="support"
        starColor="text-stone-600"
        onUpdateRelevance={mockOnUpdateRelevance}
        onConnectionAwareClick={mockOnConnectionAwareClick}
      />
    );

    const pluses = screen.getAllByText('+');
    expect(pluses).toHaveLength(5);
  });

  it('renders minus symbols for negation edges', () => {
    render(
      <EdgeRelevanceStars
        relevance={3}
        edgeType="negation"
        starColor="text-stone-600"
        onUpdateRelevance={mockOnUpdateRelevance}
        onConnectionAwareClick={mockOnConnectionAwareClick}
      />
    );

    const minuses = screen.getAllByText('-');
    expect(minuses).toHaveLength(5);
  });

  it('highlights correct number of stars based on relevance', () => {
    const { container } = render(
      <EdgeRelevanceStars
        relevance={3}
        starColor="text-stone-600"
        onUpdateRelevance={mockOnUpdateRelevance}
        onConnectionAwareClick={mockOnConnectionAwareClick}
      />
    );

    const buttons = container.querySelectorAll('button');
    expect(buttons[0].querySelector('span')).toHaveClass('text-stone-600');
    expect(buttons[1].querySelector('span')).toHaveClass('text-stone-600');
    expect(buttons[2].querySelector('span')).toHaveClass('text-stone-600');
    expect(buttons[3].querySelector('span')).toHaveClass('text-gray-300');
    expect(buttons[4].querySelector('span')).toHaveClass('text-gray-300');
  });

  it('calls onUpdateRelevance when star is clicked', () => {
    const { container } = render(
      <EdgeRelevanceStars
        relevance={3}
        starColor="text-stone-600"
        onUpdateRelevance={mockOnUpdateRelevance}
        onConnectionAwareClick={mockOnConnectionAwareClick}
      />
    );

    const fourthButton = container.querySelectorAll('button')[3];
    fireEvent.click(fourthButton);

    expect(mockOnUpdateRelevance).toHaveBeenCalledWith(4);
  });

  it('displays "Relevance:" label for non-support/negation edges', () => {
    render(
      <EdgeRelevanceStars
        relevance={3}
        starColor="text-stone-600"
        onUpdateRelevance={mockOnUpdateRelevance}
        onConnectionAwareClick={mockOnConnectionAwareClick}
      />
    );

    expect(screen.getByText('Relevance:')).toBeInTheDocument();
  });

  it('does not display "Relevance:" label for support edges', () => {
    render(
      <EdgeRelevanceStars
        relevance={3}
        edgeType="support"
        starColor="text-stone-600"
        onUpdateRelevance={mockOnUpdateRelevance}
        onConnectionAwareClick={mockOnConnectionAwareClick}
      />
    );

    expect(screen.queryByText('Relevance:')).not.toBeInTheDocument();
  });

  it('shows tooltip on hover', () => {
    render(
      <EdgeRelevanceStars
        relevance={3}
        starColor="text-stone-600"
        onUpdateRelevance={mockOnUpdateRelevance}
        onConnectionAwareClick={mockOnConnectionAwareClick}
      />
    );

    const firstButton = screen.getAllByRole('button')[0];
    expect(firstButton).toHaveAttribute('title', 'Set relevance to 1');
  });
});
