import OpenAI from 'openai';
import * as pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import type { Express } from 'express';
import { prisma } from '../../utils/prisma';

export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type StudyMode = 'Quick Revision Mode' | 'Practice Mode' | 'Challenge Mode';
export type SourceType = 'topic' | 'text' | 'file';
export type BrainstormSectionKey =
  | 'cueCards'
  | 'mcqQuiz'
  | 'fillInTheBlanks'
  | 'matchThePairs'
  | 'trueFalse'
  | 'riddleBasedLearning';

export interface CueCard {
  concept: string;
  definition: string;
  keyFunction: string;
  importantFact: string;
}

export interface MCQ {
  question: string;
  options: [string, string, string, string];
  answer: string;
}

export interface FillBlank {
  prompt: string;
  answer: string;
}

export interface MatchPair {
  left: string;
  right: string;
}

export interface TrueFalseItem {
  statement: string;
  answer: 'True' | 'False';
}

export interface Riddle {
  riddle: string;
  answer: string;
}

export interface BrainstormResult {
  cueCards: CueCard[];
  mcqQuiz: MCQ[];
  fillInTheBlanks: FillBlank[];
  matchThePairs: MatchPair[];
  trueFalse: TrueFalseItem[];
  riddleBasedLearning: Riddle[];
}

export interface BrainstormHistoryRecord {
  id: string;
  userId: string;
  topic: string | null;
  difficulty: Difficulty;
  studyMode: StudyMode;
  sourceType: SourceType;
  sourceText: string;
  result: BrainstormResult;
  createdAt: string;
  updatedAt: string;
}

const GROQ_MODEL = 'llama-3.3-70b-versatile';
const OPENAI_MODEL = 'gpt-4o-mini';
const MAX_SOURCE_LENGTH = 20000;
const MAX_HISTORY_PER_USER = 25;

const inMemoryHistory = new Map<string, BrainstormHistoryRecord[]>();

const sanitizeText = (value: string): string => {
  return value.replace(/\0/g, ' ').replace(/\s+/g, ' ').trim();
};

const truncateText = (value: string, limit = MAX_SOURCE_LENGTH): string => {
  if (value.length <= limit) {
    return value;
  }

  return `${value.slice(0, limit)}\n\n[Content truncated for processing]`;
};

const getCountsByMode = (studyMode: StudyMode) => {
  if (studyMode === 'Quick Revision Mode') {
    return {
      cueCards: 8,
      mcqQuiz: 5,
      fillInTheBlanks: 5,
      matchThePairs: 4,
      trueFalse: 5,
      riddleBasedLearning: 3
    };
  }

  if (studyMode === 'Challenge Mode') {
    return {
      cueCards: 5,
      mcqQuiz: 6,
      fillInTheBlanks: 5,
      matchThePairs: 4,
      trueFalse: 5,
      riddleBasedLearning: 4
    };
  }

  return {
    cueCards: 5,
    mcqQuiz: 5,
    fillInTheBlanks: 5,
    matchThePairs: 4,
    trueFalse: 5,
    riddleBasedLearning: 3
  };
};

const getModeGuidance = (studyMode: StudyMode): string => {
  if (studyMode === 'Quick Revision Mode') {
    return 'Prioritize fast recall, summary-style points, compact phrasing, and revision focus.';
  }

  if (studyMode === 'Challenge Mode') {
    return 'Increase difficulty, include tricky distractors, and deeper conceptual reasoning for advanced learners.';
  }

  return 'Balance conceptual recall and practice-level difficulty.';
};

const getTopicStructureGuidance = (topic: string): string => {
  const lowerTopic = topic.toLowerCase();

  if (/(system|biology|anatomy|physiology|digestive|respiratory|circulatory|enzyme|organ)/.test(lowerTopic)) {
    return [
      'Infer topic structure using organs or parts, processes or stages, enzymes or agents, and function-role mapping.',
      'Prioritize relationships like organ -> function, enzyme -> action, and process -> location.'
    ].join(' ');
  }

  if (/(history|civilization|war|independence|revolution)/.test(lowerTopic)) {
    return 'Infer topic structure using timeline, events, causes, effects, and personalities.';
  }

  if (/(physics|chemistry|equation|theorem|math|algebra|calculus|statistics)/.test(lowerTopic)) {
    return 'Infer topic structure using laws or formulas, variables, assumptions, steps, and applications.';
  }

  if (/(computer|programming|algorithm|data structure|network|database)/.test(lowerTopic)) {
    return 'Infer topic structure using definitions, components, workflows, complexity, and use-cases.';
  }

  return 'Infer topic structure using core concepts, definitions, processes, dependencies, and practical examples.';
};

