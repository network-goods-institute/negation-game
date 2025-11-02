import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BoardNotFound } from '../BoardNotFound';
import { useRouter } from 'next/navigation';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('BoardNotFound', () => {
  const mockPush = jest.fn();
  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({
      push: mockPush,
    } as any);
  });

  it('renders not found message', () => {
    render(<BoardNotFound />);

    expect(screen.getByText('Board Not Found')).toBeInTheDocument();
    expect(screen.getByText(/doesn't exist or may have been deleted/i)).toBeInTheDocument();
  });

  it('displays navigation button', () => {
    render(<BoardNotFound />);

    expect(screen.getByText('Go to Boards List')).toBeInTheDocument();
  });

  it('navigates to boards list when button is clicked', () => {
    render(<BoardNotFound />);

    const button = screen.getByText('Go to Boards List');
    fireEvent.click(button);

    expect(mockPush).toHaveBeenCalledWith('/experiment/rationale/multiplayer');
  });

  it('has proper styling classes', () => {
    const { container } = render(<BoardNotFound />);

    const mainContainer = container.firstChild;
    expect(mainContainer).toHaveClass('fixed');
    expect(mainContainer).toHaveClass('inset-0');
    expect(mainContainer).toHaveClass('top-16');
    expect(mainContainer).toHaveClass('bg-gray-50');
  });

  it('renders content card with shadow', () => {
    const { container } = render(<BoardNotFound />);

    const card = container.querySelector('.shadow-sm');
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass('bg-white');
    expect(card).toHaveClass('rounded-lg');
    expect(card).toHaveClass('border');
  });
});
