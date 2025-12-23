import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { TutorialPanel } from '../TutorialPanel';

describe('TutorialPanel intro lock', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('unlocks after the countdown completes', () => {
    const onIntroComplete = jest.fn();
    render(
      <TutorialPanel
        isOpen={true}
        onClose={() => {}}
        lockIntro={true}
        introDurationMs={15000}
        onIntroComplete={onIntroComplete}
      />
    );

    const nextButton = screen.getByRole('button', { name: /Next/i });
    expect(nextButton).toBeDisabled();
    expect(nextButton).toHaveTextContent('15s');

    act(() => {
      jest.advanceTimersByTime(15000);
    });

    expect(onIntroComplete).toHaveBeenCalledTimes(1);
    expect(nextButton).not.toBeDisabled();
  });
});
