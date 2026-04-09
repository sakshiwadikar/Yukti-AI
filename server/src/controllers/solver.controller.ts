import { Request, Response } from 'express';
import axios from 'axios';
import { generateSolverPrompt, SolverMode } from '../utils/solverPrompt';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const ALLOWED_MODES: SolverMode[] = ['Math', 'DSA', 'DBMS', 'Aptitude', 'Conversion'];
const SOLVER_SYSTEM_PROMPT = [
  'You are a step-by-step math solver.',
  'Do NOT return answers in LaTeX format.',
  'Return answers in plain text only.',
  'Always show steps clearly.',
  'Return final answer as:',
  'Final Answer: <value>'
].join(' ');

export const solveProblem = async (req: Request, res: Response) => {
  const { problem, mode } = req.body ?? {};

  if (!problem || typeof problem !== 'string' || !problem.trim()) {
    return res.status(400).json({ success: false, error: 'problem is required' });
  }

  if (!mode || !ALLOWED_MODES.includes(mode)) {
    return res.status(400).json({ success: false, error: 'mode must be one of Math, DSA, DBMS, Aptitude, Conversion' });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ success: false, error: 'GROQ_API_KEY is not configured' });
  }

  try {
    const userPrompt = generateSolverPrompt(problem, mode);

    const response = await axios.post(
      GROQ_API_URL,
      {
        model: GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content: SOLVER_SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.2,
        max_tokens: 1400
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const solution = response.data?.choices?.[0]?.message?.content;

    if (!solution || typeof solution !== 'string') {
      return res.status(502).json({ success: false, error: 'Empty response from Groq API' });
    }

    return res.status(200).json({ success: true, solution });
  } catch (error: any) {
    const providerMessage =
      error?.response?.data?.error?.message ||
      error?.response?.data?.error ||
      error?.message ||
      'Failed to solve problem';

    return res.status(500).json({ success: false, error: providerMessage });
  }
};
