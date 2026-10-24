'use client';

import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';

export default function LearnPage() {
  const { strings } = useLanguage();
  const l = strings.learn;

  return (
    <main id="main-content" className="flex-1">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-semibold text-navy-900">{l.title}</h1>
        <p className="mt-3 text-navy-600">{l.subtitle}</p>

        <p
          className="mt-6 rounded-lg border border-info-100 bg-info-50 p-4 text-sm text-info-700"
          role="note"
        >
          {l.importantNote}
        </p>

        <ul className="mt-8 space-y-4">
          {l.sections.map((s) => (
            <li
              key={s.title}
              className="card-hover flex gap-4 rounded-xl border border-navy-100 bg-white p-6"
            >
              <span className="text-2xl" aria-hidden="true">
                {s.icon}
              </span>
              <div>
                <h2 className="text-lg font-semibold text-navy-900">{s.title}</h2>
                <p className="mt-2 text-navy-700">{s.content}</p>
              </div>
            </li>
          ))}
        </ul>

        <Link
          href="/check"
          className="mt-10 inline-block rounded-lg bg-blue-500 px-6 py-3 font-semibold text-white hover:bg-blue-600 transition-colors"
        >
          {strings.home.cta}
        </Link>
      </div>
    </main>
  );
}
