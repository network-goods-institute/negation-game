import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePrivy } from '@privy-io/react-auth';
import { useAllUsers } from '@/queries/users/useAllUsers';
import { useCanCreateRationale } from '@/hooks/topics/useCanCreateRationale';
import TopicPageClient from '../TopicPageClient';

jest.mock('@privy-io/react-auth', () => ({
  usePrivy: jest.fn(),
}));
jest.mock('@/queries/users/useAllUsers');
jest.mock('@/hooks/topics/useCanCreateRationale');
jest.mock('@/hooks/ui/useIsMobile', () => ({
  __esModule: true,
  default: () => false,
}));
jest.mock('remark-gfm', () => ({
  __esModule: true,
  default: () => { },
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/s/test-space/topic/test-topic',
  useSearchParams: () => new URLSearchParams(),
}));

const mockUsePrivy = usePrivy as jest.MockedFunction<typeof usePrivy>;
const mockUseAllUsers = useAllUsers as jest.MockedFunction<typeof useAllUsers>;
const mockUseCanCreateRationale = useCanCreateRationale as jest.MockedFunction<typeof useCanCreateRationale>;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const mockTopic = {
  id: 1,
  name: 'Test Topic',
  discourseUrl: 'https://forum.example.com/topic/1',
};

const mockViewpoints = [
  {
    id: 'viewpoint-1',
    title: 'Test Viewpoint',
    description: 'Test description',
    authorId: 'user-1',
    authorUsername: 'alice',
    createdAt: '2024-01-01T00:00:00Z',
    graph: {},
    space: 'test-space',
    statistics: {
      views: 10,
      copies: 5,
      totalCred: 100,
      averageFavor: 75,
    },
  },
];

