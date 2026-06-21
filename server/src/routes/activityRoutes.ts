import { Router, type Response } from 'express';
import { prisma } from '../utils/prisma';
import { authMiddleware, type AuthedRequest } from '../middlewares/authMiddleware';

const router = Router();

router.use(authMiddleware);

/**
 * GET /api/v1/activity
 * Returns the most recent activity per module for the authenticated user.
 * Max 5 results, sorted by timestamp descending.
 */
router.get('/', async (req: AuthedRequest, res: Response) => {
  try {
    const activities = await prisma.recentActivity.findMany({
      where: { userId: req.authUser!.id },
      orderBy: { timestamp: 'desc' },
      take: 5,
    });

    return res.status(200).json({ success: true, activities });
  } catch (error: any) {
    console.error('Fetch recent activities error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to fetch recent activities',
    });
  }
});

/**
 * POST /api/v1/activity
 * Upserts a recent activity for a specific module.
 * Body: { module: string, activity: string }
 * Uses the @@unique([userId, module]) constraint to ensure one record per module per user.
 */
router.post('/', async (req: AuthedRequest, res: Response) => {
  const { module, activity } = req.body || {};

  if (!module || typeof module !== 'string') {
    return res.status(400).json({ success: false, error: 'module is required' });
  }

  if (!activity || typeof activity !== 'string') {
    return res.status(400).json({ success: false, error: 'activity is required' });
  }

  const allowedModules = ['chat', 'image', 'brainstorm', 'code', 'writing'];
  if (!allowedModules.includes(module)) {
    return res.status(400).json({
      success: false,
      error: `module must be one of: ${allowedModules.join(', ')}`,
    });
  }

  try {
    const record = await prisma.recentActivity.upsert({
      where: {
        userId_module: {
          userId: req.authUser!.id,
          module,
        },
      },
      update: {
        activity: activity.slice(0, 500),
        timestamp: new Date(),
      },
      create: {
        userId: req.authUser!.id,
        module,
        activity: activity.slice(0, 500),
        timestamp: new Date(),
      },
    });

    return res.status(200).json({ success: true, activity: record });
  } catch (error: any) {
    console.error('Upsert recent activity error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to save recent activity',
    });
  }
});

export default router;
