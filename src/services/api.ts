import { handleMockRequest } from './mockBackend.js';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const BASE_URL = `${API_BASE}/api`;

interface RequestOptions extends RequestInit {
  data?: any;
}

class ApiService {
  private isStaticHostMode: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && sessionStorage.getItem('rescuenet_static_host_mode') === 'true') {
      this.isStaticHostMode = true;
    }
  }

  private async request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<{ data: T }> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const method = (options.method || 'GET').toUpperCase();

    if (this.isStaticHostMode && !import.meta.env.VITE_API_URL) {
      try {
        const mockResult = await handleMockRequest(cleanEndpoint, method, options.data);
        return { data: mockResult as T };
      } catch (err: any) {
        const error: any = new Error(err.message || 'Operation failed');
        error.response = { status: 400, data: { message: err.message } };
        throw error;
      }
    }

    const url = `${BASE_URL}${cleanEndpoint}`;
    const token = localStorage.getItem('rescuenet_token');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers
    };

    if (options.data !== undefined) {
      config.body = JSON.stringify(options.data);
    }

    try {
      const response = await fetch(url, config);

      if (response.status === 404) {
        console.warn(`[RescueNet API] 404 on ${url}. Activating Netlify standalone mode.`);
        this.isStaticHostMode = true;
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('rescuenet_static_host_mode', 'true');
        }
        const mockResult = await handleMockRequest(cleanEndpoint, method, options.data);
        return { data: mockResult as T };
      }

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {}
        const error: any = new Error(errorMessage);
        error.response = { status: response.status, data: { message: errorMessage } };
        throw error;
      }

      const data = await response.json();
      return { data };
    } catch (networkError: any) {
      if (!this.isStaticHostMode && (!import.meta.env.VITE_API_URL || networkError.message?.includes('Failed to fetch'))) {
        this.isStaticHostMode = true;
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('rescuenet_static_host_mode', 'true');
        }
        const mockResult = await handleMockRequest(cleanEndpoint, method, options.data);
        return { data: mockResult as T };
      }
      throw networkError;
    }
  }

  get<T = any>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T = any>(endpoint: string, data?: any, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'POST', data });
  }

  patch<T = any>(endpoint: string, data?: any, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', data });
  }

  delete<T = any>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export default new ApiService();
