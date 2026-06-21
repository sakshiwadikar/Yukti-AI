import path from 'path';
import dotenv from 'dotenv';

const envFilePath = path.resolve(__dirname, '../../.env');

dotenv.config({ path: envFilePath });

const trimValue = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const optionalEnv = (name: string): string | undefined => {
  return trimValue(process.env[name]);
};

const envWithDefault = (name: string, fallback: string): string => {
  return trimValue(process.env[name]) || fallback;
};

const parsePort = (value: string | undefined, fallback: number): number => {
  const parsedPort = Number(value);

  if (!Number.isFinite(parsedPort) || parsedPort <= 0) {
    return fallback;
  }

  return parsedPort;
};

const requiredEnvNames = ['DATABASE_URL', 'JWT_SECRET'] as const;

const missingRequiredEnvNames = requiredEnvNames.filter((name) => !optionalEnv(name));

const missingTextGenerationEnv = !optionalEnv('OPENAI_API_KEY') && !optionalEnv('GROQ_API_KEY')
  ? ['OPENAI_API_KEY or GROQ_API_KEY']
  : [];

const startupMissingVariables = [...missingRequiredEnvNames, ...missingTextGenerationEnv];

if (startupMissingVariables.length > 0) {
  const loadedFrom = path.relative(process.cwd(), envFilePath);
  throw new Error(
    `Missing required environment variables in ${loadedFrom}: ${startupMissingVariables.join(', ')}.`
  );
}

/**
 * Required server environment variables:
 * - DATABASE_URL: PostgreSQL connection string used by Prisma.
 * - JWT_SECRET: signs and verifies authentication tokens.
 * - OPENAI_API_KEY or GROQ_API_KEY: required for chat, brainstorming, code, writing, and solver features.
 * - HF_TOKEN: used for image generation via Hugging Face direct model inference.
 */
export const serverEnv = {
  PORT: parsePort(process.env.PORT, 5000),
  DATABASE_URL: optionalEnv('DATABASE_URL') as string,
  JWT_SECRET: optionalEnv('JWT_SECRET') as string,
  OPENAI_API_KEY: optionalEnv('OPENAI_API_KEY'),
  GROQ_API_KEY: optionalEnv('GROQ_API_KEY'),
  HF_TOKEN: optionalEnv('HF_TOKEN')
} as const;

console.log('HF_TOKEN loaded:', !!serverEnv.HF_TOKEN);

export const getHfToken = (): string => {
  const token = serverEnv.HF_TOKEN;

  if (!token) {
    throw new Error(
      'Image generation is not configured. Set HF_TOKEN in server/.env.'
    );
  }

  return token;
};

/**
 * Non-throwing version of getHfToken. Returns null if the token is not set.
 * Used by health-check diagnostics where a missing token is not fatal.
 */
export const getHfTokenSafe = (): string | null => {
  return serverEnv.HF_TOKEN ?? null;
};

/**
 * Validates the format of a Hugging Face token.
 * Checks for the `hf_` prefix and a minimum length.
 */
export const validateHfTokenFormat = (
  token: string
): { valid: boolean; reason?: string } => {
  if (!token || token.trim().length === 0) {
    return { valid: false, reason: 'HF_TOKEN is empty.' };
  }

  if (!token.startsWith('hf_')) {
    return {
      valid: false,
      reason:
        'HF_TOKEN does not start with "hf_". ' +
        'Generate a valid token at https://huggingface.co/settings/tokens'
    };
  }

  if (token.length < 10) {
    return {
      valid: false,
      reason: 'HF_TOKEN appears truncated (too short).'
    };
  }

  return { valid: true };
};

export const getTextGenerationProvider = (): {
  apiKey: string;
  baseURL?: string;
  provider: 'Groq' | 'OpenAI';
} => {
  if (serverEnv.GROQ_API_KEY) {
    return {
      apiKey: serverEnv.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
      provider: 'Groq'
    };
  }

  if (serverEnv.OPENAI_API_KEY) {
    return {
      apiKey: serverEnv.OPENAI_API_KEY,
      provider: 'OpenAI'
    };
  }

  throw new Error('Missing required environment variable: OPENAI_API_KEY or GROQ_API_KEY. Add one of them to server/.env.');
};

export const requireGroqApiKey = (): string => {
  if (!serverEnv.GROQ_API_KEY) {
    throw new Error('Missing required environment variable: GROQ_API_KEY. Add it to server/.env.');
  }

  return serverEnv.GROQ_API_KEY;
};