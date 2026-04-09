import { Request, Response } from 'express';
import { generateCodeFromPrompt } from '../services/code';

export const generateCode = async (req: Request, res: Response) => {
  const prompt = req.body?.prompt;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const response = await generateCodeFromPrompt({ prompt: prompt.trim() });

    return res.status(200).json({ response });
  } catch (error: any) {
    const providerMessage = error?.response?.data?.error?.message || error?.response?.data?.error;
    const statusCode = error?.response?.status;

    if (statusCode === 401 || statusCode === 403) {
      return res.status(502).json({ error: 'Groq authentication failed. Check GROQ_API_KEY.' });
    }

    if (statusCode === 429) {
      return res.status(429).json({ error: 'Groq rate limit exceeded. Please try again shortly.' });
    }

    if (statusCode && statusCode >= 400 && statusCode < 500) {
      return res.status(400).json({ error: providerMessage || 'Invalid request sent to Groq API' });
    }

    return res.status(500).json({ error: providerMessage || error?.message || 'Failed to generate code' });
  }
};
