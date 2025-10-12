import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Custom error class for API errors
export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data?: any
  ) {
    super(`${status}: ${statusText}`);
    this.name = 'ApiError';
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorData: any;
    let errorMessage = res.statusText;

    try {
      const text = await res.text();
      if (text) {
        try {
          errorData = JSON.parse(text);
          errorMessage = errorData.error || errorData.message || text;
        } catch {
          errorMessage = text;
        }
      }
    } catch (err) {
      console.warn('Failed to read error response:', err);
    }

    throw new ApiError(res.status, errorMessage, errorData);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  try {
    // In development, if the URL starts with /api and we're on localhost:5173,
    // make sure it's properly proxied to the backend server
    let finalUrl = url;
    if (import.meta.env.DEV && url.startsWith('/api')) {
      // The Vite proxy should handle this, but if it doesn't work,
      // we'll use the full backend URL
      const currentHost = window.location.host;
      if (currentHost === 'localhost:5173' || currentHost.includes('localhost:5173')) {
        // Use the relative URL, which should be proxied by Vite
        finalUrl = url;
      }
    }

    if (import.meta.env.DEV) {
      console.log(`🌐 API ${method} ${finalUrl}`, data ? { data } : '');
    }

    const controller = new AbortController();
    // Use longer timeout for insights API (45s) due to AI processing time with fallback calls
    const timeout = url.includes('/api/insights') ? 45000 : 30000;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const res = await fetch(finalUrl, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    await throwIfResNotOk(res);

    if (import.meta.env.DEV) {
      console.log(`✅ API ${method} ${finalUrl} - ${res.status}`);
    }

    return res;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.error(`⏰ API request timeout: ${method} ${url}`);
      throw new ApiError(408, 'Request timeout');
    }

    if (error instanceof ApiError) {
      console.error(`❌ API error: ${method} ${url} - ${error.status}: ${error.statusText}`);
      throw error;
    }

    console.error(`❌ Network error: ${method} ${url}`, error);
    throw new ApiError(0, 'Network error', { originalError: error });
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: (failureCount, error) => {
        // Don't retry on client errors (4xx) except for 429 (rate limit)
        if (error instanceof ApiError) {
          if (error.status >= 400 && error.status < 500 && error.status !== 429) {
            return false;
          }
        }
        // Retry up to 3 times for network errors and 5xx errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: (failureCount, error) => {
        // Don't retry mutations on client errors
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false;
        }
        // Retry up to 2 times for network/server errors
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      onError: (error) => {
        if (import.meta.env.DEV) {
          console.error('Mutation error:', error);
        }
      },
    },
  },
});
