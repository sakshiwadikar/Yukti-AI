import { apiClient } from '../api/client';
import { getAuthHeaders } from '../../utils/auth';

export interface WritingHistoryRecord {
  id: string;
  userId: string;
  prompt: string;
  mode: string;
  response: string;
  createdAt: string;
}

const getAuthConfig = () => ({
  headers: {
    ...getAuthHeaders(),
  },
});

/**
 * Fetch writing history for the authenticated user.
 */
export const getWritingHistory = async (): Promise<WritingHistoryRecord[]> => {
  const { data } = await apiClient.get('/history/writing', getAuthConfig());
  return data?.history || [];
};

/**
 * Save a writing history entry.
 */
export const saveWritingHistory = async (
  prompt: string,
  mode: string,
  response: string,
): Promise<void> => {
  try {
    await apiClient.post(
      '/history/writing',
      { prompt, mode, response },
      getAuthConfig(),
    );
  } catch (error) {
    console.error('Failed to save writing history:', error);
  }
};
