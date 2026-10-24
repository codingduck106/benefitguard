'use client';

import type { VerificationResponse, EvidenceStatus } from '@/lib/types';
import { useLanguage } from './LanguageProvider';

const statusBadge: Record<EvidenceStatus, string> = {
  supported: 'bg-success-100 text-success-700',
  contradicted: 'bg-danger-100 text-danger-700',
  suspicious: 'bg-warning-100 text-warning-700',
  insufficient: 'bg-info-100 text-info-700',
};

const priorityBadge = {
  high: 'bg-danger-100 text-danger-700',
  medium: 'bg-warning-100 text-warning-700',
  low: 'bg-info-100 text-info-700',
};

export default function VerificationResults({
  result,
  onReset,
}: {
  result: VerificationResponse;
  onReset: () => void;
}) {
  const { locale, strings } = useLanguage();
  const r = strings.results;
  const es = locale === 'es';

  return (
    <div className="space-y-8" aria-live="polite">
      <button
        onClick={onReset}
        className="inline-flex min-h-11 items-center text-blue-600 hover:text-blue-700 font-medium underline"
      >
        {r.backToCheck}
      </button>

      <section className={`rounded-xl p-6 status-${result.overallAssessment}`}>
        <h2 className="text-2xl font-semibold text-navy-900">
          {es ? result.summaryTitleEs : result.summaryTitle}
        </h2>
        <p className="mt-3 text-navy-700">
          {es ? result.summaryDescriptionEs : result.summaryDescription}
        </p>
      </section>

      {result.findings.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-navy-900">{r.findingsTitle}</h2>
          <ul className="mt-4 space-y-4">
            {result.findings.map((f) => (
              <li key={f.id} className="rounded-xl border border-navy-100 bg-white p-5">
                <span
                  className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusBadge[f.evidenceStatus]}`}
                >
                  {r.evidenceStatus[f.evidenceStatus]}
                </span>
                {f.origin === 'ai' && (
                  <span className="ml-2 inline-block rounded-full bg-navy-100 px-3 py-1 text-xs font-semibold text-navy-700">
                    {r.aiBadge}
                  </span>
                )}
                <dl className="mt-3 space-y-2 text-sm text-navy-700">
                  <div>
                    <dt className="font-semibold text-navy-900">{r.claimLabel}</dt>
                    <dd>{f.claim}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-navy-900">{r.reasonLabel}</dt>
                    <dd>{f.reason}</dd>
                  </div>
                  {f.officialSource && (
                    <div>
                      <dt className="font-semibold text-navy-900">{r.sourceLabel}</dt>
                      <dd>
                        {f.officialSource.agency} —{' '}
                        <a
                          href={f.officialSource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block py-2 text-blue-600 underline break-all"
                        >
                          {f.officialSource.url}
                        </a>
                        <p className="mt-1">{f.officialSource.policyStatement}</p>
                        <p className="mt-1 text-navy-500">
                          {r.lastVerifiedLabel} {f.officialSource.lastVerifiedDate}
                        </p>
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="font-semibold text-navy-900">{r.strengthLabel}</dt>
                    <dd>{r.evidenceStrength[f.evidenceStrength]}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-navy-900">{r.actionLabel}</dt>
                    <dd>{es ? f.recommendedActionEs : f.recommendedAction}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.urlAnalysis.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-navy-900">{r.urlTitle}</h2>
          <ul className="mt-4 space-y-3">
            {result.urlAnalysis.map((u) => (
              <li key={u.url} className="rounded-xl border border-navy-100 bg-white p-5 text-sm">
                {/* Shown as text, never a link: the URL is untrusted */}
                <p className="font-mono break-all text-navy-900">{u.hostname}</p>
                <p className="mt-2 text-navy-700">{u.notes}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.nextSteps.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-navy-900">{r.nextStepsTitle}</h2>
          <ul className="mt-4 space-y-3">
            {result.nextSteps.map((s) => (
              <li key={s.action} className="rounded-xl border border-navy-100 bg-white p-5">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${priorityBadge[s.priority]}`}
                  >
                    {s.priority}
                  </span>
                  <h3 className="font-semibold text-navy-900">{es ? s.actionEs : s.action}</h3>
                </div>
                <p className="mt-2 text-sm text-navy-700">{es ? s.descriptionEs : s.description}</p>
                {s.url && (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block py-2 text-sm text-blue-600 underline break-all"
                  >
                    {s.url}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="text-xl font-semibold text-navy-900">{r.whyTitle}</h2>
        <p className="mt-3 text-navy-700">
          {es ? result.explanationOfResultEs : result.explanationOfResult}
        </p>
      </section>

      {result.aiAdvisor && (
        <section className="rounded-xl border border-navy-100 bg-white p-5">
          <h2 className="text-lg font-semibold text-navy-900">{r.aiTitle}</h2>
          <p className="mt-2 text-navy-700">
            {es ? result.aiAdvisor.explanationEs : result.aiAdvisor.explanation}
          </p>
          <p className="mt-2 text-xs text-navy-500">{r.aiNote}</p>
        </section>
      )}

      <p className="text-sm text-navy-500">{es ? result.disclaimerEs : result.disclaimer}</p>
    </div>
  );
}
