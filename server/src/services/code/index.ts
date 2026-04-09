import axios from 'axios';

interface GenerateCodeInput {
  prompt: string;
}

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

export const generateCodeFromPrompt = async ({ prompt }: GenerateCodeInput): Promise<string> => {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  const response = await axios.post(
    GROQ_API_URL,
    {
      model: GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a senior coding assistant. Respond with clear, practical code and concise explanations when needed.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
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
    throw new Error('Empty response from Groq API');
  }

  return content;
};
