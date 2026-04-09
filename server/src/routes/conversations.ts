import { Router } from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { verifyToken } from '../services/auth';

const router = Router();

type MessagePayload = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

type StoredConversation = {
  id: string;
  userId: string;
  title: string;
  module: 'chat';
  createdAt: Date;
  updatedAt: Date;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    createdAt: Date;
  }>;
};

const memoryConversations = new Map<string, StoredConversation>();

const isDbUnavailable = (error: any): boolean => {
  return (
    error?.code === 'P1001' ||
    String(error?.message || '').toLowerCase().includes("can't reach database") ||
    String(error?.message || '').toLowerCase().includes('database server')
  );
};

const getAuthUserId = (req: Request): string | null => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  const payload = verifyToken(token);
  return payload?.id || null;
};

const ensureAuthorizedForUser = (req: Request, res: Response, targetUserId: string): boolean => {
  const authUserId = getAuthUserId(req);
  if (!authUserId) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }

  if (authUserId !== targetUserId) {
    res.status(403).json({ error: 'Forbidden: user mismatch' });
    return false;
  }

  return true;
};

const normalizeWord = (word: string): string => {
  if (word.toLowerCase() === 'dbms') return 'DBMS';
  if (word.toLowerCase() === 'ai') return 'AI';
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
};

const generateConversationTitle = (firstMessage: string): string => {
  const cleaned = firstMessage
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    return 'New chat discussion';
  }

  const stopWords = new Set([
    'what', 'is', 'are', 'the', 'a', 'an', 'in', 'on', 'for', 'to', 'of', 'about',
    'please', 'can', 'you', 'me', 'explain', 'tell', 'how', 'with'
  ]);

  const words = cleaned.split(' ');
  const keyWords = words
    .filter((word) => !stopWords.has(word.toLowerCase()))
    .slice(0, 4)
    .map(normalizeWord);

  const base = keyWords.length > 0 ? keyWords : words.slice(0, 3).map(normalizeWord);
  const titleWords = [...base.slice(0, 4), 'discussion'].slice(0, 5);
  return titleWords.join(' ');
};

const serializeConversation = (conversation: any) => ({
  conversationId: conversation.id,
  userId: conversation.userId,
  title: conversation.title || 'New chat discussion',
  messages: conversation.messages.map((message: any) => ({
    role: message.role,
    content: message.content,
  })),
  createdAt: conversation.createdAt,
  updatedAt: conversation.updatedAt,
});

const getMemoryConversationsByUser = (userId: string) => {
  return [...memoryConversations.values()]
    .filter((conversation) => conversation.userId === userId && conversation.module === 'chat')
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
};

router.get('/user/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;

  if (!ensureAuthorizedForUser(req, res, userId)) {
    return;
  }

  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        userId,
        module: 'chat',
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return res.json(conversations.map(serializeConversation));
  } catch (error: any) {
    if (isDbUnavailable(error)) {
      return res.json(getMemoryConversationsByUser(userId).map(serializeConversation));
    }

    console.error('Fetch conversations error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to fetch conversations' });
  }
});

router.post('/create', async (req: Request, res: Response) => {
  const { userId, message } = req.body as { userId?: string; message?: string };

  if (!userId || !message || !message.trim()) {
    return res.status(400).json({ error: 'userId and first message are required' });
  }

  if (!ensureAuthorizedForUser(req, res, userId)) {
    return;
  }

  try {
    const conversation = await prisma.conversation.create({
      data: {
        userId,
        module: 'chat',
        title: generateConversationTitle(message),
        messages: {
          create: {
            role: 'user',
            content: message,
          },
        },
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    return res.status(201).json(serializeConversation(conversation));
  } catch (error: any) {
    if (isDbUnavailable(error)) {
      const now = new Date();
      const fallbackConversation: StoredConversation = {
        id: `mem_conv_${Date.now()}`,
        userId,
        module: 'chat',
        title: generateConversationTitle(message),
        createdAt: now,
        updatedAt: now,
        messages: [
          {
            role: 'user',
            content: message,
            createdAt: now,
          },
        ],
      };

      memoryConversations.set(fallbackConversation.id, fallbackConversation);
      return res.status(201).json(serializeConversation(fallbackConversation));
    }

    console.error('Create conversation error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to create conversation' });
  }
});

router.post('/update', async (req: Request, res: Response) => {
  const { conversationId, userId, message } = req.body as {
    conversationId?: string;
    userId?: string;
    message?: MessagePayload;
  };

  if (!conversationId || !userId || !message?.content || !message?.role) {
    return res.status(400).json({ error: 'conversationId, userId and message are required' });
  }

  if (!ensureAuthorizedForUser(req, res, userId)) {
    return;
  }

  try {
    const existingConversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, userId: true, module: true },
    });

    if (!existingConversation || existingConversation.module !== 'chat') {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (existingConversation.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden: conversation ownership mismatch' });
    }

    const updatedConversation = await prisma.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        messages: {
          create: {
            role: message.role,
            content: message.content,
          },
        },
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    return res.json(serializeConversation(updatedConversation));
  } catch (error: any) {
    if (isDbUnavailable(error)) {
      const fallbackConversation = memoryConversations.get(conversationId);
      if (!fallbackConversation || fallbackConversation.module !== 'chat') {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      if (fallbackConversation.userId !== userId) {
        return res.status(403).json({ error: 'Forbidden: conversation ownership mismatch' });
      }

      fallbackConversation.messages.push({
        role: message.role,
        content: message.content,
        createdAt: new Date(),
      });
      fallbackConversation.updatedAt = new Date();
      memoryConversations.set(conversationId, fallbackConversation);

      return res.json(serializeConversation(fallbackConversation));
    }

    console.error('Update conversation error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to update conversation' });
  }
});

router.delete('/delete/:conversationId', async (req: Request, res: Response) => {
  const { conversationId } = req.params;
  const authUserId = getAuthUserId(req);

  if (!authUserId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const existingConversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, userId: true, module: true },
    });

    if (!existingConversation || existingConversation.module !== 'chat') {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (existingConversation.userId !== authUserId) {
      return res.status(403).json({ error: 'Forbidden: conversation ownership mismatch' });
    }

    await prisma.message.deleteMany({
      where: {
        conversationId,
      },
    });

    await prisma.conversation.delete({
      where: {
        id: conversationId,
      },
    });

    return res.json({ success: true });
  } catch (error: any) {
    if (isDbUnavailable(error)) {
      const fallbackConversation = memoryConversations.get(conversationId);
      if (!fallbackConversation || fallbackConversation.module !== 'chat') {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      if (fallbackConversation.userId !== authUserId) {
        return res.status(403).json({ error: 'Forbidden: conversation ownership mismatch' });
      }

      memoryConversations.delete(conversationId);
      return res.json({ success: true });
    }

    console.error('Delete conversation error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to delete conversation' });
  }
});

// Compatibility alias requested by spec: GET /api/conversations/:userId
router.get('/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;

  if (!ensureAuthorizedForUser(req, res, userId)) {
    return;
  }

  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        userId,
        module: 'chat',
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return res.json(conversations.map(serializeConversation));
  } catch (error: any) {
    if (isDbUnavailable(error)) {
      return res.json(getMemoryConversationsByUser(userId).map(serializeConversation));
    }

    console.error('Fetch conversations error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to fetch conversations' });
  }
});

export default router;
