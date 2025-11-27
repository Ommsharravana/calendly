import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';

// Mock the api module
vi.mock('../utils/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    defaults: {
      headers: {
        common: {},
      },
    },
  },
}));

import api from '../utils/api';

// Test component that uses the auth context
const TestComponent = () => {
  const { user, loading, setupRequired, isAuthenticated, login, logout, setup } = useAuth();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div data-testid="setup-required">{setupRequired ? 'yes' : 'no'}</div>
      <div data-testid="is-authenticated">{isAuthenticated ? 'yes' : 'no'}</div>
      <div data-testid="user-email">{user?.email || 'none'}</div>
      <button onClick={() => login('test@test.com', 'password')}>Login</button>
      <button onClick={logout}>Logout</button>
      <button onClick={() => setup('new@test.com', 'password', 'New User')}>Setup</button>
    </div>
  );
};

const renderWithProvider = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.getItem.mockReturnValue(null);
    localStorage.setItem.mockImplementation(() => {});
    localStorage.removeItem.mockImplementation(() => {});
  });

  it('shows loading state initially', () => {
    api.get.mockImplementation(() => new Promise(() => {})); // Never resolves
    renderWithProvider();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('detects when setup is required', async () => {
    api.get.mockResolvedValueOnce({ data: { setupRequired: true } });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('setup-required')).toHaveTextContent('yes');
    });
    expect(screen.getByTestId('is-authenticated')).toHaveTextContent('no');
  });

  it('loads user from token when already authenticated', async () => {
    localStorage.getItem.mockReturnValue('existing-token');
    api.get
      .mockResolvedValueOnce({ data: { setupRequired: false } })
      .mockResolvedValueOnce({ data: { email: 'existing@test.com', name: 'Existing User' } });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('yes');
    });
    expect(screen.getByTestId('user-email')).toHaveTextContent('existing@test.com');
  });

  it('clears invalid token', async () => {
    localStorage.getItem.mockReturnValue('invalid-token');
    api.get
      .mockResolvedValueOnce({ data: { setupRequired: false } })
      .mockRejectedValueOnce(new Error('Invalid token'));

    renderWithProvider();

    await waitFor(() => {
      expect(localStorage.removeItem).toHaveBeenCalledWith('token');
    });
    expect(screen.getByTestId('is-authenticated')).toHaveTextContent('no');
  });

  it('login sets user and token', async () => {
    api.get.mockResolvedValueOnce({ data: { setupRequired: false } });
    api.post.mockResolvedValueOnce({
      data: {
        token: 'new-token',
        user: { email: 'test@test.com', name: 'Test User' },
      },
    });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('no');
    });

    await act(async () => {
      screen.getByText('Login').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('yes');
    });
    expect(localStorage.setItem).toHaveBeenCalledWith('token', 'new-token');
  });

  it('logout clears user and token', async () => {
    localStorage.getItem.mockReturnValue('existing-token');
    api.get
      .mockResolvedValueOnce({ data: { setupRequired: false } })
      .mockResolvedValueOnce({ data: { email: 'existing@test.com', name: 'Existing User' } });
    api.post.mockResolvedValueOnce({});

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('yes');
    });

    await act(async () => {
      screen.getByText('Logout').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('no');
    });
    expect(localStorage.removeItem).toHaveBeenCalledWith('token');
  });

  it('setup creates user and sets authentication', async () => {
    api.get.mockResolvedValueOnce({ data: { setupRequired: true } });
    api.post.mockResolvedValueOnce({
      data: {
        token: 'setup-token',
        user: { email: 'new@test.com', name: 'New User' },
      },
    });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('setup-required')).toHaveTextContent('yes');
    });

    await act(async () => {
      screen.getByText('Setup').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('yes');
    });
    expect(screen.getByTestId('setup-required')).toHaveTextContent('no');
    expect(localStorage.setItem).toHaveBeenCalledWith('token', 'setup-token');
  });
});

describe('useAuth hook', () => {
  it('throws error when used outside AuthProvider', () => {
    const consoleError = console.error;
    console.error = vi.fn();

    const TestComponentWithoutProvider = () => {
      useAuth();
      return null;
    };

    expect(() => {
      render(<TestComponentWithoutProvider />);
    }).toThrow('useAuth must be used within an AuthProvider');

    console.error = consoleError;
  });
});
