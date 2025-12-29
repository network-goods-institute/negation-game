import React from 'react';
import { act } from '@testing-library/react';
import { render } from '@/lib/tests/test-utils';
import { ToolsBar } from '../ToolsBar';
import { usePrivy } from '@privy-io/react-auth';
import { useUser } from '@/queries/users/useUser';
import { markTutorialVideoSeen } from '@/actions/users/markTutorialVideoSeen';

let lastTutorialProps: any = null;

jest.mock('../TutorialPanel', () => ({
  TutorialPanel: (props: any) => {
    lastTutorialProps = props;
    return <div data-testid="tutorial-panel" />;
  },
}));

jest.mock('@privy-io/react-auth', () => ({
  usePrivy: jest.fn(),
}));

jest.mock('@/queries/users/useUser', () => ({
  useUser: jest.fn(),
  userQueryKey: (id?: string) => ['user', id],
}));

jest.mock('@/actions/users/markTutorialVideoSeen', () => ({
  markTutorialVideoSeen: jest.fn(),
}));

describe('ToolsBar tutorial gate', () => {
  beforeEach(() => {
    lastTutorialProps = null;
    jest.clearAllMocks();
    if (typeof window !== "undefined") {
      window.localStorage.clear();
    }
  });

  const renderToolsBar = () =>
    render(
      <ToolsBar
        connectMode={false}
        setConnectMode={jest.fn()}
        setConnectAnchorId={jest.fn()}
        canUndo={false}
        canRedo={false}
        connectAnchorId={null}
        selectMode={true}
      />
    );

  it('locks the tutorial when the user has not seen the intro', () => {
    (usePrivy as jest.Mock).mockReturnValue({ user: { id: 'user-1' } });
    (useUser as jest.Mock).mockReturnValue({ data: { tutorialVideoSeenAt: null } });

    renderToolsBar();

    expect(lastTutorialProps).toBeTruthy();
    expect(lastTutorialProps.isOpen).toBe(true);
    expect(lastTutorialProps.lockIntro).toBe(true);
  });

  it('unlocks the tutorial when the user has already seen the intro', () => {
    (usePrivy as jest.Mock).mockReturnValue({ user: { id: 'user-1' } });
    (useUser as jest.Mock).mockReturnValue({ data: { tutorialVideoSeenAt: new Date() } });

    renderToolsBar();

    expect(lastTutorialProps).toBeTruthy();
    expect(lastTutorialProps.lockIntro).toBe(false);
  });

  it('marks the intro as seen when the countdown completes', async () => {
    (usePrivy as jest.Mock).mockReturnValue({ user: { id: 'user-1' } });
    (useUser as jest.Mock).mockReturnValue({ data: { tutorialVideoSeenAt: null } });
    (markTutorialVideoSeen as jest.Mock).mockResolvedValue({ ok: true });

    renderToolsBar();

    await act(async () => {
      await lastTutorialProps.onIntroComplete();
    });

    expect(markTutorialVideoSeen).toHaveBeenCalledTimes(1);
  });

  it('unlocks the tutorial when local storage marks the intro as seen', async () => {
    (usePrivy as jest.Mock).mockReturnValue({ user: { id: 'user-1' } });
    (useUser as jest.Mock).mockReturnValue({ data: { tutorialVideoSeenAt: null } });
    window.localStorage.setItem("ng:tutorial-intro-seen", "true");

    renderToolsBar();

    await act(async () => {
      await Promise.resolve();
    });
    expect(lastTutorialProps).toBeTruthy();
    expect(lastTutorialProps.lockIntro).toBe(false);
  });
});
