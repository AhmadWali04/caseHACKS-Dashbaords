import { useEffect, useRef, useState } from 'react';
import { X, CheckCircle2, Trophy } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export default function BountiesDrawer({ open, onClose }) {
  const drawerRef = useRef(null);
  const { session } = useAuth();
  const [bounties, setBounties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !session) return;
    setLoading(true);

    const fetchBounties = async () => {
      try {
        const userRes = await fetch(`${API_URL}/api/user/email/${encodeURIComponent(session.user.email)}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const userData = await userRes.json();
        const userId = userData.user.id;

        const bountiesRes = await fetch(`${API_URL}/api/bounties/${userId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await bountiesRes.json();
        setBounties(data.bounties || []);
      } catch (err) {
        console.error('Error fetching bounties:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBounties();
  }, [open, session]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const completed = bounties.filter((b) => b.completed).length;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 transition-opacity duration-[250ms] ease-in-out"
        style={{
          backgroundColor: 'rgba(0,0,0,0.45)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className="fixed top-0 right-0 bottom-0 w-full flex flex-col z-50 transition-transform duration-300"
        style={{
          maxWidth: 420,
          backgroundColor: 'var(--card)',
          borderLeft: '1px solid var(--border)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.15)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5" style={{ color: 'var(--primary)' }} />
              <h2 className="text-xl font-bold m-0" style={{ color: 'var(--foreground)' }}>
                Bounties
              </h2>
            </div>
            <p className="text-[13px] mt-0.5 m-0 opacity-55" style={{ color: 'var(--foreground)' }}>
              {loading ? 'Loading...' : `${completed} of ${bounties.length} completed`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-lg cursor-pointer border-none shrink-0 transition-colors hover:opacity-80"
            style={{ width: 32, height: 32, color: 'var(--foreground)', background: 'var(--button)' }}
            aria-label="Close bounties"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Bounty list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
          {loading ? (
            <div className="flex items-center justify-center py-16 opacity-40" style={{ color: 'var(--foreground)' }}>
              Loading bounties...
            </div>
          ) : bounties.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 opacity-40" style={{ color: 'var(--foreground)' }}>
              '🎯'
              <p className="text-sm">No bounties available yet.</p>
            </div>
          ) : (
            bounties.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-4 px-4 py-3.5 rounded-xl"
                style={{
                  border: '1px solid var(--border)',
                  backgroundColor: b.completed
                    ? 'color-mix(in srgb, var(--primary) 8%, transparent)'
                    : 'transparent',
                }}
              >
                {/* Icon */}
                <div
                  className="flex items-center justify-center rounded-[10px] shrink-0"
                  style={{
                    width: 40,
                    height: 40,
                    backgroundColor: b.completed ? 'var(--primary)' : 'var(--button)',
                    color: b.completed ? 'white' : 'var(--foreground)',
                  }}
                >
                  {b.completed
                    ? <CheckCircle2 className="w-5 h-5" />
                    : '🎯'
                  }
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p
                    className="m-0 text-sm font-semibold"
                    style={{
                      color: 'var(--foreground)',
                      textDecoration: b.completed ? 'line-through' : 'none',
                      opacity: b.completed ? 0.5 : 1,
                    }}
                  >
                    {b.title}
                  </p>
                  <p className="m-0 mt-0.5 text-xs opacity-55" style={{ color: 'var(--foreground)' }}>
                    {b.description}
                  </p>
                </div>

                {/* Points badge */}
                <div
                  className="shrink-0 flex items-center gap-1 rounded-lg px-2.5 py-1 text-[13px] font-bold whitespace-nowrap"
                  style={{
                    backgroundColor: b.completed
                      ? 'color-mix(in srgb, var(--primary) 20%, transparent)'
                      : 'color-mix(in srgb, var(--primary) 12%, transparent)',
                    color: 'var(--primary)',
                  }}
                >
                  <Trophy className="w-3 h-3" />
                  +{b.points}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}