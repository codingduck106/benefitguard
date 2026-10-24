'use client';

import { useLanguage } from './LanguageProvider';

export default function Footer() {
  const { strings } = useLanguage();

  return (
    <footer className="border-t border-navy-100 bg-white mt-auto" role="contentinfo">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <p className="text-sm text-navy-600">{strings.footer.disclaimer}</p>
      </div>
    </footer>
  );
}
