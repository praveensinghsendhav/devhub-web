'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Menu, X } from 'lucide-react';
import { Logo } from '../../common/components/Logo';
import { cn } from '../../common/lib/cn';
import { ThemeToggle } from '../../common/components/ThemeToggle';

const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#security', label: 'Security' },
];

const buttonBase =
  'inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50';

export function LandingHeader({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled || menuOpen
          ? 'border-b border-border bg-bg/75 backdrop-blur-xl'
          : 'border-b border-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm text-text-muted transition-colors hover:text-text"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle compact />
          {isAuthenticated ? (
            <Link
              href="/chat"
              className={cn(
                buttonBase,
                'btn-3d bg-primary text-primary-foreground hover:bg-primary-hover',
              )}
            >
              Open dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link href="/login" className={cn(buttonBase, 'text-text hover:bg-bg-hover')}>
                Log in
              </Link>
              <Link
                href="/register"
                className={cn(
                  buttonBase,
                  'btn-3d bg-primary text-primary-foreground hover:bg-primary-hover',
                )}
              >
                Register organization
              </Link>
            </>
          )}
        </div>

        <ThemeToggle compact className="ml-auto mr-1 md:hidden" />
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-text hover:bg-bg-hover md:hidden"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden md:hidden"
          >
            <div className="flex flex-col gap-1 px-4 pb-5">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm text-text-muted hover:bg-bg-hover hover:text-text"
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-3 grid grid-cols-2 gap-2">
                {isAuthenticated ? (
                  <Link
                    href="/chat"
                    className={cn(buttonBase, 'col-span-2 bg-primary text-primary-foreground')}
                  >
                    Open dashboard
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className={cn(buttonBase, 'border border-border text-text')}
                    >
                      Log in
                    </Link>
                    <Link
                      href="/register"
                      className={cn(buttonBase, 'bg-primary text-primary-foreground')}
                    >
                      Register
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
