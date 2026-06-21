import { useMemo, useState } from 'react';
import { Copy, FilePenLine, Loader2, Sparkles } from 'lucide-react';
import { axiosInstance } from '../utils/axiosInstance';
import { saveWritingHistory } from '../services/writing';
import { trackActivity } from '../services/activity';

const MODES = [
  'Rewrite',
  'Email',
  'Grammar Fix',
  'Paragraph',
  'Summarize',
  'Resume Bullet',
  'Exam Answer'
];

const getApiRootFromBase = (baseURL) => {
  if (!baseURL) {
    return 'http://localhost:5000';
  }

  return baseURL.replace(/\/api\/v1\/?$/, '');
};

export default function WritingAssistant() {
  const [text, setText] = useState('');
  const [mode, setMode] = useState(MODES[0]);
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copyLabel, setCopyLabel] = useState('Copy');

  const writingEndpoint = useMemo(() => {
    const root = getApiRootFromBase(axiosInstance.defaults.baseURL);
    return `${root}/api/writing/generate`;
  }, []);

  const canGenerate = text.trim().length > 0 && !loading;

  const handleGenerate = async (event) => {
    event.preventDefault();

    if (!canGenerate) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data } = await axiosInstance.post(writingEndpoint, {
        text: text.trim(),
        mode
      });

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to generate writing response.');
      }

      setResponse(data.response || 'No output generated.');
      // Persist writing history and track as recent activity
      void saveWritingHistory(text.trim(), mode, data.response || '');
      void trackActivity('writing', text.trim());
    } catch (requestError) {
      const message =
        requestError?.response?.data?.error ||
        requestError?.message ||
        'Something went wrong while generating writing output.';
      setError(message);
      setResponse('');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!response) {
      return;
    }

    try {
      await navigator.clipboard.writeText(response);
      setCopyLabel('Copied');
      setTimeout(() => setCopyLabel('Copy'), 1500);
    } catch {
      setCopyLabel('Failed');
      setTimeout(() => setCopyLabel('Copy'), 1500);
    }
  };

  return (
    <div className="depth-section glass-card relative overflow-hidden rounded-2xl">
      <div className="floating-orb -left-28 top-10 h-64 w-64 bg-primary/35" />
      <div className="floating-orb -bottom-24 right-2 h-72 w-72 bg-secondary/25" />
      <div className="depth-highlight" />

      <div className="depth-content p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 rounded-full glass-card px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-200">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Writing Assistant
          </div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold heading-metal">Polished Writing in Seconds</h1>
          <p className="mt-2 max-w-3xl text-sm sm:text-base text-gray-400">
            Select a writing mode and generate clear, structured, and professional output tailored to your context.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <form onSubmit={handleGenerate} className="xl:col-span-2 space-y-4 glass-card rounded-2xl p-4 sm:p-5">
            <label htmlFor="writing-text" className="block text-sm font-medium text-gray-300">
              Input Text
            </label>
            <textarea
              id="writing-text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Paste rough content, notes, or draft text here..."
              className="glass-input h-48 w-full resize-none rounded-xl p-3 text-sm outline-none"
            />

            <label htmlFor="writing-mode" className="block text-sm font-medium text-gray-300">
              Mode
            </label>
            <select
              id="writing-mode"
              value={mode}
              onChange={(event) => setMode(event.target.value)}
              className="glass-input w-full rounded-xl px-3 py-3 text-sm outline-none"
            >
              {MODES.map((item) => (
                <option key={item} value={item} className="bg-surface text-white">
                  {item}
                </option>
              ))}
            </select>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="submit"
                disabled={!canGenerate}
                className="metal-button inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FilePenLine className="h-5 w-5" />}
                {loading ? 'Generating...' : 'Generate'}
              </button>

              <button
                type="button"
                onClick={handleCopy}
                disabled={!response}
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
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Output</h2>
              {loading && <span className="text-xs text-primary animate-pulse">Crafting response...</span>}
            </div>

            <pre className="min-h-[20rem] max-h-[42rem] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-black/35 border border-white/10 p-4 text-sm leading-relaxed text-gray-100 font-sans">
              {response || 'Generated writing output will appear here.'}
            </pre>
          </section>
        </div>
      </div>
    </div>
  );
}
