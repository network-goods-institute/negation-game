/**
 * Function to check if a point can be deleted (within 8 hours of creation)
 */
export const isWithinDeletionTimelock = (createdAt: Date): boolean => {
  const now = new Date();
  const eightHoursInMs = 8 * 60 * 60 * 1000;
  const timeDiff = now.getTime() - createdAt.getTime();
  return timeDiff <= eightHoursInMs;
};
