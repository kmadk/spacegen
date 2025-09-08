import { z } from 'zod';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { APIError, AuthenticationError, InfrastructureError } from './errors';
import type { AdapterConfig, HTTPClient } from './types';

/**
 * Base adapter class providing common functionality for all external service integrations
 */
export abstract class BaseAdapter implements HTTPClient {
  protected readonly client: AxiosInstance;
  protected readonly config: AdapterConfig;

  constructor(config: AdapterConfig) {
    this.config = config;
    
    this.client = axios.create({
      timeout: config.timeout || 30000,
      headers: {
        'User-Agent': 'FIR/1.0.0',
        ...config.headers
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor for authentication
    this.client.interceptors.request.use(
      (config) => {
        if (this.config.apiKey && !config.headers.Authorization) {
          config.headers.Authorization = `Bearer ${this.config.apiKey}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const infraError = this.handleError(error);
        return Promise.reject(infraError);
      }
    );
  }

  protected handleError(error: AxiosError): InfrastructureError {
    if (!error.response) {
      return new InfrastructureError(
        'Network error occurred',
        'NETWORK_ERROR',
        { originalError: error.message }
      );
    }

    const { status, data } = error.response;
    const message = typeof data === 'object' && data !== null && 'message' in data 
      ? String(data.message) 
      : `HTTP ${status} error`;

    switch (status) {
      case 401:
      case 403:
        return new AuthenticationError(
          message || 'Authentication failed',
          'AUTH_ERROR',
          { status, data }
        );
      case 429:
        return new APIError(
          'Rate limit exceeded',
          'RATE_LIMIT',
          { status, data, retryAfter: error.response.headers['retry-after'] }
        );
      case 404:
        return new APIError(
          'Resource not found',
          'NOT_FOUND',
          { status, data }
        );
      default:
        return new APIError(
          message,
          'API_ERROR',
          { status, data }
        );
    }
  }

  protected validateConfig<T>(schema: z.ZodSchema<T>, config: unknown): T {
    try {
      return schema.parse(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues.map(issue => 
          `${issue.path.join('.')}: ${issue.message}`
        ).join(', ');
        throw new InfrastructureError(
          `Configuration validation failed: ${issues}`,
          'CONFIG_ERROR'
        );
      }
      throw error;
    }
  }

  async get<T>(url: string, params?: Record<string, any>): Promise<T> {
    const response = await this.client.get(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: any, headers?: Record<string, string>): Promise<T> {
    const response = await this.client.post(url, data, { headers });
    return response.data;
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.put(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete(url);
    return response.data;
  }

  async patch<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.patch(url, data);
    return response.data;
  }

  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    backoffMs: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on authentication errors
        if (error instanceof AuthenticationError) {
          throw error;
        }

        // Don't retry on client errors (4xx except 429)
        if (error instanceof APIError && error.statusCode && 
            error.statusCode >= 400 && error.statusCode < 500 && 
            error.statusCode !== 429) {
          throw error;
        }

        if (attempt < maxRetries) {
          const delay = backoffMs * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const logData = {
      adapter: this.constructor.name,
      message,
      timestamp: new Date().toISOString(),
      ...data
    };

    switch (level) {
      case 'info':
        console.log(JSON.stringify(logData));
        break;
      case 'warn':
        console.warn(JSON.stringify(logData));
        break;
      case 'error':
        console.error(JSON.stringify(logData));
        break;
    }
  }
}