const getClient = (): OpenAI => {
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY or GROQ_API_KEY is not configured');
  }

  return new OpenAI({
    apiKey,
    baseURL: process.env.GROQ_API_KEY ? 'https://api.groq.com/openai/v1' : undefined
  });
};

const getModel = (): string => {
  return process.env.GROQ_API_KEY ? GROQ_MODEL : OPENAI_MODEL;
};

const stripCodeFence = (input: string): string => {
  const fenced = input.trim().match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  return input.trim();
};

const toValidJson = (rawContent: string): any => {
  const normalized = stripCodeFence(rawContent);

  try {
    return JSON.parse(normalized);
  } catch {
    const jsonMatch = normalized.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI output is not valid JSON');
    }

    return JSON.parse(jsonMatch[0]);
  }
};

const clampString = (value: unknown, fallback = ''): string => {
  if (typeof value !== 'string') {
    return fallback;
  }

  return value.trim();
};

const normalizeOptions = (value: unknown): [string, string, string, string] => {
  if (!Array.isArray(value)) {
    return ['Option A', 'Option B', 'Option C', 'Option D'];
  }

  const clean = value
    .slice(0, 4)
    .map((item) => clampString(item, ''))
    .filter(Boolean);

  while (clean.length < 4) {
    clean.push(`Option ${String.fromCharCode(65 + clean.length)}`);
  }

  return [clean[0], clean[1], clean[2], clean[3]];
};

const normalizeResult = (raw: any): BrainstormResult => {
  const cueCards = Array.isArray(raw?.cueCards)
    ? raw.cueCards.map((item: any) => ({
        concept: clampString(item?.concept),
        definition: clampString(item?.definition),
        keyFunction: clampString(item?.keyFunction || item?.keyPoint),
        importantFact: clampString(item?.importantFact || item?.example)
      }))
    : [];

  const mcqQuiz = Array.isArray(raw?.mcqQuiz)
    ? raw.mcqQuiz.map((item: any) => ({
        question: clampString(item?.question),
        options: normalizeOptions(item?.options),
        answer: clampString(item?.answer)
      }))
    : [];

  const fillInTheBlanks = Array.isArray(raw?.fillInTheBlanks)
    ? raw.fillInTheBlanks.map((item: any) => ({
        prompt: clampString(item?.prompt),
        answer: clampString(item?.answer)
      }))
    : [];

  const matchThePairs = Array.isArray(raw?.matchThePairs)
    ? raw.matchThePairs.map((item: any) => ({
        left: clampString(item?.left),
        right: clampString(item?.right)
      }))
    : [];

  const trueFalse = Array.isArray(raw?.trueFalse)
    ? raw.trueFalse.map((item: any) => {
        const answer = clampString(item?.answer).toLowerCase() === 'false' ? 'False' : 'True';
        return {
          statement: clampString(item?.statement),
          answer
        };
      })
    : [];

  const riddleBasedLearning = Array.isArray(raw?.riddleBasedLearning)
    ? raw.riddleBasedLearning.map((item: any) => ({
        riddle: clampString(item?.riddle),
        answer: clampString(item?.answer)
      }))
    : [];

  return {
    cueCards,
    mcqQuiz,
    fillInTheBlanks,
    matchThePairs,
    trueFalse,
    riddleBasedLearning
  };
};

