import { apiClient } from '../api/client';

export interface GenerateCodePayload {
  prompt: string;
}

interface GenerateCodeResponse {
  response: string;
}

export const generateCode = async (payload: GenerateCodePayload): Promise<string> => {
  const response = await apiClient.post<GenerateCodeResponse>('/code/generate-code', payload);
  return response.data.response;
};
