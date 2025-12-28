import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TutorialPanel } from '../TutorialPanel';

jest.mock('../tutorial/animations/EditingPointAnimation', () => ({
  EditingPointAnimation: () => <div data-testid="editing-animation" />,
}));
jest.mock('../tutorial/animations/SupportNegationAnimation', () => ({
  SupportNegationAnimation: () => <div data-testid="support-negation-animation" />,
}));
jest.mock('../tutorial/animations/ConnectionModeAnimation', () => ({
  ConnectionModeAnimation: () => <div data-testid="connection-animation" />,
}));
jest.mock('../tutorial/animations/MitigationAnimation', () => ({
  MitigationAnimation: () => <div data-testid="mitigation-animation" />,
}));

describe('TutorialPanel steps', () => {
  it('hides key points on the intro step', () => {
    render(<TutorialPanel isOpen={true} onClose={() => {}} />);

    expect(screen.getByText('Welcome to Negation Game')).toBeInTheDocument();
    expect(screen.queryByText('Key Ideas')).not.toBeInTheDocument();
  });

  it('navigates to the mitigation step', async () => {
    const user = userEvent.setup();
    render(<TutorialPanel isOpen={true} onClose={() => {}} />);

    for (let i = 0; i < 4; i += 1) {
      await user.click(screen.getByRole('button', { name: /Next/i }));
    }

    expect(screen.getByText('Mitigations')).toBeInTheDocument();
    expect(screen.getByText('Step 5 of 5')).toBeInTheDocument();
  });
});
