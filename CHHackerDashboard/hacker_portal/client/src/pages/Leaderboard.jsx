import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../contexts/UserContext';
import Loading from '../components/Loading';
import BountiesDrawer from '../components/BountiesDrawer';
import GrainBackground from '../components/GrainBackground';

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

const TABS = [
  { key: 'total', label: 'Total' },
  { key: 'event', label: 'Event' },
  { key: 'social', label: 'Social' },
  { key: 'team', label: 'Team' }
];

const MEDALS = ['🥇', '🥈', '🥉'];
const PAGE_SIZE = 50;

export default function Leaderboard() {
  const { session } = useAuth();
  const { dbUser: user, userLoading } = useUser();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('total');
  const userId = user?.id ?? null;
  const [bountiesOpen, setBountiesOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [teamsLeaderboard, setTeamsLeaderboard] = useState([]);
  

  //const userEmail = session?.user?.email || "test.hacker@casehacks.ca";

  useEffect(() => {
    if (!session) return;

    const fetchAll = async () => {
      try {
        const [leaderboardRes, teamsRes] = await Promise.all([
          fetch(`/api/leaderboard`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }),
          fetch(`/api/teams/leaderboard`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }),
        ]);

        const [leaderboardData, teamsData] = await Promise.all([
          leaderboardRes.json(),
          teamsRes.json()
        ]);

        setUsers(leaderboardData.users || []);
        setTeamsLeaderboard(teamsData.teams || []);
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [session]);

  // helper
  const changePage = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getVal = (u) => {
    if (tab === 'total') return (u.event_attendance_points || 0) + (u.user_interaction_points || 0);
    if (tab === 'event') return u.event_attendance_points || 0;
    if (tab === 'social') return u.user_interaction_points  || 0;

    return 0; // team points are handled separately
  };

  // Sort users based on selected tab
  const sorted = useMemo(() =>
    tab !== 'team' ? [...users].sort((a, b) => getVal(b) - getVal(a)) : [], [users, tab]
    );

  const max = useMemo(() =>
    sorted.length > 0 ? getVal(sorted[0]) : 1, [sorted, tab]
    );

  const currentUserRank = useMemo(() =>
    sorted.findIndex(u => u.id === userId), [sorted, userId]
    );

  const totalPages = useMemo(() =>
    Math.ceil(sorted.length / PAGE_SIZE), [sorted]
    );

  const paginated = useMemo(() =>
    sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [sorted, page]
    );
 
  // Team tab
  const activeTeams = teamsLeaderboard.filter(t => t.member_count > 0);
  const teamMax = activeTeams.length > 0 ? activeTeams[0].total_points : 1;
  const userTeamId = activeTeams.find(t => t.members.some(m => m.id === userId))?.id ?? null;
  const userTeamRank = activeTeams.findIndex(t => t.id === userTeamId);
  
  const getTeamVal = (team) => {
    if (tab === 'team') return team.total_points;
    return team.total_points;
  };


  if (userLoading || loading) return <Loading />;

  return (
    <>
      <BountiesDrawer open={bountiesOpen} onClose={() => setBountiesOpen(false)} />
 
      <div className="space-y-6 relative z-10">
        <GrainBackground />
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold" style={{ color: 'var(--foreground)' }}>
              Leaderboard
            </h1>
            <p className="mt-1 opacity-60" style={{ color: 'var(--foreground)' }}>
              See how you stack up against other participants.
            </p>
          </div>
 
          <button
            onClick={() => setBountiesOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap shrink-0 mt-1.5 transition-colors"
            style={{
              border: '1px solid var(--border)',
              backgroundColor: 'var(--card)',
              color: 'var(--foreground)',
            }}
          >
            <span>🎯</span>
            <span>Bounties</span>
          </button>
        </header>
 
        <div
          className="p-6 rounded-xl shadow-sm"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        >
          {/* Tab switcher */}
          <div className="flex justify-between gap-2 flex-wrap mb-3">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); changePage(0); }}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer border-none"
                style={{
                  backgroundColor: tab === t.key ? 'var(--primary)' : 'var(--button)',
                  color: tab === t.key ? 'white' : 'var(--foreground)',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
 
          {/* ── TEAM TAB ── */}
          {tab === 'team' ? (
            <>
              {/* "Your team" rank pill */}
              {userTeamRank !== -1 && (
                <div className="flex justify-end mb-4">
                  <div
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium"
                    style={{ backgroundColor: 'var(--primary)', color: 'white' }}
                  >
                    <span>Your team</span>
                    <span
                      className="flex items-center justify-center rounded-full text-xs font-bold"
                      style={{ backgroundColor: 'rgba(255,255,255,0.25)', width: 42, height: 22 }}
                    >
                      {`#${userTeamRank + 1}`}
                    </span>
                  </div>
                </div>
              )}
 
              <div>
                {activeTeams.map((team, i) => {
                  const val = team.total_points;
                  const pct = Math.round((val / (teamMax || 1)) * 100);
                  const isUserTeam = team.id === userTeamId;
 
                  return (
                    <div
                      key={team.id}
                      className="flex items-center gap-4 py-4 px-3 -mx-3 rounded-lg transition-colors"
                      style={{
                        borderBottom: '1px solid var(--border)',
                        backgroundColor: isUserTeam
                          ? 'color-mix(in srgb, var(--primary) 10%, transparent)'
                          : 'transparent',
                      }}
                    >
                      {/* Rank */}
                      <span className="text-xl text-center" style={{ minWidth: 28 }}>
                        {i < 3
                          ? MEDALS[i]
                          : <span className="text-sm opacity-50" style={{ color: 'var(--foreground)' }}>{i + 1}</span>}
                      </span>
 
                      {/* Avatar */}
                      <div
                        className="flex items-center justify-center rounded-full text-sm font-medium shrink-0"
                        style={{
                          width: 36,
                          height: 36,
                          backgroundColor: isUserTeam ? 'var(--primary)' : 'var(--button)',
                          color: isUserTeam ? 'white' : 'var(--foreground)',
                        }}
                      >
                        {(team.name || '?').slice(0, 2).toUpperCase()}
                      </div>
 
                      {/* Name + member count + bar */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                          {team.name}
                          {isUserTeam && (
                            <span
                              className="ml-2 text-xs px-1.5 py-0.5 rounded-full font-semibold align-middle"
                              style={{ backgroundColor: 'var(--primary)', color: 'white' }}
                            >
                              You
                            </span>
                          )}
                        </p>
                        <p className="text-xs opacity-40 mb-1" style={{ color: 'var(--foreground)' }}>
                          {team.member_count} member{team.member_count !== 1 ? 's' : ''}
                        </p>
                        <div
                          className="rounded-full overflow-hidden"
                          style={{ height: 5, backgroundColor: 'var(--border)' }}
                        >
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: 'var(--primary)' }}
                          />
                        </div>
                      </div>
 
                      {/* Points breakdown */}
                      <div className="text-right shrink-0">
                        <p className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>{val}</p>
                        <p className="text-xs opacity-50" style={{ color: 'var(--foreground)' }}>pts</p>
                      </div>
                    </div>
                  );
                })}
 
                {activeTeams.length === 0 && (
                  <p className="text-sm text-center py-8 opacity-50" style={{ color: 'var(--foreground)' }}>
                    No teams yet.
                  </p>
                )}
              </div>
            </>
          ) : (
            /* ── INDIVIDUAL TABS (total / event / social) ── */
            <>
              {/* Page picker + your place row */}
              {(totalPages > 1 || currentUserRank !== -1) && (
                <div className="flex items-center justify-between gap-2 mb-6 flex-wrap">
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => changePage(Math.max(0, page - 1))}
                        disabled={page === 0}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border-none"
                        style={{
                          backgroundColor: 'var(--button)',
                          color: 'var(--foreground)',
                          opacity: page === 0 ? 0.4 : 1,
                          cursor: page === 0 ? 'not-allowed' : 'pointer',
                        }}
                      >
                        ←
                      </button>
                      <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                        {page + 1} / {totalPages}
                      </span>
                      <button
                        onClick={() => changePage(Math.min(totalPages - 1, page + 1))}
                        disabled={page === totalPages - 1}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border-none"
                        style={{
                          backgroundColor: 'var(--button)',
                          color: 'var(--foreground)',
                          opacity: page === totalPages - 1 ? 0.4 : 1,
                          cursor: page === totalPages - 1 ? 'not-allowed' : 'pointer',
                        }}
                      >
                        →
                      </button>
                    </div>
                  )}
 
                  {currentUserRank !== -1 && (
                    <div
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ml-auto"
                      style={{ backgroundColor: 'var(--primary)', color: 'white' }}
                    >
                      <span>Your place</span>
                      <span
                        className="flex items-center justify-center rounded-full text-xs font-bold"
                        style={{ backgroundColor: 'rgba(255,255,255,0.25)', width: 42, height: 22 }}
                      >
                        {`#${currentUserRank + 1}`}
                      </span>
                    </div>
                  )}
                </div>
              )}
 
              {/* Rows */}
              <div>
                {paginated.map((u, i) => {
                  const globalIndex = page * PAGE_SIZE + i;
                  const val = getVal(u);
                  const pct = Math.round((val / max) * 100);
                  const isCurrentUser = u.id === userId;
 
                  return (
                    <div
                      key={u.id}
                      className="flex items-center gap-4 py-4 px-3 -mx-3 rounded-lg transition-colors"
                      style={{
                        borderBottom: '1px solid var(--border)',
                        backgroundColor: isCurrentUser
                          ? 'color-mix(in srgb, var(--primary) 10%, transparent)'
                          : 'transparent',
                      }}
                    >
                      <span className="text-xl text-center" style={{ minWidth: 28 }}>
                        {globalIndex < 3
                          ? MEDALS[globalIndex]
                          : <span className="text-sm opacity-50" style={{ color: 'var(--foreground)' }}>{globalIndex + 1}</span>}
                      </span>
 
                      <div
                        className="flex items-center justify-center rounded-full text-sm font-medium shrink-0"
                        style={{
                          width: 36,
                          height: 36,
                          backgroundColor: isCurrentUser ? 'var(--primary)' : 'var(--button)',
                          color: isCurrentUser ? 'white' : 'var(--foreground)',
                        }}
                      >
                        {(u.name || u.email || '?').slice(0, 2).toUpperCase()}
                      </div>
 
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                          {u.name || u.email}
                          {isCurrentUser && (
                            <span
                              className="ml-2 text-xs px-1.5 py-0.5 rounded-full font-semibold align-middle"
                              style={{ backgroundColor: 'var(--primary)', color: 'white' }}
                            >
                              You
                            </span>
                          )}
                        </p>
                        <div
                          className="mt-1 rounded-full overflow-hidden"
                          style={{ height: 5, backgroundColor: 'var(--border)' }}
                        >
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: 'var(--primary)' }}
                          />
                        </div>
                      </div>
 
                      <div className="text-right shrink-0">
                        <p className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>{val}</p>
                        <p className="text-xs opacity-50" style={{ color: 'var(--foreground)' }}>pts</p>
                      </div>
                    </div>
                  );
                })}
 
                {sorted.length === 0 && (
                  <p className="text-sm text-center py-8 opacity-50" style={{ color: 'var(--foreground)' }}>
                    No participants yet.
                  </p>
                )}
              </div>
 
              {/* Bottom pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button
                    onClick={() => changePage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border-none"
                    style={{
                      backgroundColor: 'var(--button)',
                      color: 'var(--foreground)',
                      opacity: page === 0 ? 0.4 : 1,
                      cursor: page === 0 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    ← Prev
                  </button>
                  <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => changePage(Math.min(totalPages - 1, page + 1))}
                    disabled={page === totalPages - 1}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border-none"
                    style={{
                      backgroundColor: 'var(--button)',
                      color: 'var(--foreground)',
                      opacity: page === totalPages - 1 ? 0.4 : 1,
                      cursor: page === totalPages - 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
