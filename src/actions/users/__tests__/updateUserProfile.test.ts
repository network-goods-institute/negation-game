import { updateUserProfile } from '../updateUserProfile';
import { getUserId } from '../getUserId';
import { db } from '@/services/db';
import { usersTable } from '@/db/schema';

jest.mock('../getUserId');
jest.mock('@/services/db');

const mockGetUserId = getUserId as jest.MockedFunction<typeof getUserId>;
const mockDb = db as jest.Mocked<typeof db>;

describe('updateUserProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update user profile with all fields', async () => {
    const userId = 'test-user-id';
    mockGetUserId.mockResolvedValue(userId);

    const updateSpy = jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      }),
    });
    mockDb.update.mockReturnValue(updateSpy() as any);

    const profileData = {
      bio: 'Test bio',
      delegationUrl: 'https://example.com/delegate',
      discourseUsername: 'testuser',
      discourseCommunityUrl: 'https://forum.example.com',
      discourseConsentGiven: true,
    };

    const result = await updateUserProfile(profileData);

    expect(result).toEqual({ success: true });
    expect(mockDb.update).toHaveBeenCalledWith(usersTable);
  });

  it('should update only provided fields', async () => {
    const userId = 'test-user-id';
    mockGetUserId.mockResolvedValue(userId);

    const setSpy = jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue(undefined),
    });
    const updateSpy = jest.fn().mockReturnValue({
      set: setSpy,
    });
    mockDb.update.mockReturnValue(updateSpy() as any);

    const profileData = {
      delegationUrl: 'https://example.com/delegate',
    };

    const result = await updateUserProfile(profileData);

    expect(result).toEqual({ success: true });
    expect(setSpy).toHaveBeenCalledWith({
      delegationUrl: 'https://example.com/delegate',
    });
  });

  it('should handle null values', async () => {
    const userId = 'test-user-id';
    mockGetUserId.mockResolvedValue(userId);

    const setSpy = jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue(undefined),
    });
    const updateSpy = jest.fn().mockReturnValue({
      set: setSpy,
    });
    mockDb.update.mockReturnValue(updateSpy() as any);

    const profileData = {
      bio: null,
    };

    const result = await updateUserProfile(profileData);

    expect(result).toEqual({ success: true });
    expect(setSpy).toHaveBeenCalledWith({
      bio: null,
    });
  });

  it('should require authentication', async () => {
    mockGetUserId.mockResolvedValue(null);

    const result = await updateUserProfile({ bio: 'test' });

    expect(result).toEqual({
      success: false,
      error: 'User not logged in',
    });
  });

  it('should handle validation errors', async () => {
    const userId = 'test-user-id';
    mockGetUserId.mockResolvedValue(userId);

    const profileData = {
      bio: 'a'.repeat(1001), // Too long
    };

    const result = await updateUserProfile(profileData);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should handle database errors', async () => {
    const userId = 'test-user-id';
    mockGetUserId.mockResolvedValue(userId);

    mockDb.update.mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockRejectedValue(new Error('Database error')),
      }),
    } as any);

    const result = await updateUserProfile({ bio: 'test' });

    expect(result).toEqual({
      success: false,
      error: 'Database error',
    });
  });

  it('should validate URL fields', async () => {
    const userId = 'test-user-id';
    mockGetUserId.mockResolvedValue(userId);

    const profileData = {
    };

    const result = await updateUserProfile(profileData);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});