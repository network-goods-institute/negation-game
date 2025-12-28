const originalNotifications = process.env.NEXT_PUBLIC_FEATURE_NOTIFICATIONS_ENABLED;
const originalMpNotifications = process.env.NEXT_PUBLIC_FEATURE_MP_NOTIFICATIONS_ENABLED;

afterEach(() => {
  if (originalNotifications === undefined) {
    delete process.env.NEXT_PUBLIC_FEATURE_NOTIFICATIONS_ENABLED;
  } else {
    process.env.NEXT_PUBLIC_FEATURE_NOTIFICATIONS_ENABLED = originalNotifications;
  }

  if (originalMpNotifications === undefined) {
    delete process.env.NEXT_PUBLIC_FEATURE_MP_NOTIFICATIONS_ENABLED;
  } else {
    process.env.NEXT_PUBLIC_FEATURE_MP_NOTIFICATIONS_ENABLED = originalMpNotifications;
  }
});

describe('featureFlags', () => {
  it('defaults multiplayer notifications to enabled', async () => {
    delete process.env.NEXT_PUBLIC_FEATURE_MP_NOTIFICATIONS_ENABLED;
    jest.resetModules();
    const { isFeatureEnabled } = await import('@/lib/featureFlags');
    expect(isFeatureEnabled('mpNotifications')).toBe(true);
  });

  it('disables multiplayer notifications when env is false', async () => {
    process.env.NEXT_PUBLIC_FEATURE_MP_NOTIFICATIONS_ENABLED = 'false';
    jest.resetModules();
    const { isFeatureEnabled } = await import('@/lib/featureFlags');
    expect(isFeatureEnabled('mpNotifications')).toBe(false);
  });
});