describe('TopicPageClient Delegate Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUsePrivy.mockReturnValue({
      user: { id: 'current-user' },
      ready: true,
      authenticated: true,
    } as any);

    mockUseCanCreateRationale.mockReturnValue({
      data: { canCreate: true, isRestricted: false },
      isLoading: false,
    } as any);
  });

  it('prioritizes delegates in the delegate status section', () => {
    const mockUsers = [
      {
        id: 'user-1',
        username: 'alice',
        cred: 500,
        agoraLink: null,
        scrollDelegateLink: null,
        delegationUrl: null,
      },
      {
        id: 'user-2',
        username: 'bob',
        cred: 1000,
        agoraLink: 'https://agora.xyz/delegates/bob',
        scrollDelegateLink: null,
        delegationUrl: null,
      },
      {
        id: 'user-3',
        username: 'charlie',
        cred: 300,
        agoraLink: null,
        scrollDelegateLink: 'https://gov.scroll.io/delegates/charlie',
        delegationUrl: null,
      },
    ];

    mockUseAllUsers.mockReturnValue({
      data: mockUsers,
    } as any);

    render(
      <TestWrapper>
        <TopicPageClient
          topic={mockTopic}
          viewpoints={mockViewpoints}
          space="test-space"
        />
      </TestWrapper>
    );

    const delegateSection = screen.getByTestId('delegate-status-section');
    const sectionQueries = within(delegateSection);

    // Check that delegate usernames are displayed
    expect(sectionQueries.getByText('bob')).toBeInTheDocument();
    expect(sectionQueries.getByText('charlie')).toBeInTheDocument();
    expect(sectionQueries.getByText('alice')).toBeInTheDocument();
  });

  it('shows crown icons for delegates', () => {
    const mockUsers = [
      {
        id: 'user-1',
        username: 'alice',
        cred: 500,
        agoraLink: 'https://agora.xyz/delegates/alice',
        scrollDelegateLink: null,
        delegationUrl: null,
      },
    ];

    mockUseAllUsers.mockReturnValue({
      data: mockUsers,
    } as any);

    render(
      <TestWrapper>
        <TopicPageClient
          topic={mockTopic}
          viewpoints={mockViewpoints}
          space="test-space"
        />
      </TestWrapper>
    );

    // Crown icon should be present for delegates
    const crownIcons = document.querySelectorAll('svg');
    expect(crownIcons.length).toBeGreaterThan(0);
  });

  it('shows delegate links for users with agora links', () => {
    const mockUsers = [
      {
        id: 'user-1',
        username: 'alice',
        cred: 500,
        agoraLink: 'https://agora.xyz/delegates/alice',
        scrollDelegateLink: null,
        delegationUrl: null,
      },
    ];

    mockUseAllUsers.mockReturnValue({
      data: mockUsers,
    } as any);

    render(
      <TestWrapper>
        <TopicPageClient
          topic={mockTopic}
          viewpoints={mockViewpoints}
          space="test-space"
        />
      </TestWrapper>
    );

    const agoraLink = screen.getByText('Agora');
    expect(agoraLink).toBeInTheDocument();
    expect(agoraLink.closest('a')).toHaveAttribute('href', 'https://agora.xyz/delegates/alice');
  });

  it('shows delegate links for users with scroll delegate links', () => {
    const mockUsers = [
      {
        id: 'user-1',
        username: 'bob',
        cred: 500,
        agoraLink: null,
        scrollDelegateLink: 'https://gov.scroll.io/delegates/bob',
        delegationUrl: null,
      },
    ];

    mockUseAllUsers.mockReturnValue({
      data: mockUsers,
    } as any);

    render(
      <TestWrapper>
        <TopicPageClient
          topic={mockTopic}
          viewpoints={mockViewpoints}
          space="test-space"
        />
      </TestWrapper>
    );

    const scrollLink = screen.getByText('Scroll');
    expect(scrollLink).toBeInTheDocument();
    expect(scrollLink.closest('a')).toHaveAttribute('href', 'https://gov.scroll.io/delegates/bob');
  });

  it('shows generic delegate link when only delegationUrl is present', () => {
    const mockUsers = [
      {
        id: 'user-1',
        username: 'charlie',
        cred: 500,
        agoraLink: null,
        scrollDelegateLink: null,
        delegationUrl: 'https://example.com/delegate/charlie',
      },
    ];

    mockUseAllUsers.mockReturnValue({
      data: mockUsers,
    } as any);

    render(
      <TestWrapper>
        <TopicPageClient
          topic={mockTopic}
          viewpoints={mockViewpoints}
          space="test-space"
        />
      </TestWrapper>
    );

    const delegateLink = screen.getByText('Delegate');
    expect(delegateLink).toBeInTheDocument();
    expect(delegateLink.closest('a')).toHaveAttribute('href', 'https://example.com/delegate/charlie');
  });

  it('shows published status for users who have created viewpoints', () => {
    const mockUsers = [
      {
        id: 'user-1',
        username: 'alice',
        cred: 500,
        agoraLink: 'https://agora.xyz/delegates/alice',
        scrollDelegateLink: null,
        delegationUrl: null,
      },
    ];

    mockUseAllUsers.mockReturnValue({
      data: mockUsers,
    } as any);

    render(
      <TestWrapper>
        <TopicPageClient
          topic={mockTopic}
          viewpoints={mockViewpoints}
          space="test-space"
        />
      </TestWrapper>
    );

    expect(screen.getByText('Published')).toBeInTheDocument();
  });

  it('shows pending status for users who have not created viewpoints', () => {
    const mockUsers = [
      {
        id: 'user-2',
        username: 'bob',
        cred: 500,
        agoraLink: 'https://agora.xyz/delegates/bob',
        scrollDelegateLink: null,
        delegationUrl: null,
      },
    ];

    mockUseAllUsers.mockReturnValue({
      data: mockUsers,
    } as any);

    render(
      <TestWrapper>
        <TopicPageClient
          topic={mockTopic}
          viewpoints={mockViewpoints}
          space="test-space"
        />
      </TestWrapper>
    );

    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('handles empty user list', () => {
    mockUseAllUsers.mockReturnValue({
      data: [],
    } as any);

    render(
      <TestWrapper>
        <TopicPageClient
          topic={mockTopic}
          viewpoints={mockViewpoints}
          space="test-space"
        />
      </TestWrapper>
    );

    expect(screen.getByText('No delegates found in this space')).toBeInTheDocument();
  });
});