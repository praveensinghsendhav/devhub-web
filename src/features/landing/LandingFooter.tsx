import Link from 'next/link';
import { Logo } from '../../common/components/Logo';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { href: '#features', label: 'Features' },
      { href: '#how-it-works', label: 'How it works' },
      { href: '#security', label: 'Security' },
    ],
  },
  {
    title: 'Get started',
    links: [
      { href: '/register', label: 'Register organization' },
      { href: '/login', label: 'Log in' },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-bg-elevated/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-text-muted">
            Chat, presence, whiteboards and meetings for developer teams — in one private hub for
            your organization.
          </p>
        </div>
        {COLUMNS.map((column) => (
          <div key={column.title}>
            <p className="text-sm font-semibold text-text">{column.title}</p>
            <ul className="mt-4 flex flex-col gap-2.5">
              {column.links.map((link) => (
                <li key={link.href}>
                  {link.href.startsWith('#') ? (
                    <a
                      href={link.href}
                      className="text-sm text-text-muted transition-colors hover:text-text"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-sm text-text-muted transition-colors hover:text-text"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-text-muted sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} DevHub. All rights reserved.</p>
          <p>Made for teams who ship together.</p>
        </div>
      </div>
    </footer>
  );
}
