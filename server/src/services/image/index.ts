import dns from 'dns';
import { InferenceClient } from '@huggingface/inference';
import { getHfToken, getHfTokenSafe, validateHfTokenFormat } from '../../config/env';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GenerateImageInput {
  prompt: string;
  style?: string;
  size?: string;
}

export type HfErrorType =
  | 'DNS_ERROR'
  | 'TIMEOUT'
  | 'AUTH_ERROR'
  | 'RATE_LIMIT'
  | 'MODEL_LOADING'
  | 'TOKEN_INVALID'
  | 'SERVICE_UNAVAILABLE'
  | 'UNKNOWN';

export interface HfClassifiedError {
  type: HfErrorType;
  message: string;
  retryable: boolean;
  retryAfterMs?: number;
}

export interface HealthCheckResult {
  dns: { ok: boolean; error?: string };
  internet: { ok: boolean; error?: string };
  huggingFace: { ok: boolean; error?: string };
  auth: { ok: boolean; error?: string };
  overall: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Hugging Face model for text-to-image generation.
 * FLUX.1-schnell is a fast, high-quality model available via Inference Providers.
 */
const HF_IMAGE_MODEL = 'black-forest-labs/FLUX.1-schnell';

/** Maximum time (ms) to wait for a single inference call. */
const INFERENCE_TIMEOUT_MS = 120_000;

/** Retry configuration */
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2_000;
const MAX_DELAY_MS = 16_000;

const LOG_PREFIX = '[HF Image]';

// ---------------------------------------------------------------------------
// Size helpers
// ---------------------------------------------------------------------------

const sizeMap: Record<string, string> = {
  '1024x1024': '1024x1024',
  '16:9 (1920x1080)': '1920x1080',
  '9:16 (1080x1920)': '1080x1920'
};

const getDimensions = (size?: string): { width: number; height: number } => {
  const normalized = sizeMap[size || ''] || '1024x1024';
  const [width, height] = normalized.split('x').map((v) => Number(v));

  return {
    width: Number.isFinite(width) ? width : 1024,
    height: Number.isFinite(height) ? height : 1024
  };
};

const buildPrompt = (prompt: string, style?: string): string => {
  if (!style) {
    return prompt;
  }

  return `${prompt}, ${style} style, highly detailed`;
};

// ---------------------------------------------------------------------------
// Error classification
// ---------------------------------------------------------------------------

export const classifyError = (error: unknown): HfClassifiedError => {
  if (error instanceof Error) {
    const msg = error.message || '';
    const anyErr = error as any;

    // DNS resolution failure
    if (
      msg.includes('ENOTFOUND') ||
      msg.includes('EAI_AGAIN') ||
      msg.includes('getaddrinfo')
    ) {
      return {
        type: 'DNS_ERROR',
        message: `DNS resolution failed. Cannot resolve Hugging Face servers. Check your internet connection and DNS settings. Original: ${msg}`,
        retryable: true
      };
    }

    // Timeout
    if (
      msg.includes('ETIMEDOUT') ||
      msg.includes('ESOCKETTIMEDOUT') ||
      msg.includes('timeout') ||
      msg.includes('AbortError')
    ) {
      return {
        type: 'TIMEOUT',
        message: `Request timed out after ${INFERENCE_TIMEOUT_MS / 1000}s. The model may be under heavy load. Try again later.`,
        retryable: true
      };
    }

    // HTTP status-based errors (the SDK throws errors with statusCode or status)
    const status = anyErr.statusCode ?? anyErr.status;

    if (status === 401 || status === 403) {
      return {
        type: 'AUTH_ERROR',
        message:
          'Authentication failed. Your HF_TOKEN is invalid or lacks "Inference Providers" permission. ' +
          'Regenerate it at https://huggingface.co/settings/tokens with the correct scope.',
        retryable: false
      };
    }

    if (status === 429) {
      const retryAfterHeader = anyErr.headers?.['retry-after'];
      const retryAfterMs = retryAfterHeader
        ? parseInt(retryAfterHeader, 10) * 1000
        : 60_000;

      return {
        type: 'RATE_LIMIT',
        message: `Rate limited by Hugging Face. Retry after ${Math.ceil(retryAfterMs / 1000)}s.`,
        retryable: true,
        retryAfterMs
      };
    }

    if (status === 503) {
      // Model loading or service temporarily unavailable
      const isModelLoading =
        msg.includes('loading') || msg.includes('currently loading');

      return {
        type: isModelLoading ? 'MODEL_LOADING' : 'SERVICE_UNAVAILABLE',
        message: isModelLoading
          ? `Model "${HF_IMAGE_MODEL}" is loading. This usually takes 20-60s. Retrying...`
          : `Hugging Face service is temporarily unavailable. ${msg}`,
        retryable: true,
        retryAfterMs: isModelLoading ? 20_000 : 5_000
      };
    }
  }

  const fallbackMsg =
    error instanceof Error ? error.message : String(error);

  return {
    type: 'UNKNOWN',
    message: `Unexpected error during image generation: ${fallbackMsg}`,
    retryable: false
  };
};

// ---------------------------------------------------------------------------
// Retry with exponential backoff + jitter
// ---------------------------------------------------------------------------

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const computeDelay = (attempt: number, overrideMs?: number): number => {
  if (overrideMs) {
    return overrideMs;
  }

  const exponential = BASE_DELAY_MS * Math.pow(2, attempt);
  const capped = Math.min(exponential, MAX_DELAY_MS);
  // Add 0-25% jitter to prevent thundering herd
  const jitter = capped * Math.random() * 0.25;
  return Math.floor(capped + jitter);
};

// ---------------------------------------------------------------------------
// DNS diagnostics
// ---------------------------------------------------------------------------

const resolveDns = async (hostname: string): Promise<{ ok: boolean; error?: string }> => {
  try {
    await dns.promises.lookup(hostname);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || 'DNS lookup failed' };
  }
};

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