const generatePrompt = (params: {
  sourceText: string;
  topic: string;
  difficulty: Difficulty;
  studyMode: StudyMode;
  section?: BrainstormSectionKey;
}): string => {
  const { sourceText, topic, difficulty, studyMode, section } = params;
  const counts = getCountsByMode(studyMode);

  if (section) {
    return [
      'You are an expert instructional designer.',
      `Topic: ${topic || 'Not specified'}`,
      `Difficulty: ${difficulty}`,
      `Study Mode: ${studyMode}`,
      `Generate only this section: ${section}`,
      `Mode Guidance: ${getModeGuidance(studyMode)}`,
      `Topic Structure Guidance: ${getTopicStructureGuidance(topic || sourceText.slice(0, 120))}`,
      'Return JSON only with exactly one key matching the section name.',
      'If the section is cueCards, each item must have concept, definition, keyFunction, importantFact.',
      'Do not include markdown or explanations.',
      `Use this source material:\n${sourceText}`
    ].join('\n\n');
  }

  return [
    'You are an expert instructional designer for interactive study content.',
    `Topic: ${topic || 'Not specified'}`,
    `Difficulty: ${difficulty}`,
    `Study Mode: ${studyMode}`,
    `Mode Guidance: ${getModeGuidance(studyMode)}`,
    `Topic Structure Guidance: ${getTopicStructureGuidance(topic || sourceText.slice(0, 120))}`,
    'Create complete structured study material from the source.',
    `Counts:\n- cueCards: ${counts.cueCards}\n- mcqQuiz: ${counts.mcqQuiz}\n- fillInTheBlanks: ${counts.fillInTheBlanks}\n- matchThePairs: ${counts.matchThePairs}\n- trueFalse: ${counts.trueFalse}\n- riddleBasedLearning: ${counts.riddleBasedLearning}`,
    'Output valid JSON only with keys: cueCards, mcqQuiz, fillInTheBlanks, matchThePairs, trueFalse, riddleBasedLearning.',
    'For conceptual topics, use the inferred topic structure to produce meaningful mappings and role-based questions instead of generic trivia.',
    'Schema hints:',
    '- cueCards[] => {concept, definition, keyFunction, importantFact}',
    '- mcqQuiz[] => {question, options[4], answer}',
    '- fillInTheBlanks[] => {prompt, answer}',
    '- matchThePairs[] => {left, right}',
    '- trueFalse[] => {statement, answer}',
    '- riddleBasedLearning[] => {riddle, answer}',
    'Do not add markdown code fences, comments, or extra top-level keys.',
    `Use this source material:\n${sourceText}`
  ].join('\n\n');
};

const callAI = async (prompt: string): Promise<any> => {
  const client = getClient();
  const completion = await client.chat.completions.create({
    model: getModel(),
    messages: [
      {
        role: 'system',
        content: 'Return strictly valid JSON and ensure every requested section is populated with high-quality educational content.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.35,
    max_tokens: 2500
  });

  const content = completion.choices[0]?.message?.content;

  if (!content || typeof content !== 'string') {
    throw new Error('Empty response from AI provider');
  }

  return toValidJson(content);
};

export const extractTextFromUpload = async (file: Express.Multer.File): Promise<string> => {
  const mime = file.mimetype;

  if (mime === 'text/plain') {
    return sanitizeText(file.buffer.toString('utf-8'));
  }

  if (mime === 'application/pdf') {
    const parser = (pdfParse as any).default || (pdfParse as any);
    const parsed = await parser(file.buffer);
    return sanitizeText(parsed.text || '');
  }

  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const parsed = await mammoth.extractRawText({ buffer: file.buffer });
    return sanitizeText(parsed.value || '');
  }

  throw new Error(`Unsupported file type: ${mime}`);
};

export const buildSourceFromInput = async (params: {
  topic?: string;
  pastedContent?: string;
  file?: Express.Multer.File;
}): Promise<{ sourceText: string; sourceType: SourceType; topic: string }> => {
  const topic = sanitizeText(params.topic || '');
  const pastedContent = sanitizeText(params.pastedContent || '');

  if (params.file) {
    const extracted = await extractTextFromUpload(params.file);
    const sourceText = truncateText(extracted);

    if (!sourceText.trim()) {
      throw new Error('No readable content found in uploaded file');
    }

    return {
      sourceText,
      sourceType: 'file',
      topic
    };
  }

  if (pastedContent) {
    return {
      sourceText: truncateText(pastedContent),
      sourceType: 'text',
      topic
    };
  }

  if (topic) {
    return {
      sourceText: truncateText(`Study this topic thoroughly: ${topic}`),
      sourceType: 'topic',
      topic
    };
  }

  throw new Error('Provide a topic, pasted text, or a supported file upload');
};

const serializeRecord = (record: any): BrainstormHistoryRecord => {
  return {
    id: String(record.id),
    userId: String(record.userId),
    topic: (record.topic ?? null) as string | null,
    difficulty: record.difficulty as Difficulty,
    studyMode: record.studyMode as StudyMode,
    sourceType: record.sourceType as SourceType,
    sourceText: String(record.sourceText || ''),
    result: normalizeResult(record.result),
    createdAt: new Date(record.createdAt).toISOString(),
    updatedAt: new Date(record.updatedAt).toISOString()
  };
};

const isDbUnavailableError = (error: any): boolean => {
  const message = String(error?.message || '').toLowerCase();
  return (
    error?.code === 'P1001' ||
    error?.code === 'P2021' ||
    message.includes("can't reach database") ||
    message.includes('table') ||
    message.includes("cannot read properties of undefined") ||
    message.includes('findmany') ||
    message.includes('brainstormhistory')
  );
};

const getHistoryModel = (): any => {
  return (prisma as any).brainstormHistory;
};

export const saveBrainstormHistory = async (params: {
  userId: string;
  topic: string;
  difficulty: Difficulty;
  studyMode: StudyMode;
  sourceType: SourceType;
  sourceText: string;
  result: BrainstormResult;
}): Promise<BrainstormHistoryRecord> => {
  const payload = {
    userId: params.userId,
    topic: params.topic || null,
    difficulty: params.difficulty,
    studyMode: params.studyMode,
    sourceType: params.sourceType,
    sourceText: truncateText(params.sourceText, 12000),
    result: params.result
  };

  try {
    const model = getHistoryModel();
    if (!model?.create) {
      throw new Error('Prisma BrainstormHistory model is not available in generated client');
    }
    const created = await model.create({ data: payload });
    return serializeRecord(created);
  } catch (error) {
    if (!isDbUnavailableError(error)) {
      throw error;
    }

    const existing = inMemoryHistory.get(params.userId) || [];
    const now = new Date().toISOString();

    const record: BrainstormHistoryRecord = {
      id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId: params.userId,
      topic: params.topic || null,
      difficulty: params.difficulty,
      studyMode: params.studyMode,
      sourceType: params.sourceType,
      sourceText: truncateText(params.sourceText, 12000),
      result: params.result,
      createdAt: now,
      updatedAt: now
    };

    inMemoryHistory.set(params.userId, [record, ...existing].slice(0, MAX_HISTORY_PER_USER));
    return record;
  }
};

export const getUserBrainstormHistory = async (userId: string): Promise<BrainstormHistoryRecord[]> => {
  try {
    const model = getHistoryModel();
    if (!model?.findMany) {
      throw new Error('Prisma BrainstormHistory model is not available in generated client');
    }
    const rows = await model.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: MAX_HISTORY_PER_USER
    });

    return rows.map(serializeRecord);
  } catch (error) {
    if (!isDbUnavailableError(error)) {
      throw error;
    }

    return inMemoryHistory.get(userId) || [];
  }
};

