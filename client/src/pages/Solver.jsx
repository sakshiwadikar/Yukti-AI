import { useMemo, useState } from 'react';
import { BrainCircuit, ChevronDown, Copy, Loader2, Sparkles } from 'lucide-react';
import { axiosInstance } from '../utils/axiosInstance';

const MODES = ['Math', 'DSA', 'DBMS', 'Aptitude', 'Conversion'];

const cleanSolverResponse = (responseText = '') => {
  return responseText
    .replace(/\$\\boxed\{(.*?)\}\$/g, '$1')
    .replace(/\\boxed\{(.*?)\}/g, '$1')
    .trim();
};

const getProblemName = (problemText = '') => {
  const normalized = problemText.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return '';
  }

  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'to', 'of', 'for', 'and', 'or', 'in', 'on', 'at', 'by',
    'with', 'from', 'that', 'this', 'these', 'those', 'find', 'solve', 'calculate', 'show',
    'what', 'how', 'can', 'you', 'please', 'explain'
  ]);

  const tokens = normalized
    .toLowerCase()
    .replace(/[^a-z0-9+\-*/^%=(). ]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1 && !stopWords.has(token));

  const uniqueTokens = [...new Set(tokens)];
  const selected = uniqueTokens.slice(0, 3);

  if (!selected.length) {
    const fallback = normalized.split(/\s+/).slice(0, 3).join(' ');
    return fallback;
  }

  return selected.join(' ');
};

