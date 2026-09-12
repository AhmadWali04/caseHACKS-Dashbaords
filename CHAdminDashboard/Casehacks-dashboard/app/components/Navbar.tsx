'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/events', label: 'Events' },
  { href: '/scan', label: 'Scan' },
  { href: '/dashboard/hackers', label: 'Hackers' },
  { href: '/dashboard/questions', label: 'Questions' },
  { href: '/dashboard/team-matching', label: 'Team Matching' },
  { href: '/dashboard/sponsor', label: 'Sponsors' },
  { href: '/admin/approve', label: 'Admin' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const linkClass = (href: string) =>
    `text-sm transition-colors ${
      pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
        ? 'text-primary font-semibold'
        : 'text-foreground/80 hover:text-primary'
    }`;

  return (
    <nav className="bg-card border-b border-border px-4 py-3 overflow-x-hidden">
      <div className="max-w-6xl mx-auto">

        {/* Mobile header row: logo + hamburger */}
        <div className="flex items-center justify-between sm:hidden">
          <Link href="/dashboard">
            <Image src="/CaseLogoMobile.png" alt="CaseHacks" width={577} height={133} style={{ height: '32px', width: 'auto' }} priority />
          </Link>
          <button
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle menu"
            className="p-1 rounded text-foreground/80 hover:text-primary"
          >
            {menuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div className="sm:hidden flex flex-col mt-2 gap-1 border-t border-border pt-2">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={linkClass(href) + ' py-2 px-1'}
              >
                {label}
              </Link>
            ))}
          </div>
        )}

        {/* Desktop layout: logo + inline links */}
        <div className="hidden sm:flex items-center gap-4">
          <Link href="/dashboard" className="shrink-0">
            <Image src="/CaseLogo.png" alt="CaseHacks" width={181} height={105} style={{ height: '36px', width: 'auto' }} priority />
          </Link>
          <div className="flex items-center gap-4 overflow-x-auto scrollbar-none min-w-0 pb-0.5">
            {NAV_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} className={linkClass(href) + ' whitespace-nowrap'}>
                {label}
              </Link>
            ))}
          </div>
        </div>

      </div>
    </nav>
  );
}
