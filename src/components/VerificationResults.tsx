'use client';

import { useEffect, useRef } from 'react';
import type { VerificationResponse, EvidenceStatus, Finding } from '@/lib/types';
import { useLanguage } from './LanguageProvider';

const statusBadge: Record<EvidenceStatus, string> = {
  supported: 'bg-success-100 text-success-700',
  contradicted: 'bg-danger-100 text-danger-700',
  suspicious: 'bg-warning-100 text-warning-700',
  insufficient: 'bg-info-100 text-info-700',
};

const sectionTitle = 'text-xl font-semibold text-navy-900';
const card = 'rounded-xl border border-navy-100 bg-white p-4';

/** The part of a finding worth showing under its label: the quoted words, or the detail after "Label: ". */
function claimDetail(f: Finding): string {
  if (f.origin === 'ai') return `“${f.claim}”`;
  const i = f.claim.indexOf(': ');
  return i === -1 ? `“${f.claim}”` : f.claim.slice(i + 2);
}

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
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to the result so screen reader users hear it and keyboard users start there.
  useEffect(() => {
    headingRef.current?.focus();
  }, [result]);

  const { findings } = result;
  const sources = [
    ...new Map(findings.flatMap((f) => (f.officialSource ? [[f.officialSource.id, f.officialSource] as const] : []))).values(),
  ];
  const reasons = [...new Map(findings.map((f) => [f.rule, f])).values()];
  const uncertain = [
    ...result.uncertainties.map((u) => (es ? u.es : u.en)),
    ...(result.aiAdvisor ? [] : [r.uncertainNoAi]),
    ...(findings.some((f) => f.origin === 'ai') ? [r.uncertainAiFindings] : []),
  ];
  const mainSteps = result.nextSteps.slice(0, 2);
  const moreSteps = result.nextSteps.slice(2);

  return (
    <div className="space-y-8">
      <button
        onClick={onReset}
        className="inline-flex min-h-11 items-center text-blue-600 hover:text-blue-700 font-medium underline"
      >
        {r.backToCheck}
      </button>

      <section className={`rounded-xl p-6 status-${result.overallAssessment}`}>
        <p className="text-sm font-semibold uppercase tracking-wide text-navy-700">{r.riskLabel}</p>
        <h1 ref={headingRef} tabIndex={-1} className="mt-1 text-2xl font-semibold text-navy-900">
          {es ? result.summaryTitleEs : result.summaryTitle}
        </h1>
        <p className="mt-3 text-navy-700">
          {es ? result.summaryDescriptionEs : result.summaryDescription}
        </p>
      </section>

      {/* 1. What was detected */}
      <section>
        <h2 className={sectionTitle}>{r.findingsTitle}</h2>
        {findings.length === 0 ? (
          <p className="mt-3 text-navy-700">{r.nothingDetected}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {findings.map((f) => (
              <li key={f.id} className={card}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge[f.evidenceStatus]}`}>
                    {r.evidenceStatus[f.evidenceStatus]}
                  </span>
                  {f.origin === 'ai' && (
                    <span className="rounded-full bg-navy-100 px-3 py-1 text-xs font-semibold text-navy-700">
                      {r.aiBadge}
                    </span>
                  )}
                </div>
                <p className="mt-2 font-semibold text-navy-900">{r.rules[f.rule].label}</p>
                {/* Shown as text, never a link: it comes from the untrusted message */}
                <p className="mt-1 break-words text-sm text-navy-700">{claimDetail(f)}</p>
              </li>
            ))}
          </ul>
        )}

        {result.pressure.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold text-navy-900">{r.pressureTitle}</h3>
            <p className="mt-1 text-sm text-navy-700">{r.pressureNote}</p>
            <ul className="mt-3 space-y-2">
              {result.pressure.map((s) => (
                <li key={s} className="rounded-lg border border-warning-100 bg-warning-50 p-3 text-sm text-navy-900">
                  “{s}”
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.aiAdvisor && (
          <div className={`mt-6 ${card}`}>
            <h3 className="font-semibold text-navy-900">{r.aiTitle}</h3>
            <p className="mt-2 text-navy-700">
              {es ? result.aiAdvisor.explanationEs : result.aiAdvisor.explanation}
            </p>
            <p className="mt-2 text-xs text-navy-600">{r.aiNote}</p>
          </div>
        )}
      </section>

      {/* 2. Why it matters */}
      <section>
        <h2 className={sectionTitle}>{r.whyTitle}</h2>
        {reasons.length === 0 ? (
          <p className="mt-3 text-navy-700">{r.nothingToExplain}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {reasons.map((f) => (
              <li key={f.rule} className="text-navy-700">
                <span className="font-semibold text-navy-900">{r.rules[f.rule].label}.</span>{' '}
                {f.origin === 'ai' && !es ? f.reason : r.rules[f.rule].why}
                {findings.some((x) => x.rule === f.rule && x.evidenceStatus === 'contradicted') &&
                  ` ${r.conflictsWithSource}`}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 3. Evidence */}
      <section>
        <h2 className={sectionTitle}>{r.evidenceTitle}</h2>
        {sources.length === 0 ? (
          <p className="mt-3 text-navy-700">{r.noSources}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {sources.map((s) => (
              <li key={s.id} className={`${card} text-sm text-navy-700`}>
                <p className="font-semibold text-navy-900">{s.agency}</p>
                <p className="mt-2">{s.policyStatement}</p>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block py-2 text-blue-600 underline break-all"
                >
                  {s.url}
                </a>
                <p className="text-navy-600">
                  {r.lastVerifiedLabel} {s.lastVerifiedDate}
                </p>
                {s.verificationStatus !== 'verified' && (
                  <p className="mt-1 text-warning-700">{r.unverifiedSourceNote}</p>
                )}
              </li>
            ))}
          </ul>
        )}

        {findings.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold text-navy-900">{r.howDetected}</h3>
            <ul className="mt-2 space-y-1 text-sm text-navy-700">
              {findings.map((f) => (
                <li key={f.id}>
                  {r.rules[f.rule].label}: {r.ruleLabel} <code className="text-navy-900">{f.rule}</code>
                  {f.officialSource && <> · {f.officialSource.agency}</>} · {r.strengthLabel}{' '}
                  {r.evidenceStrength[f.evidenceStrength]}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* 4. What remains uncertain */}
      <section>
        <h2 className={sectionTitle}>{r.uncertainTitle}</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-navy-700">
          {uncertain.map((u) => (
            <li key={u}>{u}</li>
          ))}
        </ul>
      </section>

      {/* 5. Recommended next steps */}
      <section>
        <h2 className={sectionTitle}>{r.nextStepsTitle}</h2>
        <ul className="mt-4 space-y-3">
          {mainSteps.map((s) => (
            <li key={s.action} className="rounded-xl border-2 border-blue-200 bg-white p-5">
              <h3 className="font-semibold text-navy-900">{es ? s.actionEs : s.action}</h3>
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
        {moreSteps.length > 0 && (
          <details className="mt-4 rounded-xl border border-navy-100 bg-white px-5 py-2">
            <summary className="cursor-pointer py-2 font-medium text-navy-900">
              {r.moreSteps} ({moreSteps.length})
            </summary>
            <ul className="mb-2 mt-2 space-y-4">
              {moreSteps.map((s) => (
                <li key={s.action}>
                  <h3 className="font-semibold text-navy-900">{es ? s.actionEs : s.action}</h3>
                  <p className="mt-1 text-sm text-navy-700">{es ? s.descriptionEs : s.description}</p>
                  {s.url && (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block py-2 text-sm text-blue-600 underline break-all"
                    >
                      {s.url}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <p className="text-sm text-navy-600">{es ? result.disclaimerEs : result.disclaimer}</p>
    </div>
  );
}
