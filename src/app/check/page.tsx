'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import VerificationResults from '@/components/VerificationResults';
import type {
  AlreadyResponded,
  MessageType,
  Program,
  SampleMessage,
  VerificationResponse,
} from '@/lib/types';

const MAX_LENGTH = 5000;
const MESSAGE_TYPES: MessageType[] = ['text', 'email', 'letter', 'website', 'call', 'social-media'];
const PROGRAMS: Program[] = ['medi-cal', 'health-plan', 'calfresh-ebt', 'medicare', 'other'];
const RESPONSES: AlreadyResponded[] = ['no', 'clicked', 'shared-info', 'paid', 'unsure'];

const fieldClass =
  'mt-1 block w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-navy-900';

export default function CheckPage() {
  const { locale, strings } = useLanguage();
  const c = strings.check;

  const [messageContent, setMessageContent] = useState('');
  const [messageType, setMessageType] = useState<MessageType>('text');
  const [program, setProgram] = useState<Program | ''>('');
  const [alreadyResponded, setAlreadyResponded] = useState<AlreadyResponded | ''>('');
  const [url, setUrl] = useState('');
  const [samples, setSamples] = useState<SampleMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResponse | null>(null);
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // OCR runs in the browser; the image is never sent to the server.
  const readImage = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        setError(c.screenshotNotImage);
        return;
      }
      setError(null);
      setReading(true);
      try {
        const { recognize } = await import('tesseract.js');
        const { data } = await recognize(file, 'eng+spa');
        const text = data.text.trim();
        if (!text) {
          setError(c.screenshotNoText);
          return;
        }
        setMessageContent((prev) => (prev.trim() ? `${prev.trim()}\n\n${text}` : text).slice(0, MAX_LENGTH));
      } catch {
        setError(c.screenshotError);
      } finally {
        setReading(false);
      }
    },
    [c]
  );

  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const file = Array.from(e.clipboardData?.files ?? []).find((f) =>
        f.type.startsWith('image/')
      );
      if (!file) return; // plain text pastes behave normally
      e.preventDefault();
      readImage(file);
    }
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [readImage]);

  useEffect(() => {
    fetch('/api/samples')
      .then((res) => res.json())
      .then((data) => setSamples(data.samples ?? []))
      .catch(() => setSamples([]));
  }, []);

  function loadSample(id: string) {
    const sample = samples.find((s) => s.id === id);
    if (!sample) return;
    setMessageContent(sample.content);
    setMessageType(sample.messageType);
    setProgram(sample.topic.startsWith('medi-cal') || sample.topic === 'payment-request' ? 'medi-cal' : '');
    setUrl('');
    setError(null);
  }

  function clearForm() {
    setMessageContent('');
    setUrl('');
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!messageContent.trim()) return setError(c.errorRequired);
    if (messageContent.length > MAX_LENGTH) return setError(c.errorTooLong);
    if (url.trim()) {
      try {
        new URL(url.trim());
      } catch {
        return setError(c.errorUrl);
      }
    }

    setLoading(true);
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageContent,
          messageType,
          ...(program && { program }),
          ...(alreadyResponded && { alreadyResponded }),
          url: url.trim(),
          language: locale,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          res.status === 429
            ? c.errorTooMany
            : data.details?.[0]?.message ?? data.error ?? 'Something went wrong.'
        );
        return;
      }
      setResult(data);
      window.scrollTo({ top: 0 });
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main id="main-content" className="flex-1">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {result ? (
          <VerificationResults result={result} onReset={() => setResult(null)} />
        ) : (
          <>
            <h1 className="text-3xl font-semibold text-navy-900">{c.title}</h1>
            <p className="mt-3 text-navy-600">{c.subtitle}</p>
            <p
              className="mt-6 rounded-lg border border-warning-100 bg-warning-50 p-4 text-sm text-warning-700"
              role="note"
            >
              {c.privacyWarning}
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-6" noValidate>
              {samples.length > 0 && (
                <div>
                  <label htmlFor="sample" className="block text-sm font-medium text-navy-700">
                    {c.sampleLabel}
                  </label>
                  <select
                    id="sample"
                    className={fieldClass}
                    defaultValue=""
                    onChange={(e) => loadSample(e.target.value)}
                  >
                    <option value="">{c.sampleSelect}</option>
                    {samples.map((s) => (
                      <option key={s.id} value={s.id}>
                        {locale === 'es' ? s.labelEs : s.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}


              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  const file = e.dataTransfer.files[0];
                  if (file) readImage(file);
                }}
                className={`rounded-lg border-2 border-dashed p-4 ${
                  dragging ? 'border-blue-400 bg-blue-50' : 'border-navy-200 bg-white'
                }`}
              >
                <p className="text-sm font-medium text-navy-700">{c.screenshotLabel}</p>
                <p className="mt-1 text-xs text-navy-600">{c.screenshotHelp}</p>
                <input
                  ref={fileInput}
                  id="screenshot"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden="true"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) readImage(file);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  disabled={reading}
                  onClick={() => fileInput.current?.click()}
                  className="mt-3 rounded-lg border border-navy-200 px-4 py-2 text-sm font-medium text-navy-700 hover:bg-navy-50 disabled:opacity-60"
                >
                  {reading ? c.screenshotReading : c.screenshotButton}
                </button>
                {reading && (
                  <p role="status" className="mt-2 text-sm text-navy-600">
                    {c.screenshotReading}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-navy-700">
                  {c.messageLabel}
                </label>
                <textarea
                  id="message"
                  rows={8}
                  className={fieldClass}
                  placeholder={c.messagePlaceholder}
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  aria-describedby={error ? 'form-error' : undefined}
                />
                <p className="mt-1 text-right text-xs text-navy-600">
                  {messageContent.length} / {MAX_LENGTH}
                </p>
              </div>

              <div>
                <label htmlFor="url" className="block text-sm font-medium text-navy-700">
                  {c.urlLabel}
                </label>
                <input
                  id="url"
                  type="text"
                  inputMode="url"
                  className={fieldClass}
                  placeholder={c.urlPlaceholder}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>

              <details className="rounded-lg border border-navy-200 bg-white px-4 py-2">
                <summary className="cursor-pointer py-2 text-sm font-medium text-navy-700">
                  {c.detailsSummary}
                </summary>
                <p className="mt-1 text-xs text-navy-600">{c.detailsHelp}</p>
                <div className="mt-4 mb-2 grid gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="type" className="block text-sm font-medium text-navy-700">
                      {c.typeLabel}
                    </label>
                    <select
                      id="type"
                      className={fieldClass}
                      value={messageType}
                      onChange={(e) => setMessageType(e.target.value as MessageType)}
                    >
                      {MESSAGE_TYPES.map((m) => (
                        <option key={m} value={m}>
                          {c.types[m]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="program" className="block text-sm font-medium text-navy-700">
                      {c.programLabel}
                    </label>
                    <select
                      id="program"
                      className={fieldClass}
                      value={program}
                      onChange={(e) => setProgram(e.target.value as Program | '')}
                    >
                      <option value="">{c.notSure}</option>
                      {PROGRAMS.map((p) => (
                        <option key={p} value={p}>
                          {c.programs[p]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="responded" className="block text-sm font-medium text-navy-700">
                      {c.respondedLabel}
                    </label>
                    <select
                      id="responded"
                      className={fieldClass}
                      value={alreadyResponded}
                      onChange={(e) => setAlreadyResponded(e.target.value as AlreadyResponded | '')}
                    >
                      <option value="">{c.chooseAnswer}</option>
                      {RESPONSES.map((a) => (
                        <option key={a} value={a}>
                          {c.responses[a]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </details>

              {error && (
                <p id="form-error" role="alert" className="text-sm font-medium text-danger-600">
                  {error}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-blue-500 px-6 py-3 font-semibold text-white hover:bg-blue-600 disabled:opacity-60 transition-colors"
                >
                  {loading ? c.checking : c.checkButton}
                </button>
                <button
                  type="button"
                  onClick={clearForm}
                  className="rounded-lg border border-navy-200 px-6 py-3 font-medium text-navy-700 hover:bg-navy-50 transition-colors"
                >
                  {c.clearButton}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
