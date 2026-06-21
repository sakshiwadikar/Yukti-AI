import { Request, Response } from 'express';
import axios from 'axios';
import { generateWritingPrompt, WRITING_SYSTEM_PROMPT, WritingMode } from '../utils/writingPrompt';
import { requireGroqApiKey } from '../config/env';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const ALLOWED_MODES: WritingMode[] = [
  'Rewrite',
  'Email',
  'Grammar Fix',
  'Paragraph',
  'Summarize',
  'Resume Bullet',
  'Exam Answer'
];

export const generateWriting = async (req: Request, res: Response) => {
  const { text, mode } = req.body ?? {};

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ success: false, error: 'text is required' });
  }

  if (!mode || !ALLOWED_MODES.includes(mode)) {
    return res.status(400).json({
      success: false,
      error: 'mode must be one of Rewrite, Email, Grammar Fix, Paragraph, Summarize, Resume Bullet, Exam Answer'
    });
  }

  try {
    const apiKey = requireGroqApiKey();
    const userPrompt = generateWritingPrompt(text, mode);

    const response = await axios.post(
      GROQ_API_URL,
      {
        model: GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content: WRITING_SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1200
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;

    if (!content || typeof content !== 'string') {
      return res.status(502).json({ success: false, error: 'Empty response from Groq API' });
    }

    return res.status(200).json({ success: true, response: content.trim() });
  } catch (error: any) {
    const providerMessage =
      error?.response?.data?.error?.message ||
      error?.response?.data?.error ||
      error?.message ||
      'Failed to generate writing response';

    return res.status(500).json({ success: false, error: providerMessage });
  }
};
