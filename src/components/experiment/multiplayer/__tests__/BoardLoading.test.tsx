import React from 'react';
import { render, screen } from '@testing-library/react';
import { BoardLoading } from '../BoardLoading';

describe('BoardLoading', () => {
  it('renders loading message', () => {
    render(<BoardLoading />);

    expect(screen.getByText('Loading board…')).toBeInTheDocument();
  });

  it('displays spinner animation', () => {
    const { container } = render(<BoardLoading />);

    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('has proper styling for loading container', () => {
    const { container } = render(<BoardLoading />);

    const mainContainer = container.firstChild;
    expect(mainContainer).toHaveClass('fixed');
    expect(mainContainer).toHaveClass('inset-0');
    expect(mainContainer).toHaveClass('top-16');
    expect(mainContainer).toHaveClass('z-[2000]');
  });

  it('renders solid background', () => {
    const { container } = render(<BoardLoading />);

    const mainContainer = container.firstChild as HTMLElement;
    expect(mainContainer.style.backgroundColor).toBe('rgb(249, 250, 251)');
  });

  it('centers content in viewport', () => {
    const { container } = render(<BoardLoading />);

    const mainContainer = container.firstChild;
    expect(mainContainer).toHaveClass('flex');
    expect(mainContainer).toHaveClass('items-center');
    expect(mainContainer).toHaveClass('justify-center');
  });

  it('renders spinner with correct styling', () => {
    const { container } = render(<BoardLoading />);

    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toHaveClass('w-6');
    expect(spinner).toHaveClass('h-6');
    expect(spinner).toHaveClass('border-4');
    expect(spinner).toHaveClass('border-blue-500');
  });
});
