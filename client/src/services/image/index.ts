import { apiClient } from '../api/client';
import { getAuthHeaders } from '../../utils/auth';

export interface GenerateImagePayload {
  prompt: string;
  style?: string;
  dimension?: string;
}

interface GenerateImageResponse {
  image: string;
}

export interface ImageHistoryRecord {
  id: string;
  userId: string;
  prompt: string;
  url: string | null;
  status: string;
  createdAt: string;
}

export const generateImage = async (payload: GenerateImagePayload): Promise<string> => {
  const response = await apiClient.post<GenerateImageResponse>('/images/generate', payload);
  return response.data.image;
};

const getAuthConfig = () => ({
  headers: {
    ...getAuthHeaders(),
  },
});

/**
 * Fetch image generation history for the authenticated user.
 */
export const getImageHistory = async (): Promise<ImageHistoryRecord[]> => {
  const { data } = await apiClient.get('/history/image', getAuthConfig());
  return data?.history || [];
};

/**
 * Save an image generation history entry.
 */
export const saveImageHistory = async (prompt: string, imageUrl: string): Promise<void> => {
  try {
    await apiClient.post(
      '/history/image',
      { prompt, imageUrl },
      getAuthConfig(),
    );
  } catch (error) {
    console.error('Failed to save image history:', error);
  }
};

