import { Router, type Response } from 'express';
import { prisma } from '../utils/prisma';
import { authMiddleware, type AuthedRequest } from '../middlewares/authMiddleware';

const router = Router();

router.use(authMiddleware);

// ──────────────────────────────────────────────
// Code History
// ──────────────────────────────────────────────

/**
 * GET /api/v1/history/code
 * Returns code generation history for the authenticated user.
 */
router.get('/code', async (req: AuthedRequest, res: Response) => {
  try {
    const history = await prisma.codeHistory.findMany({
      where: { userId: req.authUser!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return res.status(200).json({ success: true, history });
  } catch (error: any) {
    console.error('Fetch code history error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to fetch code history',
    });
  }
});

/**
 * POST /api/v1/history/code
 * Saves a code generation history entry.
 * Body: { prompt: string, response: string }
 */
router.post('/code', async (req: AuthedRequest, res: Response) => {
  const { prompt, response } = req.body || {};

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ success: false, error: 'prompt is required' });
  }

  if (!response || typeof response !== 'string') {
    return res.status(400).json({ success: false, error: 'response is required' });
  }

  try {
    const record = await prisma.codeHistory.create({
      data: {
        userId: req.authUser!.id,
        prompt,
        response,
      },
    });

    return res.status(201).json({ success: true, entry: record });
  } catch (error: any) {
    console.error('Save code history error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to save code history',
    });
  }
});

// ──────────────────────────────────────────────
// Writing History
// ──────────────────────────────────────────────

/**
 * GET /api/v1/history/writing
 * Returns writing history for the authenticated user.
 */
router.get('/writing', async (req: AuthedRequest, res: Response) => {
  try {
    const history = await prisma.writingHistory.findMany({
      where: { userId: req.authUser!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return res.status(200).json({ success: true, history });
  } catch (error: any) {
    console.error('Fetch writing history error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to fetch writing history',
    });
  }
});

/**
 * POST /api/v1/history/writing
 * Saves a writing history entry.
 * Body: { prompt: string, mode: string, response: string }
 */
router.post('/writing', async (req: AuthedRequest, res: Response) => {
  const { prompt, mode, response } = req.body || {};

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ success: false, error: 'prompt is required' });
  }

  if (!mode || typeof mode !== 'string') {
    return res.status(400).json({ success: false, error: 'mode is required' });
  }

  if (!response || typeof response !== 'string') {
    return res.status(400).json({ success: false, error: 'response is required' });
  }

  try {
    const record = await prisma.writingHistory.create({
      data: {
        userId: req.authUser!.id,
        prompt,
        mode,
        response,
      },
    });

    return res.status(201).json({ success: true, entry: record });
  } catch (error: any) {
    console.error('Save writing history error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to save writing history',
    });
  }
});

// ──────────────────────────────────────────────
// Image History (uses existing ImageTask model)
// ──────────────────────────────────────────────

/**
 * GET /api/v1/history/image
 * Returns image generation history for the authenticated user.
 */
router.get('/image', async (req: AuthedRequest, res: Response) => {
  try {
    const history = await prisma.imageTask.findMany({
      where: { userId: req.authUser!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return res.status(200).json({ success: true, history });
  } catch (error: any) {
    console.error('Fetch image history error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to fetch image history',
    });
  }
});

/**
 * POST /api/v1/history/image
 * Saves an image generation history entry.
 * Body: { prompt: string, imageUrl: string }
 */
router.post('/image', async (req: AuthedRequest, res: Response) => {
  const { prompt, imageUrl } = req.body || {};

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ success: false, error: 'prompt is required' });
  }

  try {
    const record = await prisma.imageTask.create({
      data: {
        userId: req.authUser!.id,
        prompt,
        url: imageUrl || null,
        status: 'completed',
      },
    });

    return res.status(201).json({ success: true, entry: record });
  } catch (error: any) {
    console.error('Save image history error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to save image history',
    });
  }
});

export default router;
