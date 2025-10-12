import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { LoginData, RegisterData, User } from '@shared/schema-sqlite';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Auth API functions
const authApi = {
  async login(data: LoginData) {
    const response = await apiRequest('POST', '/api/auth/login', data);
    const result = await response.json();
    // Handle new response format: {success: true, data: user}
    return result.data || result;
  },

  async register(data: RegisterData) {
    const response = await apiRequest('POST', '/api/auth/register', data);
    const result = await response.json();
    // Handle new response format: {success: true, data: user}
    return result.data || result;
  },

  async logout() {
    const response = await apiRequest('POST', '/api/auth/logout');
    return response.json();
  },

  async getStatus() {
    const response = await apiRequest('GET', '/api/auth/status');
    const result = await response.json();
    // Handle new response format: {success: true, data: {authenticated: boolean, user: object}}
    return result.data || result;
  },

  async getMe() {
    const response = await apiRequest('GET', '/api/auth/me');
    return response.json();
  },

  async refresh() {
    const response = await apiRequest('POST', '/api/auth/refresh');
    return response.json();
  }
};

// Auth Provider Component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Query for auth status
  const { data: authStatus, isLoading } = useQuery({
    queryKey: ['auth', 'status'],
    queryFn: authApi.getStatus,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setError(null);
      // Update auth status in cache
      queryClient.setQueryData(['auth', 'status'], {
        authenticated: true,
        user: data.user || data // Handle both old and new formats
      });
      // Invalidate and refetch other queries that depend on auth
      queryClient.invalidateQueries({ queryKey: ['health-profile'] });
      queryClient.invalidateQueries({ queryKey: ['food-entries'] });
    },
    onError: (error: any) => {
      const message = error.message || 'Login failed. Please try again.';
      setError(message);
    }
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      setError(null);
      // Update auth status in cache
      queryClient.setQueryData(['auth', 'status'], {
        authenticated: true,
        user: data.user || data // Handle both old and new formats
      });
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['health-profile'] });
    },
    onError: (error: any) => {
      const message = error.message || 'Registration failed. Please try again.';
      setError(message);
    }
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      setError(null);
      // Clear auth status
      queryClient.setQueryData(['auth', 'status'], {
        authenticated: false,
        user: null
      });
      // Clear all cached data
      queryClient.clear();
    },
    onError: (error: any) => {
      // Even if logout fails on server, clear local state
      queryClient.setQueryData(['auth', 'status'], {
        authenticated: false,
        user: null
      });
      queryClient.clear();
    }
  });

  // Refresh mutation
  const refreshMutation = useMutation({
    mutationFn: authApi.refresh,
    onSuccess: () => {
      // Refetch auth status
      queryClient.invalidateQueries({ queryKey: ['auth', 'status'] });
    }
  });

  const contextValue: AuthContextType = {
    user: authStatus?.user || null,
    isLoading: isLoading || loginMutation.isPending || registerMutation.isPending,
    isAuthenticated: authStatus?.authenticated || false,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    refreshAuth: refreshMutation.mutateAsync,
    error,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook for protected routes
export function useRequireAuth() {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Redirect to login page
      window.location.href = '/auth/login';
    }
  }, [isAuthenticated, isLoading]);

  return { isAuthenticated, isLoading };
}

// Higher-order component for protected routes
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading } = useRequireAuth();

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return null; // Will redirect via useRequireAuth
    }

    return <Component {...props} />;
  };
}