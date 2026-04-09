import { apiClient } from '../api/client';
import { getAuthHeaders } from '../../utils/auth';

export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type StudyMode = 'Quick Revision Mode' | 'Practice Mode' | 'Challenge Mode';
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
  sourceType: 'topic' | 'text' | 'file';
  sourceText: string;
  result: BrainstormResult;
  createdAt: string;
  updatedAt: string;
}

const getAuthConfig = () => ({
  headers: {
    ...getAuthHeaders()
  }
});

export const getBrainstormHistory = async (): Promise<BrainstormHistoryRecord[]> => {
  const { data } = await apiClient.get('/brainstorm/history', getAuthConfig());
  return data?.history || [];
};

export const generateBrainstorm = async (payload: {
  topic: string;
  pastedContent: string;
  difficulty: Difficulty;
  studyMode: StudyMode;
  file: File | null;
}): Promise<BrainstormHistoryRecord> => {
  const formData = new FormData();
  formData.append('topic', payload.topic);
  formData.append('pastedContent', payload.pastedContent);
  formData.append('difficulty', payload.difficulty);
  formData.append('studyMode', payload.studyMode);

  if (payload.file) {
    formData.append('file', payload.file);
  }

  const { data } = await apiClient.post('/brainstorm/generate', formData, {
    headers: {
      ...getAuthHeaders()
    }
  });

  return data?.brainstorm;
};

export const regenerateBrainstormSection = async (payload: {
  brainstormId: string;
  section: BrainstormSectionKey;
}): Promise<BrainstormHistoryRecord> => {
  const { data } = await apiClient.post(
    '/brainstorm/regenerate-section',
    {
      brainstormId: payload.brainstormId,
      section: payload.section
    },
    getAuthConfig()
  );

  return data?.brainstorm;
};
