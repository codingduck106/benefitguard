'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useLanguage } from './LanguageProvider';

export default function Header() {
  const { strings, toggleLocale } = useLanguage();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: '/', label: strings.nav.home },
    { href: '/check', label: strings.nav.check },
    { href: '/resources', label: strings.nav.resources },
    { href: '/learn', label: strings.nav.learn },
  ];

  return (
    <header className="bg-white border-b border-navy-100 sticky top-0 z-50" role="banner">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 text-navy-900 hover:text-blue-600 transition-colors"
            aria-label="BenefitGuard home"
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <rect width="32" height="32" rx="8" fill="#0967d2" />
              <path
                d="M16 6L8 10v6c0 5.55 3.41 10.74 8 12 4.59-1.26 8-6.45 8-12v-6l-8-4z"
                fill="white"
                opacity="0.9"
              />
              <path
                d="M14 16l2 2 4-4"
                stroke="#0967d2"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-xl font-semibold tracking-tight">
              BenefitGuard
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-navy-600 hover:text-navy-900 hover:bg-navy-50'
                }`}
                aria-current={pathname === item.href ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
            <button
              onClick={toggleLocale}
              className="ml-2 px-3 py-2 rounded-lg text-sm font-medium text-navy-600 hover:text-navy-900 hover:bg-navy-50 transition-colors border border-navy-200"
              aria-label={`Switch language to ${strings.nav.language}`}
              id="language-toggle"
            >
              🌐 {strings.nav.language}
            </button>
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-navy-600 hover:bg-navy-50"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label="Toggle navigation menu"
            id="mobile-menu-button"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {mobileMenuOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <>
                  <path d="M3 12h18M3 6h18M3 18h18" />
                </>
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <nav
            id="mobile-menu"
            className="md:hidden pb-4 border-t border-navy-100 pt-2"
            aria-label="Mobile navigation"
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-3 rounded-lg text-base font-medium transition-colors ${
                  pathname === item.href
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-navy-600 hover:text-navy-900 hover:bg-navy-50'
                }`}
                aria-current={pathname === item.href ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
            <button
              onClick={() => {
                toggleLocale();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-3 rounded-lg text-base font-medium text-navy-600 hover:text-navy-900 hover:bg-navy-50 transition-colors"
              aria-label={`Switch language to ${strings.nav.language}`}
            >
              🌐 {strings.nav.language}
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}
