import { fetchAllUsers } from '../fetchAllUsers';
import { db } from '@/services/db';
import { usersTable } from '@/db/schema';

jest.mock('@/services/db');

const mockDb = db as jest.Mocked<typeof db>;

describe('fetchAllUsers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return all active users with delegate link fields', async () => {
    const mockUsers = [
      {
        id: 'user-1',
        username: 'alice',
        cred: 1000,
        delegationUrl: 'https://example.com/delegate',
        agoraLink: 'https://agora.xyz/delegates/alice',
        scrollDelegateLink: null,
      },
      {
        id: 'user-2',
        username: 'bob',
        cred: 800,
        delegationUrl: null,
        agoraLink: null,
        scrollDelegateLink: 'https://gov.scroll.io/delegates/bob',
      },
      {
        id: 'user-3',
        username: 'charlie',
        cred: 600,
        delegationUrl: null,
        agoraLink: null,
        scrollDelegateLink: null,
      },
    ];

    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(mockUsers),
      }),
    } as any);

    const result = await fetchAllUsers();

    expect(result).toEqual(mockUsers);
    expect(mockDb.select).toHaveBeenCalledWith({
      id: usersTable.id,
      username: usersTable.username,
      cred: usersTable.cred,
      delegationUrl: usersTable.delegationUrl,
      agoraLink: usersTable.agoraLink,
      scrollDelegateLink: usersTable.scrollDelegateLink,
    });
  });

  it('should filter only active users', async () => {
    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
      }),
    } as any);

    await fetchAllUsers();

    const mockWhereCall = (mockDb.select as jest.Mock).mock.results[0].value.from.mock.results[0].value.where;
    expect(mockWhereCall).toHaveBeenCalled();
  });

  it('should handle empty results', async () => {
    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
      }),
    } as any);

    const result = await fetchAllUsers();

    expect(result).toEqual([]);
  });
});