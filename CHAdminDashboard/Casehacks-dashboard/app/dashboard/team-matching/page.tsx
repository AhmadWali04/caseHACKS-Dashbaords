'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { previewTeamMatching, applyProposedTeams, getAcceptedParticipants } from './actions';
import type { Participant } from './actions';

interface DragTeam {
  key: string;
  team_id: string | null;
  isLeftover: boolean;
  members: Participant[];
}

export default function TeamMatchingPage() {
  const [teams, setTeams] = useState<DragTeam[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  // No-show management
  const [allParticipants, setAllParticipants] = useState<{ id: string; name: string }[]>([]);
  const [noShows, setNoShows] = useState<{ id: string; name: string }[]>([]);
  const [noShowSearch, setNoShowSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const noShowRef = useRef<HTMLDivElement>(null);

  // Load participant list for the no-show selector
  useEffect(() => {
    getAcceptedParticipants().then(setAllParticipants);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (noShowRef.current && !noShowRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const noShowIds = useMemo(() => new Set(noShows.map(n => n.id)), [noShows]);

  const filteredParticipants = useMemo(() =>
    allParticipants.filter(p =>
      !noShowIds.has(p.id) &&
      p.name.toLowerCase().includes(noShowSearch.toLowerCase())
    ),
    [allParticipants, noShowIds, noShowSearch]
  );

  const addNoShow = (p: { id: string; name: string }) => {
    setNoShows(prev => [...prev, p]);
    setNoShowSearch('');
    setShowDropdown(false);
  };

  const removeNoShow = (id: string) => {
    setNoShows(prev => prev.filter(n => n.id !== id));
  };

  // drag state: which participant from which team is being dragged
  const [dragging, setDragging] = useState<{ teamKey: string; memberId: string } | null>(null);
  const [dragOverTeam, setDragOverTeam] = useState<string | null>(null);

  const handlePreview = async () => {
    setLoading(true);
    setApplied(false);
    setError(null);
    try {
      const data = await previewTeamMatching(noShows.map(n => n.id));
      if (!data.success) {
        setError(data.error ?? 'Algorithm error');
        setTeams([]);
        return;
      }
      if (data.stats.total_participants === 0) {
        setError('No accepted participants found. Make sure applicants have been approved before running matching.');
        setTeams([]);
        return;
      }
      // Flatten proposed_teams into DragTeam[] (unmatched is now always empty)
      setTeams(
        data.proposed_teams.map((t, i) => ({
          key: `team-${i}`,
          team_id: t.team_id,
          isLeftover: t.isLeftover ?? false,
          members: [...t.existing_members, ...t.new_members],
        }))
      );
    } catch (err) {
      console.error(err);
      setError('Unexpected error running algorithm.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!confirm('This will create teams and assign all participants. Continue?')) return;
    setApplying(true);
    try {
      const payload = teams.map(t => ({
        team_id: t.team_id,
        isLeftover: t.isLeftover,
        memberIds: t.members.map(m => m.id),
      }));
      const res = await applyProposedTeams(payload);
      if (res.success) {
        setApplied(true);
        toast.success('Teams applied successfully!');
      } else {
        toast.error('Error applying teams: ' + res.error);
      }
    } catch (err) {
      console.error(err);
      toast.error('Unexpected error applying teams.');
    } finally {
      setApplying(false);
    }
  };

  // ── Drag handlers ──────────────────────────────────────────────────────
  const onDragStart = (teamKey: string, memberId: string) => {
    setDragging({ teamKey, memberId });
  };

  const onDragOver = (e: React.DragEvent, teamKey: string) => {
    e.preventDefault();
    setDragOverTeam(teamKey);
  };

  const onDrop = (targetTeamKey: string) => {
    if (!dragging || dragging.teamKey === targetTeamKey) {
      setDragging(null);
      setDragOverTeam(null);
      return;
    }

    setTeams(prev => {
      const next = prev.map(t => ({ ...t, members: [...t.members] }));
      const src = next.find(t => t.key === dragging.teamKey)!;
      const dst = next.find(t => t.key === targetTeamKey)!;
      const memberIdx = src.members.findIndex(m => m.id === dragging.memberId);
      if (memberIdx === -1) return prev;
      const [member] = src.members.splice(memberIdx, 1);
      dst.members.push(member);
      return next;
    });

    setDragging(null);
    setDragOverTeam(null);
  };

  const onDragEnd = () => {
    setDragging(null);
    setDragOverTeam(null);
  };

  // ── Derived stats from live team state ───────────────────────────────
  const stats = useMemo(() => {
    const idealTeams = teams.filter(t => {
      if (t.members.length !== 4) return false;
      const males = t.members.filter(m => m.gender === 'male').length;
      const females = t.members.filter(m => m.gender === 'female').length;
      return males === 2 && females === 2;
    }).length;
    const totalParticipants = teams.reduce((s, t) => s + t.members.length, 0);
    return { totalParticipants, idealTeams };
  }, [teams]);

  const genderLabel = (g: string) => {
    if (g === 'male') return '♂';
    if (g === 'female') return '♀';
    return '◦';
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header>
          <p className="text-sm uppercase tracking-wide text-primary/70 font-semibold">Admin</p>
          <h1 className="text-4xl font-bold text-primary">Team Matching</h1>
          <p className="text-foreground/70 mt-2">
            Automatically form balanced teams of 4. The algorithm optimises for an equal
            gender split of <strong>2 male / 2 female</strong> per team.
            Drag participants between teams to adjust before applying.
          </p>
        </header>

        {/* No-show selector */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground/70">No-shows — exclude from matching:</p>
          <div ref={noShowRef} className="relative">
            <input
              type="text"
              placeholder="Search participants to mark as no-show…"
              value={noShowSearch}
              onChange={e => { setNoShowSearch(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              className="w-full sm:w-96 px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            />
            {showDropdown && filteredParticipants.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full sm:w-96 max-h-52 overflow-y-auto bg-card border border-border rounded-lg shadow-lg">
                {filteredParticipants.slice(0, 20).map(p => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => addNoShow(p)}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-background/60 text-foreground"
                    >
                      {p.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {noShows.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {noShows.map(n => (
                <span key={n.id} className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs rounded-full">
                  {n.name}
                  <button onClick={() => removeNoShow(n.id)} className="hover:text-amber-200 leading-none">×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-4 flex-wrap">
          <button
            onClick={handlePreview}
            disabled={loading}
            className="px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Running algorithm…' : teams.length > 0 ? `Rerun${noShows.length > 0 ? ` (excluding ${noShows.length} no-show${noShows.length !== 1 ? 's' : ''})` : ''}` : 'Preview Matching'}
          </button>

          {teams.length > 0 && !applied && (
            <button
              onClick={handleApply}
              disabled={applying}
              className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50"
            >
              {applying ? 'Applying…' : 'Apply Teams'}
            </button>
          )}

          {applied && (
            <span className="flex items-center gap-2 px-6 py-3 bg-green-600/20 text-green-400 rounded-lg font-semibold border border-green-600/30">
              ✓ Teams applied successfully
            </span>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            Error: {error}
          </div>
        )}

        {teams.length > 0 && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Total Participants', value: stats.totalParticipants },
                { label: 'Teams', value: teams.length },
                { label: 'Ideal Teams (2M/2F)', value: stats.idealTeams },
              ].map(s => (
                <div key={s.label} className="p-4 bg-card rounded-lg border border-border text-center">
                  <p className="text-sm text-foreground/60">{s.label}</p>
                  <p className="text-2xl font-bold text-primary mt-1">{s.value}</p>
                </div>
              ))}
            </div>

            <p className="text-xs text-foreground/40">
              Drag a participant row onto another team card to move them.
            </p>

            {/* Team cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {teams.map(team => {
                const males = team.members.filter(m => m.gender === 'male').length;
                const females = team.members.filter(m => m.gender === 'female').length;
                const ideal = team.members.length === 4 && males === 2 && females === 2;
                const isOver = dragOverTeam === team.key;

                return (
                  <div
                    key={team.key}
                    onDragOver={e => onDragOver(e, team.key)}
                    onDrop={() => onDrop(team.key)}
                    className={`p-4 rounded-lg border transition-colors ${
                      isOver
                        ? 'border-primary/60 bg-primary/5'
                        : ideal
                        ? 'border-green-500/40 bg-green-500/5'
                        : team.isLeftover
                        ? 'border-amber-500/40 bg-amber-500/5'
                        : 'border-border bg-card'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-foreground text-sm">
                        {team.isLeftover
                          ? '⚠ Leftover Group'
                          : team.team_id
                          ? 'Existing Team'
                          : `New Team`}
                        <span className="text-foreground/40 font-normal ml-1">
                          ({team.members.length} member{team.members.length !== 1 ? 's' : ''})
                        </span>
                      </h3>
                      <div className="flex gap-1">
                        {ideal && (
                          <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
                            ✓ Ideal
                          </span>
                        )}
                        <span className="text-xs px-2 py-0.5 bg-card border border-border rounded-full text-foreground/50">
                          ♂{males} ♀{females}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 min-h-[2rem]">
                      {team.members.map(m => {
                        const isDraggingThis = dragging?.memberId === m.id;
                        return (
                          <div
                            key={m.id}
                            draggable
                            onDragStart={() => onDragStart(team.key, m.id)}
                            onDragEnd={onDragEnd}
                            className={`flex items-center gap-2 text-sm px-2 py-1 rounded cursor-grab active:cursor-grabbing select-none transition-opacity ${
                              isDraggingThis
                                ? 'opacity-30'
                                : 'hover:bg-background/60 text-foreground'
                            }`}
                          >
                            <span className="text-foreground/40 text-xs">⠿</span>
                            <span>{genderLabel(m.gender)}</span>
                            <span className="font-medium truncate">{m.name}</span>
                          </div>
                        );
                      })}
                      {team.members.length === 0 && (
                        <p className="text-xs text-foreground/30 italic px-2 py-1">Empty — drop a participant here</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
