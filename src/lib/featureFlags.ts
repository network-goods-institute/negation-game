/**
 * Feature flags configuration
 *
 * Feature flags can be controlled via environment variables:
 * - NEXT_PUBLIC_FEATURE_NOTIFICATIONS_ENABLED: Controls main notification system (default: true)
 * - NEXT_PUBLIC_FEATURE_MP_NOTIFICATIONS_ENABLED: Controls multiplayer board notifications (default: true)
 */

interface FeatureFlags {
  notifications: boolean;
  mpNotifications: boolean;
}

const getFeatureFlags = (): FeatureFlags => {
  return {
    // Notifications are disabled by default when the flag is explicitly set to 'false'
    notifications: process.env.NEXT_PUBLIC_FEATURE_NOTIFICATIONS_ENABLED !== 'false',
    mpNotifications: process.env.NEXT_PUBLIC_FEATURE_MP_NOTIFICATIONS_ENABLED !== 'false',
  };
};

export const featureFlags = getFeatureFlags();

export const isFeatureEnabled = (feature: keyof FeatureFlags): boolean => {
  return featureFlags[feature];
};
