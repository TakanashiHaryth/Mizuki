/** Stable errors shared by every configured AI provider. */
export class LLMRateLimitError extends Error {
  constructor() {
    super('AI provider rate limit reached');
    this.name = 'LLMRateLimitError';
  }
}

export class LLMTimeoutError extends Error {
  constructor() {
    super('AI provider request timed out or was cancelled');
    this.name = 'LLMTimeoutError';
  }
}

/** Converts common provider failures into errors the chat handler understands. */
export function classifyProviderError(err: any): Error {
  const message = String(err?.message || err || 'Unknown AI provider error');
  if (err?.status === 429 || err?.code === 429 || message.includes('429')) {
    return new LLMRateLimitError();
  }

  if (
    err?.status === 499 ||
    err?.code === 499 ||
    err?.name === 'AbortError' ||
    err?.name === 'TimeoutError' ||
    /operation was cancelled|\bcancelled\b|\bcanceled\b|timed?\s*out/i.test(message)
  ) {
    return new LLMTimeoutError();
  }

  return err instanceof Error ? err : new Error(message);
}
