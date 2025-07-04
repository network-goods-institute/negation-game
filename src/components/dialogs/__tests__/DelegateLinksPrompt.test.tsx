import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePrivy } from '@privy-io/react-auth';
import { DelegateLinksPrompt } from '../DelegateLinksPrompt';
import { updateUserProfile } from '@/actions/users/updateUserProfile';
import { toast } from 'sonner';

jest.mock('@privy-io/react-auth', () => ({
  usePrivy: jest.fn(),
}));
jest.mock('@/actions/users/updateUserProfile');
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockUsePrivy = usePrivy as jest.MockedFunction<typeof usePrivy>;
const mockUpdateUserProfile = updateUserProfile as jest.MockedFunction<typeof updateUserProfile>;
const mockToast = toast as jest.Mocked<typeof toast>;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('DelegateLinksPrompt', () => {
  const mockOnOpenChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePrivy.mockReturnValue({
      user: { id: 'test-user-id' },
      ready: true,
      authenticated: true,
    } as any);
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });
  });

  it('renders delegate type options', () => {
    render(
      <TestWrapper>
        <DelegateLinksPrompt open={true} onOpenChange={mockOnOpenChange} />
      </TestWrapper>
    );

    expect(screen.getByText('Agora Delegate')).toBeInTheDocument();
    expect(screen.getByText('Scroll Delegate')).toBeInTheDocument();
    expect(screen.getByText('Not a Delegate')).toBeInTheDocument();
  });

  it('shows input field when agora delegate is selected', () => {
    render(
      <TestWrapper>
        <DelegateLinksPrompt open={true} onOpenChange={mockOnOpenChange} />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Agora Delegate'));
    expect(screen.getByPlaceholderText('https://agora.xyz/delegates/...')).toBeInTheDocument();
  });

  it('shows input field when scroll delegate is selected', () => {
    render(
      <TestWrapper>
        <DelegateLinksPrompt open={true} onOpenChange={mockOnOpenChange} />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Scroll Delegate'));
    expect(screen.getByPlaceholderText('https://gov.scroll.io/delegates/...')).toBeInTheDocument();
  });

  it('submits agora link successfully', async () => {
    mockUpdateUserProfile.mockResolvedValue({ success: true });

    render(
      <TestWrapper>
        <DelegateLinksPrompt open={true} onOpenChange={mockOnOpenChange} />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Agora Delegate'));
    fireEvent.change(screen.getByPlaceholderText('https://agora.xyz/delegates/...'), {
      target: { value: 'agora.xyz/delegates/test-user' }
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockUpdateUserProfile).toHaveBeenCalledWith({
        agoraLink: 'https://agora.xyz/delegates/test-user'
      });
    });

    expect(mockToast.success).toHaveBeenCalledWith('Delegate links updated successfully');
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('submits scroll delegate link successfully', async () => {
    mockUpdateUserProfile.mockResolvedValue({ success: true });

    render(
      <TestWrapper>
        <DelegateLinksPrompt open={true} onOpenChange={mockOnOpenChange} />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Scroll Delegate'));
    fireEvent.change(screen.getByPlaceholderText('https://gov.scroll.io/delegates/...'), {
      target: { value: 'https://gov.scroll.io/delegates/test-user' }
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockUpdateUserProfile).toHaveBeenCalledWith({
        scrollDelegateLink: 'https://gov.scroll.io/delegates/test-user'
      });
    });

    expect(mockToast.success).toHaveBeenCalledWith('Delegate links updated successfully');
  });

  it('handles submission error', async () => {
    mockUpdateUserProfile.mockResolvedValue({ success: false, error: 'Network error' });

    render(
      <TestWrapper>
        <DelegateLinksPrompt open={true} onOpenChange={mockOnOpenChange} />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Agora Delegate'));
    fireEvent.change(screen.getByPlaceholderText('https://agora.xyz/delegates/...'), {
      target: { value: 'agora.xyz/delegates/test-user' }
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to update delegate links: Network error');
    });
  });

  it('allows skipping the prompt', () => {
    render(
      <TestWrapper>
        <DelegateLinksPrompt open={true} onOpenChange={mockOnOpenChange} />
      </TestWrapper>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }));

    expect(localStorage.setItem).toHaveBeenCalledWith('hasSeenDelegatePrompt', 'true');
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('disables save button when no delegate type selected', () => {
    render(
      <TestWrapper>
        <DelegateLinksPrompt open={true} onOpenChange={mockOnOpenChange} />
      </TestWrapper>
    );

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('disables save button when delegate type requires URL but none provided', () => {
    render(
      <TestWrapper>
        <DelegateLinksPrompt open={true} onOpenChange={mockOnOpenChange} />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Agora Delegate'));
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('enables save button for "not a delegate" option', () => {
    render(
      <TestWrapper>
        <DelegateLinksPrompt open={true} onOpenChange={mockOnOpenChange} />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Not a Delegate'));
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });
});