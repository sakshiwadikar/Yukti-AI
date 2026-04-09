export type WritingMode =
  | 'Rewrite'
  | 'Email'
  | 'Grammar Fix'
  | 'Paragraph'
  | 'Summarize'
  | 'Resume Bullet'
  | 'Exam Answer';

export const WRITING_SYSTEM_PROMPT =
  'You are a professional writing assistant. Improve grammar, clarity, structure, and tone depending on request mode.';

const modeInstructions: Record<WritingMode, string> = {
  Rewrite: 'Rewrite the text to be clearer, polished, and natural while preserving the core meaning.',
  Email: 'Convert the input into a professional, concise email with a suitable subject and body.',
  'Grammar Fix': 'Correct grammar, punctuation, and sentence structure while preserving the original intent.',
  Paragraph: 'Transform fragmented notes into a coherent, well-structured paragraph.',
  Summarize: 'Summarize the text into concise key points while retaining critical information.',
  'Resume Bullet': 'Convert the input into impactful resume bullet points with action verbs and measurable outcomes when possible.',
  'Exam Answer': 'Produce an exam-ready answer with crisp structure, key points, and clarity.'
};

export const generateWritingPrompt = (text: string, mode: WritingMode): string => {
  const instruction = modeInstructions[mode] || modeInstructions.Rewrite;

  return [
    `Mode: ${mode}`,
    `Instruction: ${instruction}`,
    'Return only the improved final output text. Keep formatting clean and readable.',
    '',
    'Input Text:',
    text.trim()
  ].join('\n');
};
