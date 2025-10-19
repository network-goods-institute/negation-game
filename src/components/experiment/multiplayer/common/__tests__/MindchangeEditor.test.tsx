import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MindchangeEditor } from '../MindchangeEditor';

describe('MindchangeEditor', () => {
  const mockOnValueChange = jest.fn();
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders input with current value', () => {
    render(
      <MindchangeEditor
        value={50}
        isSaving={false}
        onValueChange={mockOnValueChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    expect(input.value).toBe('50');
  });

  it('calls onValueChange when input changes', () => {
    render(
      <MindchangeEditor
        value={50}
        isSaving={false}
        onValueChange={mockOnValueChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '75' } });

    expect(mockOnValueChange).toHaveBeenCalledWith(75);
  });

  it('clamps value to 0-100 range', () => {
    render(
      <MindchangeEditor
        value={50}
        isSaving={false}
        onValueChange={mockOnValueChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const input = screen.getByRole('spinbutton');

    fireEvent.change(input, { target: { value: '150' } });
    expect(mockOnValueChange).toHaveBeenCalledWith(100);

    fireEvent.change(input, { target: { value: '-10' } });
    expect(mockOnValueChange).toHaveBeenCalledWith(0);
  });

  it('toggles between preset values when toggle button is clicked', () => {
    render(
      <MindchangeEditor
        value={50}
        isSaving={false}
        onValueChange={mockOnValueChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const toggleButton = screen.getAllByRole('button')[0];
    fireEvent.click(toggleButton);

    expect(mockOnValueChange).toHaveBeenCalledWith(100);
  });

  it('displays Save button and calls onSave', () => {
    render(
      <MindchangeEditor
        value={50}
        isSaving={false}
        onValueChange={mockOnValueChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    expect(mockOnSave).toHaveBeenCalledTimes(1);
  });

  it('displays Cancel button and calls onCancel', () => {
    render(
      <MindchangeEditor
        value={50}
        isSaving={false}
        onValueChange={mockOnValueChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('disables buttons and shows loading state when saving', () => {
    render(
      <MindchangeEditor
        value={50}
        isSaving={true}
        onValueChange={mockOnValueChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Saving...')).toBeInTheDocument();

    const saveButton = screen.getByText('Saving...');
    const cancelButton = screen.getByText('Cancel');

    expect(saveButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it('displays emerald gradient for support edge type', () => {
    const { container } = render(
      <MindchangeEditor
        value={50}
        isSaving={false}
        edgeType="support"
        onValueChange={mockOnValueChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const visualIndicator = container.querySelector('.bg-gradient-to-t.from-emerald-500');
    expect(visualIndicator).toBeInTheDocument();
  });

  it('displays rose gradient for negation edge type', () => {
    const { container } = render(
      <MindchangeEditor
        value={50}
        isSaving={false}
        edgeType="negation"
        onValueChange={mockOnValueChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const visualIndicator = container.querySelector('.bg-gradient-to-t.from-rose-500');
    expect(visualIndicator).toBeInTheDocument();
  });

  it('visual indicator height matches value percentage', () => {
    const { container } = render(
      <MindchangeEditor
        value={75}
        isSaving={false}
        onValueChange={mockOnValueChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const visualIndicator = container.querySelector('.bg-gradient-to-t');
    expect(visualIndicator).toHaveStyle({ height: '75%' });
  });
});
