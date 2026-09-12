'use client';

import { useState, useEffect, useRef } from 'react';
import { getHackers } from './actions';
import Link from 'next/link';

const PAGE_SIZE = 50;

interface Hacker {
  id: string;
  name: string | null;
  email: string;
  school: string | null;
  status: string | null;
}

type StatusFilter = 'all' | 'accepted' | 'pending';

export default function HackersPage() {
  const [hackers, setHackers] = useState<Hacker[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const topRef = useRef<HTMLDivElement>(null);

  // Debounce search → reset page
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Server-side fetch whenever page, search, or filter changes
  useEffect(() => {
    setLoading(true);
    getHackers(page, debouncedSearch, statusFilter).then(({ hackers, total }) => {
      setHackers(hackers ?? []);
      setTotal(total);
      setLoading(false);
    });
  }, [page, debouncedSearch, statusFilter]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const goToPage = (next: number) => {
    setPage(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div ref={topRef} className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <h1 className="text-4xl font-bold text-primary">Hacker Profiles</h1>
          <p className="text-sm text-foreground/60">{total} total</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            placeholder="Search by name, email, or school…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as StatusFilter);
              setPage(0);
            }}
            className="px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
          >
            <option value="all">All statuses</option>
            <option value="accepted">Accepted</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        <div className={`bg-card rounded-lg shadow overflow-hidden transition-opacity duration-150 ${loading ? 'opacity-60' : ''}`}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-background">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">Email</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">School</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">Status</th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">View</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {hackers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-foreground/60">
                      {loading ? 'Loading…' : 'No hackers match your search.'}
                    </td>
                  </tr>
                ) : (
                  hackers.map((hacker) => (
                    <tr key={hacker.id} className="hover:bg-background/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{hacker.name || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground/80">{hacker.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground/80">{hacker.school || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${hacker.status === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {hacker.status || 'pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link href={`/dashboard/hackers/${hacker.id}`} className="text-primary hover:text-primary/80">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={() => goToPage(Math.max(0, page - 1))}
              disabled={page === 0 || loading}
              className="px-4 py-2 text-sm bg-card border border-border rounded-lg text-foreground hover:bg-foreground/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <span className="text-sm text-foreground/60 text-center">
              <span className="block">Page {page + 1} of {totalPages}</span>
              <span className="block text-xs">Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}</span>
            </span>
            <button
              onClick={() => goToPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1 || loading}
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
