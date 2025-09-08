/**
 * Infrastructure-specific error classes
 */

export class InfrastructureError extends Error {
  public readonly code: string;
  public readonly context: Record<string, unknown>;
  public readonly timestamp: string;

  constructor(
    message: string,
    code: string,
    context: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = 'InfrastructureError';
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();

    // Maintain proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, InfrastructureError);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

export class APIError extends InfrastructureError {
  public readonly statusCode?: number;
  public readonly retryAfter?: string;

  constructor(
    message: string,
    code: string,
    context: Record<string, unknown> & { status?: number; retryAfter?: string } = {}
  ) {
    super(message, code, context);
    this.name = 'APIError';
    this.statusCode = context.status;
    this.retryAfter = context.retryAfter;
  }

  get isRetryable(): boolean {
    return this.statusCode === 429 || // Rate limited
           (this.statusCode !== undefined && this.statusCode >= 500); // Server errors
  }
}

export class AuthenticationError extends InfrastructureError {
  constructor(
    message: string,
    code: string = 'AUTH_ERROR',
    context: Record<string, unknown> = {}
  ) {
    super(message, code, context);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends InfrastructureError {
  public readonly field?: string;

  constructor(
    message: string,
    field?: string,
    context: Record<string, unknown> = {}
  ) {
    super(message, 'VALIDATION_ERROR', { ...context, field });
    this.name = 'ValidationError';
    this.field = field;
  }
}

export class TimeoutError extends InfrastructureError {
  constructor(
    message: string = 'Operation timed out',
    context: Record<string, unknown> = {}
  ) {
    super(message, 'TIMEOUT_ERROR', context);
    this.name = 'TimeoutError';
  }
}