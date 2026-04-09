import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Brain,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardCopy,
  FileText,
  Loader2,
  RefreshCw,
  Sparkles,
  Upload
} from 'lucide-react';
import {
  generateBrainstorm,
  getBrainstormHistory,
  regenerateBrainstormSection,
  type BrainstormHistoryRecord,
  type BrainstormSectionKey,
  type Difficulty,
  type StudyMode
} from '../../services/brainstorm';

const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard'];
const STUDY_MODES: StudyMode[] = ['Quick Revision Mode', 'Practice Mode', 'Challenge Mode'];

const SECTION_CONFIG: Array<{ key: BrainstormSectionKey; label: string }> = [
  { key: 'cueCards', label: 'Cue Cards' },
  { key: 'mcqQuiz', label: 'MCQ Quiz' },
  { key: 'fillInTheBlanks', label: 'Fill in the Blanks' },
  { key: 'matchThePairs', label: 'Match the Pairs' },
  { key: 'trueFalse', label: 'True / False' },
  { key: 'riddleBasedLearning', label: 'Fun Learning Riddles' }
];

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

const asErrorMessage = (error: unknown, fallback: string): string => {
  const maybeResponse = error as { response?: { data?: { error?: string } }; message?: string };
  return maybeResponse?.response?.data?.error || maybeResponse?.message || fallback;
};

