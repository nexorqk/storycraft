export class GenerationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly isRetryable: boolean = false,
  ) {
    super(message);
    this.name = 'GenerationError';
  }
}

export class ContentPolicyError extends GenerationError {
  constructor(message: string = 'Content policy violation') {
    super(message, 'CONTENT_POLICY_VIOLATION', false);
    this.name = 'ContentPolicyError';
  }
}

export class ProviderTimeoutError extends GenerationError {
  constructor(message: string = 'Provider request timed out') {
    super(message, 'PROVIDER_TIMEOUT', true);
    this.name = 'ProviderTimeoutError';
  }
}

export class ProviderRateLimitError extends GenerationError {
  constructor(message: string = 'Provider rate limit exceeded') {
    super(message, 'PROVIDER_RATE_LIMIT', true);
    this.name = 'ProviderRateLimitError';
  }
}

export class ProviderServerError extends GenerationError {
  constructor(message: string = 'Provider server error') {
    super(message, 'PROVIDER_SERVER_ERROR', true);
    this.name = 'ProviderServerError';
  }
}

export class ProviderAuthError extends GenerationError {
  constructor(message: string = 'Provider authentication failed') {
    super(message, 'PROVIDER_AUTH_ERROR', false);
    this.name = 'ProviderAuthError';
  }
}
