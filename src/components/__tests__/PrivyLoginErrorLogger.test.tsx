import { render } from '@testing-library/react';
import { PrivyLoginErrorLogger } from '../PrivyLoginErrorLogger';
import { useLogin } from '@privy-io/react-auth';
import { logger } from '@/lib/logger';

jest.mock('@privy-io/react-auth', () => ({
  useLogin: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('PrivyLoginErrorLogger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs privy login errors', () => {
    let callbacks: { onError?: (error: unknown) => void } | undefined;

    (useLogin as jest.Mock).mockImplementation((value) => {
      callbacks = value;
      return { login: jest.fn() };
    });

    render(<PrivyLoginErrorLogger />);

    expect(useLogin).toHaveBeenCalled();
    expect(callbacks?.onError).toBeDefined();

    const error = 'email_already_registered';
    callbacks?.onError?.(error);

    expect(logger.error).toHaveBeenCalledWith('Privy login error', { error });
  });
});
