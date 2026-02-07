const DEFAULT_BASE_URL = 'https://api.keygen.sh/v1';

export interface KeygenError {
  errors: Array<{
    title: string;
    detail: string;
    code: string;
    source?: {
      pointer?: string;
      parameter?: string;
    };
  }>;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const accountId = typeof window !== 'undefined' ? localStorage.getItem('keygen_account_id') : null;
  const token = typeof window !== 'undefined' ? localStorage.getItem('keygen_admin_token') : null;
  const baseUrl = (typeof window !== 'undefined' ? localStorage.getItem('keygen_base_url') : null) || DEFAULT_BASE_URL;

  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `${baseUrl}/accounts/${accountId}${endpoint}`;

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/vnd.api+json');
  headers.set('Accept', 'application/vnd.api+json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return {} as T;
  }

  const data = await response.json();

  if (!response.ok) {
    throw data as KeygenError;
  }

  return data as T;
}

export const api = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, body?: any, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(endpoint: string, body?: any, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};