export const generateBrainstormResult = async (params: {
  sourceText: string;
  topic: string;
  difficulty: Difficulty;
  studyMode: StudyMode;
}): Promise<BrainstormResult> => {
  const prompt = generatePrompt(params);
  const aiOutput = await callAI(prompt);
  return normalizeResult(aiOutput);
};

export const regenerateSingleSection = async (params: {
  historyRecord: BrainstormHistoryRecord;
  section: BrainstormSectionKey;
}): Promise<BrainstormHistoryRecord> => {
  const prompt = generatePrompt({
    sourceText: params.historyRecord.sourceText,
    topic: params.historyRecord.topic || '',
    difficulty: params.historyRecord.difficulty,
    studyMode: params.historyRecord.studyMode,
    section: params.section
  });

  const aiOutput = await callAI(prompt);
  const sectionPayload = normalizeResult(aiOutput);

  const merged: BrainstormResult = {
    ...params.historyRecord.result,
    [params.section]: sectionPayload[params.section]
  };

  try {
    const model = getHistoryModel();
    if (!model?.update) {
      throw new Error('Prisma BrainstormHistory model is not available in generated client');
    }
    const updated = await model.update({
      where: { id: params.historyRecord.id },
      data: { result: merged }
    });

    return serializeRecord(updated);
  } catch (error) {
    if (!isDbUnavailableError(error)) {
      throw error;
    }

    const rows = inMemoryHistory.get(params.historyRecord.userId) || [];
    const updatedRows = rows.map((row) => {
      if (row.id !== params.historyRecord.id) {
        return row;
      }

      return {
        ...row,
        result: merged,
        updatedAt: new Date().toISOString()
      };
    });

    inMemoryHistory.set(params.historyRecord.userId, updatedRows);

    return updatedRows.find((row) => row.id === params.historyRecord.id) || {
      ...params.historyRecord,
      result: merged,
      updatedAt: new Date().toISOString()
    };
  }
};

export const getHistoryById = async (id: string, userId: string): Promise<BrainstormHistoryRecord | null> => {
  try {
    const model = getHistoryModel();
    if (!model?.findFirst) {
      throw new Error('Prisma BrainstormHistory model is not available in generated client');
    }
    const row = await model.findFirst({ where: { id, userId } });
    return row ? serializeRecord(row) : null;
  } catch (error) {
    if (!isDbUnavailableError(error)) {
      throw error;
    }

    const rows = inMemoryHistory.get(userId) || [];
    return rows.find((row) => row.id === id) || null;
  }
};
