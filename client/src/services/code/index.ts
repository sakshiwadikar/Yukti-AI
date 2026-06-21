import { apiClient } from '../api/client';
import { getAuthHeaders } from '../../utils/auth';

export interface GenerateCodePayload {
  prompt: string;
}

interface GenerateCodeResponse {
  response: string;
}

export interface CodeHistoryRecord {
  id: string;
  userId: string;
  prompt: string;
  response: string;
  createdAt: string;
}

export const generateCode = async (payload: GenerateCodePayload): Promise<string> => {
  const response = await apiClient.post<GenerateCodeResponse>('/code/generate-code', payload);
  return response.data.response;
};

const getAuthConfig = () => ({
  headers: {
    ...getAuthHeaders(),
  },
});

/**
 * Fetch code generation history for the authenticated user.
 */
export const getCodeHistory = async (): Promise<CodeHistoryRecord[]> => {
  const { data } = await apiClient.get('/history/code', getAuthConfig());
  return data?.history || [];
};

/**
 * Save a code generation history entry.
 */
export const saveCodeHistory = async (prompt: string, response: string): Promise<void> => {
  try {
    await apiClient.post(
      '/history/code',
      { prompt, response },
      getAuthConfig(),
    );
  } catch (error) {
    console.error('Failed to save code history:', error);
  }
};

