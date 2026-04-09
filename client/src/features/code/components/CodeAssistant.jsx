import { useState } from 'react';
import { Bot, Code2, Copy, Loader2, Sparkles } from 'lucide-react';
import { generateCode } from '../../../services/code';

export default function CodeAssistant() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copyState, setCopyState] = useState('Copy');

  const handleGenerate = async (event) => {
    event.preventDefault();

    if (!prompt.trim() || isLoading) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await generateCode({ prompt: prompt.trim() });
      setResponse(result);
    } catch (requestError) {
      const message =
        requestError?.response?.data?.error ||
        requestError?.message ||
        'Something went wrong while generating code.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!response) {
      return;
    }

    try {
      await navigator.clipboard.writeText(response);
      setCopyState('Copied');
      setTimeout(() => setCopyState('Copy'), 1500);
    } catch {
      setCopyState('Failed');
      setTimeout(() => setCopyState('Copy'), 1500);
    }
  };

  return (
    <section className="depth-section glass-card relative overflow-hidden rounded-2xl">
      <div className="floating-orb -top-28 -right-20 h-64 w-64 bg-primary/35" />
      <div className="floating-orb -bottom-32 -left-12 h-72 w-72 bg-secondary/25" />
      <div className="depth-highlight" />

      <div className="depth-content p-4 sm:p-6 lg:p-8 space-y-6">
        <header className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full glass-card px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-200">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Code Assistant
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
            <Code2 className="h-7 w-7 text-primary" />
            <span className="heading-metal">Build Faster With AI</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-400 max-w-2xl">
            Describe what you want to build, debug, or refactor. Yukti AI returns production-ready code and implementation guidance.
          </p>
        </header>

        <form onSubmit={handleGenerate} className="space-y-4">
          <label htmlFor="code-prompt" className="text-sm font-medium text-gray-300">
            Prompt
          </label>
          <textarea
            id="code-prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Example: Create an Express middleware that validates JWT tokens and handles expired token errors."
            className="glass-input h-40 w-full resize-none rounded-xl p-4 text-sm focus:outline-none"
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              disabled={isLoading || !prompt.trim()}
              className="metal-button inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Bot className="h-5 w-5" />}
              {isLoading ? 'Generating...' : 'Generate Code'}
            </button>

            <button
              type="button"
              onClick={handleCopy}
              disabled={!response}
              className="metal-button inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Copy className="h-4 w-4" />
              {copyState}
            </button>
          </div>
        </form>

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="glass-card rounded-2xl p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Response</h2>
            {isLoading && <span className="text-xs text-primary animate-pulse">Thinking...</span>}
          </div>
          <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-black/35 border border-white/10 p-4 text-sm leading-relaxed text-gray-100">
            {response || 'Generated code will appear here.'}
          </pre>
        </div>
      </div>
    </section>
  );
}
