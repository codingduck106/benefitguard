'use client';

import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';

export default function Home() {
  const { strings } = useLanguage();
  const h = strings.home;

  const steps = [
    { title: h.step1Title, desc: h.step1Desc },
    { title: h.step2Title, desc: h.step2Desc },
    { title: h.step3Title, desc: h.step3Desc },
  ];

  return (
    <main id="main-content" className="flex-1">
      {/* Hero */}
      <section className="bg-white border-b border-navy-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
          <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-navy-900">
            {h.headline}
          </h1>
          <p className="mt-6 text-lg leading-8 text-navy-600 max-w-2xl mx-auto">
            {h.subheadline}
          </p>
          <Link
            href="/check"
            className="mt-10 inline-block rounded-lg bg-blue-500 px-6 py-3 text-base font-semibold text-white hover:bg-blue-600 transition-colors"
          >
            {h.cta}
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-semibold text-navy-900 text-center">
          {h.howItWorks}
        </h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {steps.map((step, i) => (
            <li
              key={step.title}
              className="card-hover rounded-xl border border-navy-100 bg-white p-6"
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-lg font-semibold text-blue-700"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-navy-900">{step.title}</h3>
              <p className="mt-2 text-navy-600">{step.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Supported, learn, privacy */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 grid gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-navy-100 bg-white p-6">
          <h2 className="text-lg font-semibold text-navy-900">{h.supportedTitle}</h2>
          <ul className="mt-3 space-y-2 text-navy-600">
            <li>✓ {h.supportedMediCal}</li>
            <li className="text-navy-600">{h.supportedMore}</li>
          </ul>
        </div>
        <div className="rounded-xl border border-navy-100 bg-white p-6">
          <h2 className="text-lg font-semibold text-navy-900">{h.learnTitle}</h2>
          <p className="mt-3 text-navy-600">{h.learnDesc}</p>
          <Link
            href="/learn"
            className="mt-2 inline-flex min-h-11 items-center font-medium text-blue-600 hover:text-blue-700 underline"
          >
            {h.learnCta}
          </Link>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-6">
          <h2 className="text-lg font-semibold text-navy-900">{h.privacyTitle}</h2>
          <p className="mt-3 text-navy-700">{h.privacyText}</p>
        </div>
      </section>

      <p className="max-w-4xl mx-auto px-4 pb-12 text-center text-sm text-navy-600">
        {h.disclaimerText}
      </p>
    </main>
  );
}
