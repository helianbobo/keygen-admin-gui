/**
 * Keygen API client
 * Minimalist fetch wrapper following AGENTS.md vibe.
 */

export const BASE_URL = 'https://api.keygen.sh/v1';

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

// Field-level validation error
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// API Error with validation details
export class ApiError extends Error {
  status: number;
  code?: string;
  validationErrors?: ValidationError[];

  constructor(message: string, status: number, code?: string, validationErrors?: ValidationError[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.validationErrors = validationErrors;
  }
}

// Parse 422 validation errors from JSON:API format
function parseValidationErrors(errorData: any): ValidationError[] {
  if (!errorData.errors || !Array.isArray(errorData.errors)) {
    return [];
  }

  return errorData.errors
    .filter((err: any) => err.source?.pointer || err.source?.parameter)
    .map((err: any) => ({
      field: err.source.pointer?.replace('/data/attributes/', '') || err.source.parameter,
      message: err.detail || err.title,
      code: err.code,
    }));
}

// Exponential backoff for rate limiting
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (error instanceof ApiError && error.status === 429) {
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }

      throw error;
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

// Get auth token from localStorage
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('keygen_token');
}

// Get account ID from localStorage
function getAccountId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('keygen_account');
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestOptions = {},
  retryCount: number = 0
): Promise<T> {
  const { params, ...init } = options;

  const url = new URL(`${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));
  }

  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/vnd.api+json',
    'Accept': 'application/vnd.api+json',
  };

  if (init.headers) {
    Object.entries(init.headers).forEach(([key, value]) => {
      if (typeof value === 'string') {
        headers[key] = value;
      }
    });
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url.toString(), {
    ...init,
    headers,
  });

  // Handle 401 - Token expired, try to refresh
  if (response.status === 401 && retryCount === 0) {
    // Clear invalid token
    if (typeof window !== 'undefined') {
      localStorage.removeItem('keygen_token');
    }
    // Could implement token refresh here if refresh token exists
    const errorData = await response.json().catch(() => ({
      errors: [{ detail: 'Authentication required' }],
    }));
    throw new ApiError(
      errorData.errors?.[0]?.detail || 'Authentication required',
      401,
      errorData.errors?.[0]?.code
    );
  }

  // Handle 422 - Validation errors
  if (response.status === 422) {
    const errorData = await response.json().catch(() => ({
      errors: [{ detail: 'Validation failed' }],
    }));
    const validationErrors = parseValidationErrors(errorData);
    throw new ApiError(
      errorData.errors?.[0]?.detail || 'Validation failed',
      422,
      errorData.errors?.[0]?.code,
      validationErrors
    );
  }

  // Handle 429 - Rate limited
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : 1000;

    if (retryCount < 3) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return apiFetch(endpoint, options, retryCount + 1);
    }

    throw new ApiError('Rate limit exceeded. Please try again later.', 429);
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      errors: [{ detail: 'An unknown error occurred' }],
    }));
    throw new ApiError(
      error.errors?.[0]?.detail || `API Error: ${response.status}`,
      response.status,
      error.errors?.[0]?.code
    );
  }

  // Keygen API returns 204 No Content for some requests
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  get: <T>(url: string, options?: RequestOptions) =>
    retryWithBackoff(() => apiFetch<T>(url, { ...options, method: 'GET' })),
  post: <T>(url: string, body?: any, options?: RequestOptions) =>
    retryWithBackoff(() =>
      apiFetch<T>(url, { ...options, method: 'POST', body: JSON.stringify(body) })
    ),
  patch: <T>(url: string, body?: any, options?: RequestOptions) =>
    retryWithBackoff(() =>
      apiFetch<T>(url, { ...options, method: 'PATCH', body: JSON.stringify(body) })
    ),
  delete: <T>(url: string, options?: RequestOptions) =>
    retryWithBackoff(() => apiFetch<T>(url, { ...options, method: 'DELETE' })),
};

// JSON:API Resource wrapper
interface JsonApiResource {
  type: string;
  id?: string;
  attributes?: Record<string, any>;
  relationships?: Record<string, any>;
}

interface JsonApiRequest {
  data: JsonApiResource;
}

interface JsonApiResponse<T = any> {
  data: T;
  included?: any[];
  meta?: any;
}

/**
 * Create a new resource
 * @param type - Resource type (e.g., 'licenses', 'products')
 * @param attributes - Resource attributes
 * @param relationships - Optional relationships
 * @returns Created resource
 */
export async function createResource<T = any>(
  type: string,
  attributes: Record<string, any>,
  relationships?: Record<string, any>
): Promise<T> {
  const accountId = getAccountId();
  if (!accountId) {
    throw new ApiError('Account ID not found', 400);
  }

  const body: JsonApiRequest = {
    data: {
      type,
      attributes,
    },
  };

  if (relationships) {
    body.data.relationships = relationships;
  }

  const response = await api.post<JsonApiResponse<T>>(
    `/accounts/${accountId}/${type}`,
    body
  );

  return response.data;
}

/**
 * Update an existing resource
 * @param type - Resource type
 * @param id - Resource ID
 * @param attributes - Attributes to update
 * @param relationships - Optional relationships to update
 * @returns Updated resource
 */
export async function updateResource<T = any>(
  type: string,
  id: string,
  attributes: Record<string, any>,
  relationships?: Record<string, any>
): Promise<T> {
  const accountId = getAccountId();
  if (!accountId) {
    throw new ApiError('Account ID not found', 400);
  }

  const body: JsonApiRequest = {
    data: {
      type,
      id,
      attributes,
    },
  };

  if (relationships) {
    body.data.relationships = relationships;
  }

  const response = await api.patch<JsonApiResponse<T>>(
    `/accounts/${accountId}/${type}/${id}`,
    body
  );

  return response.data;
}

/**
 * Delete a resource
 * @param type - Resource type
 * @param id - Resource ID
 */
export async function deleteResource(type: string, id: string): Promise<void> {
  const accountId = getAccountId();
  if (!accountId) {
    throw new ApiError('Account ID not found', 400);
  }

  await api.delete(`/accounts/${accountId}/${type}/${id}`);
}

/**
 * Fetch a single resource by ID
 * @param type - Resource type
 * @param id - Resource ID
 * @param include - Optional relationships to include
 * @returns Resource
 */
export async function fetchResource<T = any>(
  type: string,
  id: string,
  include?: string[]
): Promise<T> {
  const accountId = getAccountId();
  if (!accountId) {
    throw new ApiError('Account ID not found', 400);
  }

  const params: Record<string, string> = {};
  if (include?.length) {
    params.include = include.join(',');
  }

  const response = await api.get<JsonApiResponse<T>>(
    `/accounts/${accountId}/${type}/${id}`,
    { params }
  );

  return response.data;
}

/**
 * Fetch a list of resources
 * @param type - Resource type
 * @param options - Query options (page, limit, filters, include)
 * @returns List of resources
 */
export async function fetchResources<T = any>(
  type: string,
  options?: {
    page?: number;
    limit?: number;
    filters?: Record<string, string>;
    include?: string[];
  }
): Promise<{ data: T[]; meta?: any }> {
  const accountId = getAccountId();
  if (!accountId) {
    throw new ApiError('Account ID not found', 400);
  }

  const params: Record<string, string> = {};

  if (options?.page) {
    params['page[number]'] = options.page.toString();
  }
  if (options?.limit) {
    params['page[size]'] = options.limit.toString();
  }
  if (options?.include?.length) {
    params.include = options.include.join(',');
  }
  if (options?.filters) {
    Object.entries(options.filters).forEach(([key, value]) => {
      if (value) {
        params[key] = value;
      }
    });
  }

  const response = await api.get<JsonApiResponse<T[]>>(
    `/accounts/${accountId}/${type}`,
    { params }
  );

  return {
    data: response.data,
    meta: response.meta,
  };
}