/**
 * Comprehensive health check that validates DNS resolution, internet
 * connectivity, Hugging Face endpoint accessibility, and token authentication.
 */
export const checkHuggingFaceHealth = async (): Promise<HealthCheckResult> => {
  const result: HealthCheckResult = {
    dns: { ok: false },
    internet: { ok: false },
    huggingFace: { ok: false },
    auth: { ok: false },
    overall: false
  };

  // 1. DNS resolution for huggingface.co
  console.log(`${LOG_PREFIX} Health check: testing DNS resolution...`);
  result.dns = await resolveDns('huggingface.co');

  // 2. General internet connectivity (resolve a known-good host)
  console.log(`${LOG_PREFIX} Health check: testing internet connectivity...`);
  result.internet = await resolveDns('dns.google');

  // 3. Hugging Face API accessibility + auth
  const token = getHfTokenSafe();

  if (!token) {
    result.huggingFace = { ok: false, error: 'HF_TOKEN is not configured in server/.env' };
    result.auth = { ok: false, error: 'No token available' };
  } else {
    const tokenValidation = validateHfTokenFormat(token);
    if (!tokenValidation.valid) {
      result.auth = { ok: false, error: tokenValidation.reason };
    } else {
      console.log(`${LOG_PREFIX} Health check: testing Hugging Face API...`);

      // Test API reachability by resolving the router endpoint
      const routerDns = await resolveDns('router.huggingface.co');
      if (routerDns.ok) {
        result.huggingFace = { ok: true };

        // Test auth by making a lightweight inference call with a tiny prompt
        // We use an AbortController to cancel quickly — we just want to check auth
        try {
          const client = new InferenceClient(token);
          const controller = new AbortController();
          // Abort after 15s — we just need to confirm auth works, not get a full image
          const authTimeout = setTimeout(() => controller.abort(), 15_000);

          await client.textToImage(
            {
              model: HF_IMAGE_MODEL,
              inputs: 'test',
              parameters: { width: 256, height: 256 }
            },
            { signal: controller.signal }
          );

          clearTimeout(authTimeout);
          result.auth = { ok: true };
        } catch (err: any) {
          const classified = classifyError(err);

          if (classified.type === 'AUTH_ERROR') {
            result.auth = { ok: false, error: classified.message };
          } else if (classified.type === 'TIMEOUT' || err?.name === 'AbortError') {
            // Aborted or timed out — API was reachable, auth was accepted (no 401)
            result.auth = { ok: true };
          } else {
            // Other errors (model loading, rate limit, etc.) — API is reachable, auth likely OK
            result.auth = { ok: true };
          }
        }
      } else {
        result.huggingFace = { ok: false, error: `Cannot resolve router.huggingface.co: ${routerDns.error}` };
        result.auth = { ok: false, error: 'Cannot verify — API unreachable' };
      }
    }
  }

  result.overall = result.dns.ok && result.internet.ok && result.huggingFace.ok && result.auth.ok;

  console.log(`${LOG_PREFIX} Health check complete:`, JSON.stringify(result, null, 2));
  return result;
};

