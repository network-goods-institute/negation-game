import { markTutorialVideoSeen } from '../markTutorialVideoSeen';
import { getUserId } from '../getUserId';
import { db } from '@/services/db';
import { usersTable } from '@/db/schema';

jest.mock('../getUserId');
jest.mock('../fetchUser', () => ({
  invalidateUserCache: jest.fn(),
}));
jest.mock('@/services/db');

const mockGetUserId = getUserId as jest.MockedFunction<typeof getUserId>;
const mockDb = db as jest.Mocked<typeof db>;

describe('markTutorialVideoSeen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns unauthenticated when no user id is available', async () => {
    mockGetUserId.mockResolvedValue(null);

    const result = await markTutorialVideoSeen();

    expect(result).toEqual({ ok: false, reason: 'unauthenticated' });
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it('updates tutorialVideoSeenAt for the current user', async () => {
    mockGetUserId.mockResolvedValue('user-1');

    const returning = jest.fn().mockResolvedValue([{ tutorialVideoSeenAt: new Date() }]);
    const where = jest.fn().mockReturnValue({ returning });
    const set = jest.fn().mockReturnValue({ where });
    const update = jest.fn().mockReturnValue({ set });
    mockDb.update.mockReturnValue(update() as any);

    const result = await markTutorialVideoSeen();

    expect(mockDb.update).toHaveBeenCalledWith(usersTable);
    expect(set).toHaveBeenCalledWith({
      tutorialVideoSeenAt: expect.any(Date),
    });
    expect(result.ok).toBe(true);
  });

  it('returns not_found when the user row is missing', async () => {
    mockGetUserId.mockResolvedValue('user-1');

    const returning = jest.fn().mockResolvedValue([]);
    const where = jest.fn().mockReturnValue({ returning });
    const set = jest.fn().mockReturnValue({ where });
    const update = jest.fn().mockReturnValue({ set });
    mockDb.update.mockReturnValue(update() as any);

    const result = await markTutorialVideoSeen();

    expect(result).toEqual({ ok: false, reason: 'not_found' });
  });

  it('returns error when the update fails', async () => {
    mockGetUserId.mockResolvedValue('user-1');

    const returning = jest.fn().mockRejectedValue(new Error('db failed'));
    const where = jest.fn().mockReturnValue({ returning });
    const set = jest.fn().mockReturnValue({ where });
    const update = jest.fn().mockReturnValue({ set });
    mockDb.update.mockReturnValue(update() as any);

    const result = await markTutorialVideoSeen();

    expect(result).toEqual({ ok: false, reason: 'error' });
  });
});
