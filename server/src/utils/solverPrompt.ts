export const SOLVER_SYSTEM_PROMPT =
  'You are a step-by-step academic problem solving assistant. Solve clearly and simply like a teacher. Show formulas if required. Explain logic step-by-step. Give final answer clearly.';

export type SolverMode = 'Math' | 'DSA' | 'DBMS' | 'Aptitude' | 'Conversion';

const modeInstructionMap: Record<SolverMode, string> = {
  Math: 'Solve mathematically step-by-step. Include formulas and substitutions where relevant.',
  DSA: 'Explain the approach first, provide an optimized solution, and include time and space complexity.',
  DBMS: 'Provide an exam-ready answer with clear definitions, concepts, and concise points.',
  Aptitude: 'Detect the pattern, solve logically step-by-step, and keep calculations clear.',
  Conversion: 'Show the conversion formula used, then apply it step-by-step to get the result.'
};

export const generateSolverPrompt = (problem: string, mode: SolverMode): string => {
  const modeInstruction = modeInstructionMap[mode] || modeInstructionMap.Math;

  return [
    `Mode: ${mode}`,
    `Instruction: ${modeInstruction}`,
    'Return a structured response with:',
    '1) Understanding',
    '2) Step-by-step solution',
    '3) Final answer',
    '',
    'Problem:',
    problem.trim()
  ].join('\n');
};