export default function BrainstormPage() {
  const [topic, setTopic] = useState('');
  const [pastedContent, setPastedContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
  const [studyMode, setStudyMode] = useState<StudyMode>('Practice Mode');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState('');

  const [history, setHistory] = useState<BrainstormHistoryRecord[]>([]);
  const [activeResult, setActiveResult] = useState<BrainstormHistoryRecord | null>(null);

  const [expandedSections, setExpandedSections] = useState<Record<BrainstormSectionKey, boolean>>({
    cueCards: true,
    mcqQuiz: true,
    fillInTheBlanks: true,
    matchThePairs: true,
    trueFalse: true,
    riddleBasedLearning: true
  });

  const [sectionLoading, setSectionLoading] = useState<Record<BrainstormSectionKey, boolean>>({
    cueCards: false,
    mcqQuiz: false,
    fillInTheBlanks: false,
    matchThePairs: false,
    trueFalse: false,
    riddleBasedLearning: false
  });

  const [copyState, setCopyState] = useState<Record<BrainstormSectionKey, string>>({
    cueCards: 'Copy',
    mcqQuiz: 'Copy',
    fillInTheBlanks: 'Copy',
    matchThePairs: 'Copy',
    trueFalse: 'Copy',
    riddleBasedLearning: 'Copy'
  });

  useEffect(() => {
    const loadHistory = async () => {
      setHistoryLoading(true);
      try {
        const rows = await getBrainstormHistory();
        setHistory(rows);
        if (rows.length > 0) {
          setActiveResult(rows[0]);
        }
      } catch (requestError) {
        setError(asErrorMessage(requestError, 'Unable to load brainstorm history.'));
      } finally {
        setHistoryLoading(false);
      }
    };

    void loadHistory();
  }, []);

  const canGenerate = useMemo(() => {
    return !loading && Boolean(selectedFile || topic.trim() || pastedContent.trim());
  }, [loading, selectedFile, topic, pastedContent]);

  const handleGenerate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canGenerate) {
      setError('Please provide a topic, pasted text, or upload a file before generating.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const record = await generateBrainstorm({
        topic: topic.trim(),
        pastedContent: pastedContent.trim(),
        difficulty,
        studyMode,
        file: selectedFile
      });

      if (!record) {
        throw new Error('No brainstorm data returned from server.');
      }

      setActiveResult(record);
      setHistory((prev) => [record, ...prev.filter((item) => item.id !== record.id)]);
    } catch (requestError) {
      setError(asErrorMessage(requestError, 'Failed to generate brainstorm content.'));
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (key: BrainstormSectionKey) => {
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleCopySection = async (key: BrainstormSectionKey) => {
    if (!activeResult) {
      return;
    }

    const content = JSON.stringify(activeResult.result[key], null, 2);

    try {
      await navigator.clipboard.writeText(content);
      setCopyState((prev) => ({ ...prev, [key]: 'Copied' }));
      window.setTimeout(() => {
        setCopyState((prev) => ({ ...prev, [key]: 'Copy' }));
      }, 1500);
    } catch {
      setCopyState((prev) => ({ ...prev, [key]: 'Failed' }));
      window.setTimeout(() => {
        setCopyState((prev) => ({ ...prev, [key]: 'Copy' }));
      }, 1500);
    }
  };

  const handleRegenerateSection = async (key: BrainstormSectionKey) => {
    if (!activeResult) {
      return;
    }

    setSectionLoading((prev) => ({ ...prev, [key]: true }));
    setError('');

    try {
      const updated = await regenerateBrainstormSection({
        brainstormId: activeResult.id,
        section: key
      });

      setActiveResult(updated);
      setHistory((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (requestError) {
      setError(asErrorMessage(requestError, `Failed to regenerate section: ${key}`));
    } finally {
      setSectionLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const renderSectionBody = (key: BrainstormSectionKey) => {
    if (!activeResult) {
      return null;
    }

    const section = activeResult.result[key];

    if (!Array.isArray(section) || section.length === 0) {
      return <p className="text-sm text-gray-400">No items returned for this section.</p>;
    }

    if (key === 'cueCards') {
      return (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {section.map((item, index) => (
            <article key={`${key}-${index}`} className="rounded-xl border border-white/15 bg-black/20 p-3">
              <h4 className="font-semibold text-white">{item.concept}</h4>
              <p className="mt-2 text-sm text-gray-200">{item.definition}</p>
              <p className="mt-2 text-xs text-primary">Key Function: {item.keyFunction}</p>
              <p className="mt-2 text-xs text-gray-300">Important Fact: {item.importantFact}</p>
            </article>
          ))}
        </div>
      );
    }

    if (key === 'mcqQuiz') {
      return (
        <ol className="space-y-4">
          {section.map((item, index) => (
            <li key={`${key}-${index}`} className="rounded-xl border border-white/15 bg-black/20 p-3">
              <p className="font-medium text-white">{index + 1}. {item.question}</p>
              <ul className="mt-2 space-y-1 text-sm text-gray-200">
                {item.options?.map((option: string, optionIndex: number) => (
                  <li key={`${key}-${index}-${optionIndex}`}>{String.fromCharCode(65 + optionIndex)}. {option}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-primary">Answer: {item.answer}</p>
            </li>
          ))}
        </ol>
      );
    }

    if (key === 'fillInTheBlanks') {
      return (
        <ol className="space-y-3">
          {section.map((item, index) => (
            <li key={`${key}-${index}`} className="rounded-xl border border-white/15 bg-black/20 p-3 text-sm">
              <p className="text-gray-100">{index + 1}. {item.prompt}</p>
              <p className="mt-2 text-xs text-primary">Answer: {item.answer}</p>
            </li>
          ))}
        </ol>
      );
    }

    if (key === 'matchThePairs') {
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {section.map((item, index) => (
            <div key={`${key}-${index}`} className="rounded-xl border border-white/15 bg-black/20 p-3 text-sm">
              <p className="text-gray-100"><span className="text-primary">A:</span> {item.left}</p>
              <p className="mt-1 text-gray-300"><span className="text-secondary">B:</span> {item.right}</p>
            </div>
          ))}
        </div>
      );
    }

    if (key === 'trueFalse') {
      return (
        <ol className="space-y-3">
          {section.map((item, index) => (
            <li key={`${key}-${index}`} className="rounded-xl border border-white/15 bg-black/20 p-3 text-sm">
              <p className="text-gray-100">{index + 1}. {item.statement}</p>
              <p className="mt-2 text-xs text-primary">Answer: {item.answer}</p>
            </li>
          ))}
        </ol>
      );
    }

    return (
      <ol className="space-y-3">
        {section.map((item, index) => (
          <li key={`${key}-${index}`} className="rounded-xl border border-white/15 bg-black/20 p-3 text-sm">
            <p className="text-gray-100">{index + 1}. {item.riddle}</p>
            <p className="mt-2 text-xs text-primary">Answer: {item.answer}</p>
          </li>
        ))}
      </ol>
    );
  };

  return (
    <div className="depth-section glass-card relative overflow-hidden rounded-2xl">
      <div className="floating-orb -left-20 top-4 h-52 w-52 bg-primary/30" />
      <div className="floating-orb -right-10 bottom-0 h-72 w-72 bg-secondary/20" />
      <div className="depth-highlight" />

      <div className="depth-content p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full glass-card px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-200">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Brainstorm Study Tab
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl font-bold heading-metal">Interactive Study Builder</h1>
            <p className="mt-2 max-w-3xl text-sm sm:text-base text-gray-400">
              Generate cue cards, quizzes, riddles, and structured practice from any topic, text, or document.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <form onSubmit={handleGenerate} className="xl:col-span-4 space-y-4 glass-card rounded-2xl p-4 sm:p-5">
            <label htmlFor="brainstorm-topic" className="block text-sm font-medium text-gray-300">
              Topic Name
            </label>
            <input
              id="brainstorm-topic"
              type="text"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="e.g., Human Digestive System"
              className="glass-input w-full rounded-xl px-3 py-3 text-sm outline-none"
            />

            <label htmlFor="brainstorm-paste" className="block text-sm font-medium text-gray-300">
              Pasted Content
            </label>
            <textarea
              id="brainstorm-paste"
              value={pastedContent}
              onChange={(event) => setPastedContent(event.target.value)}
              placeholder="Paste notes, transcript, or chapter content here..."
              className="glass-input h-36 w-full resize-none rounded-xl p-3 text-sm outline-none"
            />

            <label htmlFor="brainstorm-file" className="block text-sm font-medium text-gray-300">
              Upload File (PDF, DOCX, TXT)
            </label>
            <label
              htmlFor="brainstorm-file"
              className="glass-input flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-white/25 px-3 py-3 text-sm"
            >
              <Upload className="h-4 w-4" />
              <span className="truncate">{selectedFile ? selectedFile.name : 'Choose a file to extract study material'}</span>
            </label>
            <input
              id="brainstorm-file"
              type="file"
              accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              className="hidden"
              onChange={(event) => {
                const nextFile = event.target.files?.[0] || null;
                setSelectedFile(nextFile);
              }}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="brainstorm-difficulty" className="mb-2 block text-sm font-medium text-gray-300">
                  Difficulty
                </label>
                <select
                  id="brainstorm-difficulty"
                  value={difficulty}
                  onChange={(event) => setDifficulty(event.target.value as Difficulty)}
                  className="glass-input w-full rounded-xl px-3 py-3 text-sm outline-none"
                >
                  {DIFFICULTIES.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="brainstorm-mode" className="mb-2 block text-sm font-medium text-gray-300">
                  Study Mode
                </label>
                <select
                  id="brainstorm-mode"
                  value={studyMode}
                  onChange={(event) => setStudyMode(event.target.value as StudyMode)}
                  className="glass-input w-full rounded-xl px-3 py-3 text-sm outline-none"
                >
                  {STUDY_MODES.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={!canGenerate}
              className="metal-button inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Brain className="h-5 w-5" />}
              {loading ? 'Generating Brainstorm...' : 'Generate Brainstorm'}
            </button>

            {loading && (
              <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-xs text-primary">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  AI is building your study material sections...
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}
          </form>

          <div className="xl:col-span-8 space-y-6">
            <section className="glass-card rounded-2xl p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Saved Brainstorms</h2>
                {historyLoading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
              </div>

              {history.length === 0 ? (
                <p className="text-sm text-gray-400">No saved brainstorms yet for this account.</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {history.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveResult(item)}
                      className={`rounded-xl border p-3 text-left transition-all ${
                        activeResult?.id === item.id
                          ? 'border-primary/50 bg-primary/10'
                          : 'border-white/15 bg-black/20 hover:border-white/30'
                      }`}
                    >
                      <p className="text-sm font-semibold text-white">{item.topic || 'Untitled topic'}</p>
                      <p className="mt-1 text-xs text-gray-300">{item.studyMode} • {item.difficulty}</p>
                      <p className="mt-1 text-xs text-gray-400">{formatDate(item.createdAt)}</p>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-4">
              {!activeResult && (
                <div className="glass-card rounded-2xl p-6 text-center text-gray-300">
                  <BookOpen className="mx-auto h-6 w-6 text-primary" />
                  <p className="mt-2 text-sm">Generate a brainstorm to view interactive study sections.</p>
                </div>
              )}

              {activeResult && SECTION_CONFIG.map((section) => (
                <article key={section.key} className="glass-card rounded-2xl p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => toggleSection(section.key)}
                      className="flex items-center gap-2 text-left"
                    >
                      <h3 className="text-base font-semibold text-white">{section.label}</h3>
                      {expandedSections[section.key] ? (
                        <ChevronUp className="h-4 w-4 text-gray-300" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-300" />
                      )}
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopySection(section.key)}
                        className="metal-button inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-100"
                      >
                        {copyState[section.key] === 'Copied' ? <Check className="h-3.5 w-3.5" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
                        {copyState[section.key]}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRegenerateSection(section.key)}
                        disabled={sectionLoading[section.key]}
                        className="metal-button inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {sectionLoading[section.key] ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                        Regenerate
                      </button>
                    </div>
                  </div>

                  {expandedSections[section.key] && (
                    <div className="mt-4 border-t border-white/10 pt-4">
                      {renderSectionBody(section.key)}
                    </div>
                  )}
                </article>
              ))}
            </section>

            {activeResult && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <FileText className="h-4 w-4" />
                Source type: {activeResult.sourceType} | Last updated: {formatDate(activeResult.updatedAt)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
