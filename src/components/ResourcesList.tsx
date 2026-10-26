'use client';

import { useState } from 'react';
import type { OfficialSource, ApprovedDomain } from '@/lib/types';
import { useLanguage } from './LanguageProvider';

const statusClass: Record<string, string> = {
  verified: 'bg-success-100 text-success-700',
  unverified: 'bg-warning-100 text-warning-700',
  stale: 'bg-warning-100 text-warning-700',
  unavailable: 'bg-danger-100 text-danger-700',
};

export default function ResourcesList({
  sources,
  domains,
}: {
  sources: OfficialSource[];
  domains: ApprovedDomain[];
}) {
  const { strings } = useLanguage();
  const r = strings.resources;
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const filteredSources = sources.filter(
    (s) =>
      !q ||
      [s.agency, s.topic, s.policyStatement, ...s.keywords].some((v) =>
        v.toLowerCase().includes(q)
      )
  );
  const filteredDomains = domains.filter(
    (d) =>
      !q || [d.hostname, d.agency, d.description].some((v) => v.toLowerCase().includes(q))
  );

  return (
    <main id="main-content" className="flex-1">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-semibold text-navy-900">{r.title}</h1>
        <p className="mt-3 text-navy-600">{r.subtitle}</p>

        <label htmlFor="resource-search" className="sr-only">
          {r.searchPlaceholder}
        </label>
        <input
          id="resource-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={r.searchPlaceholder}
          className="mt-6 block w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-navy-900"
        />

        {filteredDomains.length > 0 && (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {filteredDomains.map((d) => (
              <li key={d.hostname} className="rounded-xl border border-navy-100 bg-white p-5">
                <a
                  href={`https://${d.hostname}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block py-2 font-semibold text-blue-600 underline break-all"
                >
                  {d.hostname}
                </a>
                <p className="mt-2 text-sm text-navy-700">{d.agency}</p>
                <p className="mt-1 text-sm text-navy-600">{d.description}</p>
              </li>
            ))}
          </ul>
        )}

        {filteredSources.length > 0 && (
          <ul className="mt-8 space-y-4">
            {filteredSources.map((s) => (
              <li key={s.id} className="rounded-xl border border-navy-100 bg-white p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-navy-900">{s.topic}</h2>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass[s.verificationStatus]}`}
                  >
                    {r.statuses[s.verificationStatus]}
                  </span>
                </div>
                <dl className="mt-3 space-y-2 text-sm text-navy-700">
                  <div>
                    <dt className="font-semibold text-navy-900">{r.agencyLabel}</dt>
                    <dd>{s.agency}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-navy-900">{r.descriptionLabel}</dt>
                    <dd>{s.policyStatement}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-navy-900">{r.urlLabel}</dt>
                    <dd>
                      <a
                        href={s.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block py-2 text-blue-600 underline break-all"
                      >
                        {s.sourceUrl}
                      </a>
                    </dd>
                  </div>
                  <div className="text-navy-600">
                    <dt className="inline">{r.lastVerifiedLabel}</dt>{' '}
                    <dd className="inline">{s.lastVerifiedDate}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}

        {filteredSources.length === 0 && filteredDomains.length === 0 && (
          <p className="mt-8 text-navy-600" role="status">
            No resources match “{query}”.
          </p>
        )}
      </div>
    </main>
  );
}
