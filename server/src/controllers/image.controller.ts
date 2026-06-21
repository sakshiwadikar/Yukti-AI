import { Request, Response } from 'express';
import {
  generateImageFromPrompt,
  checkHuggingFaceHealth,
  HfErrorType
} from '../services/image';

/**
 * Maps HF error types to appropriate HTTP status codes.
 */
const httpStatusForErrorType: Record<HfErrorType, number> = {
  DNS_ERROR: 503,
  TIMEOUT: 504,
  AUTH_ERROR: 401,
  RATE_LIMIT: 429,
  MODEL_LOADING: 503,
  TOKEN_INVALID: 500,
  SERVICE_UNAVAILABLE: 503,
  UNKNOWN: 500
};

/**
 * POST /api/image/generate
 * Generate an image from a text prompt.
 */
export const generateImage = async (req: Request, res: Response) => {
  const { prompt, style, dimension } = req.body;

  try {
    const image = await generateImageFromPrompt({
      prompt,
      style,
      size: dimension
    });

    return res.json({ image });
  } catch (error: any) {
    const message = error?.message || 'Failed to generate image';
    const errorType: HfErrorType = error?.hfErrorType || 'UNKNOWN';
    const retryable: boolean = error?.retryable ?? false;
    const status = httpStatusForErrorType[errorType] || 500;

    console.error(`[Image Controller] ${errorType}: ${message}`);

    return res.status(status).json({
      error: message,
      errorType,
      retryable
    });
  }
};

/**
 * GET /api/image/health
 * Diagnostic endpoint — checks DNS, internet, HF API, and auth.
 */
export const imageHealthCheck = async (_req: Request, res: Response) => {
  try {
    const health = await checkHuggingFaceHealth();
    const status = health.overall ? 200 : 503;

    return res.status(status).json(health);
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || 'Health check failed unexpectedly',
      overall: false
    });
  }
};
