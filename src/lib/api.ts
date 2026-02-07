/**
 * Keygen API client
 * Minimalist fetch wrapper following AGENTS.md vibe.
 */

const BASE_URL = 'https://api.keygen.sh/v1';

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

export async function apiFetch<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, ...init } = options;
  
  const url = new URL(`${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));
  }

  const response = await fetch(url.toString(), {
    ...init,
    headers: {
      'Content-Type': 'application/vnd.api+json',
      'Accept': 'application/vnd.api+json',
      ...init.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ errors: [{ detail: 'An unknown error occurred' }] }));
    throw new Error(error.errors?.[0]?.detail || `API Error: ${response.status}`);
  }

  // Keygen API returns 204 No Content for some requests
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  get: <T>(url: string, options?: RequestOptions) => apiFetch<T>(url, { ...options, method: 'GET' }),
  post: <T>(url: string, body?: any, options?: RequestOptions) => 
    apiFetch<T>(url, { ...options, method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(url: string, body?: any, options?: RequestOptions) => 
    apiFetch<T>(url, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(url: string, options?: RequestOptions) => apiFetch<T>(url, { ...options, method: 'DELETE' }),
};
