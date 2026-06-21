import { Router } from 'express';
import { io } from '../../index';
import OpenAI from 'openai';
import multer from 'multer';
import { getTextGenerationProvider } from '../../config/env';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024,
    files: 10,
  },
});

const isAllowedAttachment = (mimeType: string) => {
  const allowedMimeTypes = new Set([
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]);

  return allowedMimeTypes.has(mimeType);
};

const mapModel = (requestedModel: string, provider: 'Groq' | 'OpenAI') => {
  if (provider === 'Groq') {
    if (requestedModel.includes('Fast') || requestedModel.includes('3.5')) return 'llama-3.1-8b-instant';
    return 'llama-3.3-70b-versatile';
  }

  if (requestedModel.includes('GPT-4')) return 'gpt-4o';
  if (requestedModel.includes('3.5') || requestedModel.includes('Fast')) return 'gpt-3.5-turbo';
  return 'gpt-3.5-turbo';
};

const streamAssistantResponse = async ({
  message,
  model,
  socketId,
}: {
  message: string;
  model: string;
  socketId: string;
}) => {
  let providerConfig: ReturnType<typeof getTextGenerationProvider>;

  try {
    providerConfig = getTextGenerationProvider();
  } catch (error: any) {
    setTimeout(() => {
      io.to(socketId).emit('chat:stream', `Error: ${error?.message || 'OPENAI_API_KEY or GROQ_API_KEY is not configured in the backend.'}`);
      io.to(socketId).emit('chat:end');
    }, 500);
    return;
  }

  const client = new OpenAI({
    apiKey: providerConfig.apiKey,
    baseURL: providerConfig.baseURL,
  });

  const stream = await client.chat.completions.create({
    model: mapModel(model || '', providerConfig.provider),
    messages: [{ role: 'user', content: message }],
    stream: true,
  });

  let fullContent = '';

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    fullContent += content;
    if (content) {
      io.to(socketId).emit('chat:stream', content);
    }
  }

  io.to(socketId).emit('chat:end', fullContent);
};

const acknowledgeStreamStart = (res: any) => {
  res.json({
    id: Date.now().toString(),
    role: 'assistant',
    status: 'generating',
    timestamp: new Date().toISOString(),
  });
};

// POST /api/v1/chat/conversations/:id/messages
router.post('/conversations/:id/messages', async (req, res) => {
  const { id } = req.params;
  const { message, model, socketId } = req.body;

  if (!socketId) {
    return res.status(400).json({ error: 'socketId is required for streaming' });
  }

  acknowledgeStreamStart(res);

  try {
    await streamAssistantResponse({
      message,
      model,
      socketId,
    });

  } catch (error: any) {
    console.error('OpenAI Error:', error);
    io.to(socketId).emit('chat:stream', `\n[System Error: ${error.message}]`);
    io.to(socketId).emit('chat:end');
  }
});

// POST /api/chat/upload-message and /api/v1/chat/upload-message
router.post(
  '/upload-message',
  upload.fields([
    { name: 'attachments', maxCount: 8 },
    { name: 'attachments[]', maxCount: 8 },
    { name: 'audioBlob', maxCount: 1 },
  ]),
  async (req, res) => {
    const { message = '', model = '', socketId } = req.body;

    if (!socketId) {
      return res.status(400).json({ error: 'socketId is required for streaming' });
    }

    const filesByField = (req.files || {}) as Record<string, Express.Multer.File[]>;
    const attachments = [...(filesByField.attachments || []), ...(filesByField['attachments[]'] || [])];
    const audioBlob = (filesByField.audioBlob || [])[0];

    const invalidFile = attachments.find((file) => !isAllowedAttachment(file.mimetype));
    if (invalidFile) {
      return res.status(400).json({ error: `Unsupported attachment type: ${invalidFile.mimetype}` });
    }

    if (audioBlob && !audioBlob.mimetype.startsWith('audio/')) {
      return res.status(400).json({ error: `Unsupported audio type: ${audioBlob.mimetype}` });
    }

    acknowledgeStreamStart(res);

    const attachmentNames = attachments.map((file) => file.originalname).join(', ');
    const promptWithContext = [
      message,
      attachmentNames ? `\nAttached files: ${attachmentNames}` : '',
      audioBlob ? '\nAudio input attached as voice note.' : '',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await streamAssistantResponse({
        message: promptWithContext,
        model,
        socketId,
      });
    } catch (error: any) {
      console.error('Upload Chat Error:', error);
      io.to(socketId).emit('chat:stream', `\n[System Error: ${error.message}]`);
      io.to(socketId).emit('chat:end');
    }
  }
);

// GET /api/v1/chat/conversations
router.get('/conversations', (req, res) => {
  res.json([
    { id: '1', title: 'React Performance Tips', date: 'Today' },
    { id: '2', title: 'Cyberpunk Concept Art Ideas', date: 'Yesterday' }
  ]);
});

export default router;
