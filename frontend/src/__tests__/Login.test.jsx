import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../pages/Login';
import { AuthProvider } from '../context/AuthContext';

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

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
import { toast } from 'react-hot-toast';

const renderLogin = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.getItem.mockReturnValue(null);
    localStorage.setItem.mockImplementation(() => {});
  });

  it('renders login form when setup is not required', async () => {
    api.get.mockResolvedValueOnce({ data: { setupRequired: false } });

    renderLogin();

    await waitFor(() => {
      expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
  });

  it('renders setup form when setup is required', async () => {
    api.get.mockResolvedValueOnce({ data: { setupRequired: true } });

    renderLogin();

    await waitFor(() => {
      expect(screen.getByText('Create your admin account')).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Account/i })).toBeInTheDocument();
  });

  it('shows error for empty fields', async () => {
    api.get.mockResolvedValueOnce({ data: { setupRequired: false } });

    renderLogin();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    expect(toast.error).toHaveBeenCalledWith('Email and password are required');
  });

  it('submits login form with valid data', async () => {
    api.get.mockResolvedValueOnce({ data: { setupRequired: false } });
    api.post.mockResolvedValueOnce({
      data: { token: 'test-token', user: { email: 'test@test.com' } },
    });

    renderLogin();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'test@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Welcome back!');
    });
  });

  it('handles login error', async () => {
    api.get.mockResolvedValueOnce({ data: { setupRequired: false } });
    api.post.mockRejectedValueOnce({
      response: { data: { error: 'Invalid credentials' } },
    });

    renderLogin();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'test@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/), {
      target: { value: 'wrongpassword' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Invalid credentials');
    });
  });

  it('shows loading state during submission', async () => {
    api.get.mockResolvedValueOnce({ data: { setupRequired: false } });
    api.post.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderLogin();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'test@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Please wait.../i })).toBeInTheDocument();
    });
  });

  it('validates password length during setup', async () => {
    api.get.mockResolvedValueOnce({ data: { setupRequired: true } });

    renderLogin();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Create Account/i })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('John Doe'), {
      target: { value: 'Test User' },
    });
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'new@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Min. 8 characters'), {
      target: { value: 'short' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

    expect(toast.error).toHaveBeenCalledWith('Password must be at least 8 characters');
  });

  it('has link to public booking page', async () => {
    api.get.mockResolvedValueOnce({ data: { setupRequired: false } });

    renderLogin();

    await waitFor(() => {
      expect(screen.getByText('View public booking page')).toBeInTheDocument();
    });

    const link = screen.getByText('View public booking page');
    expect(link.closest('a')).toHaveAttribute('href', '/book');
  });
});
