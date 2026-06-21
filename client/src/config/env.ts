const DEFAULT_API_BASE_URL = 'http://localhost:5000/api/v1';

/**
 * Required client environment variable:
 * - VITE_API_BASE_URL: backend API root used by the frontend.
 *   The app keeps a localhost fallback so existing local dev behavior stays unchanged.
 */
export const getApiBaseUrl = (): string => {
  return import.meta.env.VITE_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL;
};