const BASE_URL = '/api';

interface RequestOptions extends RequestInit {
  data?: any;
}

class ApiService {
  private async request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<{ data: T }> {
    const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
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

    const response = await fetch(url, config);

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        // use default error message
      }
      const error: any = new Error(errorMessage);
      error.response = { status: response.status, data: { message: errorMessage } };
      throw error;
    }

    try {
      const data = await response.json();
      return { data };
    } catch {
      return { data: {} as T };
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
