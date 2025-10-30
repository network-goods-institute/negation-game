import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TypeSelectorDropdown } from '../../multiplayer/TypeSelectorDropdown';

describe('TypeSelectorDropdown', () => {
  it('renders Comment, Point, and Question options and selects Comment', () => {
    const onClose = jest.fn();
    const onSelect = jest.fn();

    render(
      <TypeSelectorDropdown
        open={true}
        x={100}
        y={100}
        onClose={onClose}
        onSelect={onSelect}
        currentType="point"
      />
    );

    expect(screen.getByText('Point')).toBeInTheDocument();
    expect(screen.getByText('Comment')).toBeInTheDocument();
    expect(screen.getByText('Question')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Comment'));
    expect(onSelect).toHaveBeenCalledWith('comment');
  });
});