// ---------------------------------------------------------------------------
// Core image generation with retries
// ---------------------------------------------------------------------------

const generateWithRetry = async (
  client: InferenceClient,
  finalPrompt: string,
  width: number,
  height: number
): Promise<string> => {
  let lastError: HfClassifiedError | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      console.log(
        `${LOG_PREFIX} Attempt ${attempt + 1}/${MAX_RETRIES} — model: ${HF_IMAGE_MODEL}, ` +
        `prompt: "${finalPrompt.slice(0, 80)}${finalPrompt.length > 80 ? '...' : ''}", ` +
        `size: ${width}x${height}`
      );

      // Use AbortController for timeout protection
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), INFERENCE_TIMEOUT_MS);

      try {
        // Request dataUrl output directly — SDK returns a base64 data URI string
        const dataUrl: string = await client.textToImage(
          {
            model: HF_IMAGE_MODEL,
            inputs: finalPrompt,
            parameters: {
              width,
              height
            }
          },
          {
            outputType: 'dataUrl',
            signal: controller.signal
          }
        );

        clearTimeout(timeoutId);

        console.log(`${LOG_PREFIX} Inference succeeded on attempt ${attempt + 1}`);
        return dataUrl;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (err: unknown) {
      lastError = classifyError(err);
      console.error(
        `${LOG_PREFIX} Attempt ${attempt + 1} failed — [${lastError.type}] ${lastError.message}`
      );

      // Don't retry non-retryable errors
      if (!lastError.retryable) {
        break;
      }

      // Don't sleep after the last attempt
      if (attempt < MAX_RETRIES - 1) {
        const delay = computeDelay(attempt, lastError.retryAfterMs);
        console.log(`${LOG_PREFIX} Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  // All retries exhausted — throw the classified error
  const errorToThrow = new Error(
    lastError?.message || 'Image generation failed after all retries'
  );
  (errorToThrow as any).hfErrorType = lastError?.type || 'UNKNOWN';
  (errorToThrow as any).retryable = lastError?.retryable ?? false;
  throw errorToThrow;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate an image from a text prompt using Hugging Face Inference Providers.
 *
 * - Uses the official `@huggingface/inference` SDK (InferenceClient).
 * - Automatically retries transient failures with exponential backoff.
 * - Classifies errors for meaningful diagnostics.
 * - Returns a base64 data URI string.
 */
export const generateImageFromPrompt = async ({
  prompt,
  style,
  size
}: GenerateImageInput): Promise<string> => {
  const { width, height } = getDimensions(size);
  const finalPrompt = buildPrompt(prompt, style);
  const token = getHfToken();

  // Validate token format before making any network calls
  const tokenCheck = validateHfTokenFormat(token);
  if (!tokenCheck.valid) {
    const err = new Error(tokenCheck.reason!);
    (err as any).hfErrorType = 'TOKEN_INVALID' satisfies HfErrorType;
    (err as any).retryable = false;
    throw err;
  }

  console.log(`${LOG_PREFIX} Starting image generation...`);
  console.log(`${LOG_PREFIX} Using @huggingface/inference SDK (InferenceClient)`);
  console.log(`${LOG_PREFIX} Model: ${HF_IMAGE_MODEL}`);

  const client = new InferenceClient(token);

  // Run a quick DNS pre-check to give a clear error early
  const dnsCheck = await resolveDns('huggingface.co');
  if (!dnsCheck.ok) {
    console.error(`${LOG_PREFIX} DNS pre-check FAILED: ${dnsCheck.error}`);
    console.error(
      `${LOG_PREFIX} Troubleshooting: check your internet connection, DNS settings, ` +
      `or add dns: [8.8.8.8, 1.1.1.1] to your Docker service config.`
    );
    const err = new Error(
      `Cannot resolve huggingface.co — DNS failure. ` +
      `Check your internet connection. If running in Docker, add dns: [8.8.8.8, 1.1.1.1] to your service. ` +
      `Detail: ${dnsCheck.error}`
    );
    (err as any).hfErrorType = 'DNS_ERROR' satisfies HfErrorType;
    (err as any).retryable = false;
    throw err;
  }
  console.log(`${LOG_PREFIX} DNS pre-check passed`);

  // Generate with retries
  const dataUrl = await generateWithRetry(client, finalPrompt, width, height);

  console.log(`${LOG_PREFIX} Image generated successfully`);

  return dataUrl;
};
