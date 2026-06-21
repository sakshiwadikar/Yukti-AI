import { apiClient } from '../api/client';
import { getAuthHeaders } from '../../utils/auth';

export interface RecentActivityRecord {
  id: string;
  userId: string;
  module: 'chat' | 'image' | 'brainstorm' | 'code' | 'writing';
  activity: string;
  timestamp: string;
}

const getAuthConfig = () => ({
  headers: {
    ...getAuthHeaders(),
  },
});

/**
 * Fetch recent activities for the authenticated user.
 * Returns max 5 records, one per module, sorted by most recent.
 */
export const getRecentActivities = async (): Promise<RecentActivityRecord[]> => {
  const { data } = await apiClient.get('/activity', getAuthConfig());
  return data?.activities || [];
};

/**
 * Track (upsert) a recent activity for a specific module.
 * This replaces any previous activity for that module.
 */
export const trackActivity = async (module: string, activity: string): Promise<void> => {
  try {
    await apiClient.post(
      '/activity',
      { module, activity },
      getAuthConfig(),
    );
  } catch (error) {
    // Non-critical — don't let activity tracking failures break the main flow
    console.error('Failed to track activity:', error);
  }
};