const toAnswerOnly = (value = '') => {
  const compact = value
    .replace(/^final\s*answer\s*:/i, '')
    .replace(/^answer\s*:/i, '')
    .replace(/[\*_`]/g, '')
    .trim();

  const firstMeaningfulLine = compact
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean) || '';

  return firstMeaningfulLine;
};

const parseSolverResponse = (responseText = '') => {
  const cleaned = cleanSolverResponse(responseText);

  if (!cleaned) {
    return {
      approach: '',
      steps: '',
      finalAnswer: ''
    };
  }

  const approachRegex = /Approach\s*:\s*([\s\S]*?)(?=\n\s*Steps\s*:|\n\s*Final\s*Answer\s*:|$)/i;
  const stepsRegex = /Steps\s*:\s*([\s\S]*?)(?=\n\s*Final\s*Answer\s*:|$)/i;
  const finalAnswerRegex = /Final\s*Answer\s*:\s*([\s\S]*)$/i;

  const approachMatch = cleaned.match(approachRegex);
  const stepsMatch = cleaned.match(stepsRegex);
  const finalAnswerMatch = cleaned.match(finalAnswerRegex);

  const approach = approachMatch?.[1]?.trim() || '';
  const steps = stepsMatch?.[1]?.trim() || '';
  const finalAnswerRaw = finalAnswerMatch?.[1]?.trim() || '';
  const finalAnswer = toAnswerOnly(finalAnswerRaw);

  return {
    approach,
    steps,
    finalAnswer
  };
};

const getApiRootFromBase = (baseURL) => {
  if (!baseURL) {
    return 'http://localhost:5000';
  }

  return baseURL.replace(/\/api\/v1\/?$/, '');
};

export default function Solver() {
  const [problem, setProblem] = useState('');
  const [submittedProblem, setSubmittedProblem] = useState('');
  const [problemName, setProblemName] = useState('');
  const [mode, setMode] = useState(MODES[0]);
  const [solution, setSolution] = useState('');
  const [approach, setApproach] = useState('');
  const [steps, setSteps] = useState('');
  const [finalAnswer, setFinalAnswer] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copyLabel, setCopyLabel] = useState('Copy');

  const canSolve = problem.trim().length > 0 && !loading;
  const solveEndpoint = useMemo(() => {
    const root = getApiRootFromBase(axiosInstance.defaults.baseURL);
    return `${root}/api/solver/solve`;
  }, []);

  const handleSolve = async (event) => {
    event.preventDefault();
    if (!canSolve) {
      return;
    }

    setLoading(true);
    setError('');
    const currentProblem = problem.trim();
    setSubmittedProblem(currentProblem);
    setProblemName(getProblemName(currentProblem));
    setApproach('');
    setSteps('');
    setFinalAnswer('');

    try {
      const { data } = await axiosInstance.post(solveEndpoint, {
        problem: currentProblem,
        mode
      });

      if (!data?.success) {
        throw new Error(data?.error || 'Unable to solve this problem right now.');
      }

      const cleanedResponse = cleanSolverResponse(data.solution || 'No solution returned.');
      const parsed = parseSolverResponse(cleanedResponse);

      setSolution(cleanedResponse);
      setApproach(getProblemName(currentProblem));
      setSteps(parsed.steps);
      setFinalAnswer(parsed.finalAnswer);
    } catch (requestError) {
      const message =
        requestError?.response?.data?.error ||
        requestError?.message ||
        'Something went wrong while solving the problem.';
      setError(message);
      setSolution('');
      setSubmittedProblem('');
      setProblemName('');
      setApproach('');
      setSteps('');
      setFinalAnswer('');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!solution) {
      return;
    }

    try {
      await navigator.clipboard.writeText(solution);
      setCopyLabel('Copied');
      setTimeout(() => setCopyLabel('Copy'), 1500);
    } catch {
      setCopyLabel('Failed');
      setTimeout(() => setCopyLabel('Copy'), 1500);
    }
  };

  return (
    <div className="depth-section glass-card relative overflow-hidden rounded-2xl">
      <div className="floating-orb -left-24 top-10 h-60 w-60 bg-primary/35" />
      <div className="floating-orb -bottom-28 right-0 h-72 w-72 bg-secondary/25" />
      <div className="depth-highlight" />

      <div className="depth-content p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 rounded-full glass-card px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-200">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Solver Tab
          </div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold heading-metal">Step-by-Step Academic Solver</h1>
          <p className="mt-2 text-sm sm:text-base text-gray-400 max-w-3xl">
            Submit a problem, choose a mode, and get a clear teacher-style solution with logic and final answer.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <form onSubmit={handleSolve} className="xl:col-span-2 space-y-4 glass-card rounded-2xl p-4 sm:p-5">
            <label htmlFor="solver-problem" className="block text-sm font-medium text-gray-300">
              Problem
            </label>
            <textarea
              id="solver-problem"
              value={problem}
              onChange={(event) => setProblem(event.target.value)}
              placeholder="Example: Solve 2x^2 - 7x + 3 = 0 and explain each step."
              className="glass-input h-44 w-full resize-none rounded-xl p-3 text-sm outline-none"
            />

            <label htmlFor="solver-mode" className="block text-sm font-medium text-gray-300">
              Mode
            </label>
            <div className="relative">
              <select
                id="solver-mode"
                value={mode}
                onChange={(event) => setMode(event.target.value)}
                className="glass-input w-full appearance-none rounded-xl px-3 py-3 pr-10 text-sm outline-none"
              >
                {MODES.map((item) => (
                  <option key={item} value={item} className="bg-surface text-white">
                    {item}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="submit"
                disabled={!canSolve}
                className="metal-button inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <BrainCircuit className="h-5 w-5" />}
                {loading ? 'Solving...' : 'Solve'}
              </button>

              <button
                type="button"
                onClick={handleCopy}
                disabled={!solution}
                className="metal-button inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Copy className="h-4 w-4" />
                {copyLabel}
              </button>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}
          </form>

          <section className="xl:col-span-3 glass-card rounded-2xl p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Solution</h2>
              {loading && <span className="text-xs text-primary animate-pulse">Generating step-by-step response...</span>}
            </div>

            <div className="min-h-[18rem] max-h-[40rem] overflow-auto space-y-4 rounded-xl bg-black/35 border border-white/10 p-4 text-sm leading-relaxed text-gray-100">
              <div className="rounded-lg border border-white/10 bg-black/25 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Approach:</p>
                <p className="mt-2 whitespace-pre-wrap break-words text-gray-100">
                  {approach || problemName || submittedProblem || 'AI will summarize the approach here.'}
                </p>
              </div>

              <div className="rounded-lg border border-white/10 bg-black/25 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Steps:</p>
                <pre className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-100 font-sans">
                  {steps || solution || 'Step-by-step solution will appear here.'}
                </pre>
              </div>

              <div className="rounded-lg border border-primary/45 bg-primary/10 p-3 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Final Answer:</p>
                <p className="mt-2 whitespace-pre-wrap break-words text-white">
                  {toAnswerOnly(finalAnswer) || 'Final answer will appear here.'}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
