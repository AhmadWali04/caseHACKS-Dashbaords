'use client';

import { useEffect, useState, useRef } from 'react';
import { getSponsorsHackersPaginated, type SponsorHacker } from '../sponsor-export/actions';

const SPONSOR_PAGE_SIZE = 50;

export default function SponsorPage() {
  const [hackers, setHackers] = useState<SponsorHacker[]>([]);
  const [schools, setSchools] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [schoolFilter, setSchoolFilter] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Server-side fetch on page / search / school filter change
  useEffect(() => {
    setIsLoading(true);
    setExpandedId(null);
    getSponsorsHackersPaginated(page, debouncedSearch, schoolFilter).then(({ hackers, total, schools, error }) => {
      if (error) { setError(error); }
      else {
        setHackers(hackers);
        setTotal(total);
        if (schools.length > 0) setSchools(schools);
      }
      setIsLoading(false);
    });
  }, [page, debouncedSearch, schoolFilter]);

  const totalPages = Math.ceil(total / SPONSOR_PAGE_SIZE);
  const filtered = hackers; // already filtered server-side

  const goToPage = (next: number) => {
    setPage(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExport = async () => {
    setExporting(true);
    const params = schoolFilter ? `?school=${encodeURIComponent(schoolFilter)}` : '';
    try {
      const res = await fetch(`/api/sponsor-export${params}`);
      if (!res.ok) {
        const { error } = await res.json();
        alert(error ?? 'Export failed');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.headers.get('Content-Disposition')?.split('filename="')[1]?.replace('"', '')
        ?? 'casehacks-resumes.zip';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Export failed — check your connection and try again.');
    } finally {
      setExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-6xl mx-auto animate-pulse space-y-4">
          <div className="h-10 bg-card rounded w-48" />
          <div className="h-12 bg-card rounded" />
          {[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-card rounded" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive text-lg">{error}</p>
          <button onClick={() => location.reload()} className="px-4 py-2 bg-primary text-white rounded-lg">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div ref={topRef} className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-primary">Sponsor View</h1>
            <p className="text-foreground/60 mt-1">
              {total} hacker{total !== 1 ? 's' : ''}
              {schoolFilter ? ` from ${schoolFilter}` : ''}
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting || filtered.filter(h => h.resumeFileName).length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {exporting ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Zipping…
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M8 12l4 4m0 0l4-4m-4 4V4" />
                </svg>
              Export Resumes{schoolFilter ? ` (${schoolFilter})` : ' (All)'}
              </>
            )}
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search by name, email or major…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <select
            value={schoolFilter}
            onChange={e => { setSchoolFilter(e.target.value); setExpandedId(null); setPage(0); }}
            className="px-4 py-2.5 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary min-w-[220px]"
          >
            <option value="">All Universities</option>
            {schools.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Hacker list */}
        <div className={`transition-opacity duration-150 ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}>
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-foreground/40">{isLoading ? 'Loading…' : 'No hackers match your filters.'}</div>
        ) : (
          <div className="space-y-2">
            {filtered.map(hacker => (
              <div key={hacker.id} className="bg-card border border-border rounded-lg overflow-hidden">
                {/* Row */}
                <button
                  onClick={() => setExpandedId(expandedId === hacker.id ? null : hacker.id)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-background/50 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm shrink-0">
                      {(hacker.name ?? hacker.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{hacker.name ?? hacker.email}</p>
                      <p className="text-sm text-foreground/60 truncate">{hacker.school} · {hacker.major}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {hacker.resumeFileName && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Resume</span>
                    )}
                    <svg
                      className={`h-4 w-4 text-foreground/40 transition-transform ${expandedId === hacker.id ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expanded detail panel */}
                {expandedId === hacker.id && (
                  <div className="border-t border-border px-5 py-5 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 bg-background/30">
                    <Field label="Email" value={hacker.email} />
                    <Field label="University" value={hacker.school} />
                    <Field label="Major" value={hacker.major} />
                    <Field label="Status" value={hacker.status} />

                    {/* Social links */}
                    <div className="sm:col-span-2 flex flex-wrap gap-3 pt-1">
                      {hacker.linkedin && (
                        <SocialLink href={hacker.linkedin} label="LinkedIn" color="text-blue-600" />
                      )}
                      {hacker.github && (
                        <SocialLink
                          href={hacker.github.startsWith('http') ? hacker.github : `https://${hacker.github}`}
                          label="GitHub"
                          color="text-foreground"
                        />
                      )}
                      {hacker.portfolio && (
                        <SocialLink
                          href={hacker.portfolio.startsWith('http') ? hacker.portfolio : `https://${hacker.portfolio}`}
                          label="Portfolio"
                          color="text-purple-600"
                        />
                      )}
                      {hacker.resumeSignedUrl ? (
                        <a
                          href={hacker.resumeSignedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm rounded-lg font-medium hover:bg-primary/90 transition-colors"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          View Resume
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border text-sm rounded-lg text-foreground/40">
                          No Resume
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <button
              onClick={() => goToPage(Math.max(0, page - 1))}
              disabled={page === 0 || isLoading}
              className="px-4 py-2 text-sm bg-card border border-border rounded-lg text-foreground hover:bg-foreground/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <span className="text-sm text-foreground/60 text-center">
              <span className="block">Page {page + 1} of {totalPages}</span>
              <span className="block text-xs">Showing {page * SPONSOR_PAGE_SIZE + 1}–{Math.min((page + 1) * SPONSOR_PAGE_SIZE, total)} of {total}</span>
            </span>
            <button
              onClick={() => goToPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1 || isLoading}
              className="px-4 py-2 text-sm bg-card border border-border rounded-lg text-foreground hover:bg-foreground/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium text-foreground/50 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-foreground">{value ?? <span className="text-foreground/30">—</span>}</p>
    </div>
  );
}

function SocialLink({ href, label, color }: { href: string; label: string; color: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border text-sm rounded-lg font-medium hover:bg-background transition-colors ${color}`}
    >
      {label} ↗
    </a>
  );
}
