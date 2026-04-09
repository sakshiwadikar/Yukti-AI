import { apiClient } from '../api/client';

export interface GenerateImagePayload {
  prompt: string;
  style?: string;
  dimension?: string;
}

interface GenerateImageResponse {
  image: string;
}

export const generateImage = async (payload: GenerateImagePayload): Promise<string> => {
  const response = await apiClient.post<GenerateImageResponse>('/images/generate', payload);
  return response.data.image;
};
