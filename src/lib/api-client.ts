/**
 * API client with automatic CSRF token handling
 */

let csrfToken: string | null = null;

async function getCSRFToken(): Promise<string | null> {
  if (csrfToken) return csrfToken;
  
  try {
    const response = await fetch('/api/csrf');
    if (response.ok) {
      const data = await response.json();
      csrfToken = data.csrfToken;
      return csrfToken;
    }
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
  }
  
  return null;
}

export async function apiClient(url: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Add CSRF token for non-GET requests
  if (options.method && options.method !== 'GET') {
    const token = await getCSRFToken();
    if (token) {
      headers['x-csrf-token'] = token;
    }
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

// Convenience methods
export const api = {
  get: (url: string) => apiClient(url, { method: 'GET' }),
  
  post: (url: string, data?: any) => apiClient(url, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  }),
  
  put: (url: string, data?: any) => apiClient(url, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  }),
  
  patch: (url: string, data?: any) => apiClient(url, {
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  }),
  
  delete: (url: string) => apiClient(url, { method: 'DELETE' }),
};