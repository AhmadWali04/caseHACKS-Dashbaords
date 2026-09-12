'use server';

import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GenderCategory = 'male' | 'female' | 'other';

export interface Participant {
  id: string;
  name: string;
  gender: GenderCategory;
  team_id: string | null;
}

interface PartialTeam {
  team_id: string;
  members: Participant[];
}

interface ProposedTeam {
  team_id: string | null;          // null = brand-new team
  existing_members: Participant[];  // already on the team
  new_members: Participant[];       // assigned by the algorithm
  isLeftover?: boolean;            // incomplete group that couldn't form a full team
}

export interface MatchingResult {
  success: boolean;
  error?: string;
  proposed_teams: ProposedTeam[];
  unmatched: Participant[];
  stats: {
    total_participants: number;
    partial_teams_filled: number;
    new_teams_formed: number;
    unmatched_count: number;
    ideal_teams: number;         // teams that perfectly hit 2M/2F + 2Biz/2CS
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function classifyGender(raw: string): GenderCategory {
  const g = raw.toLowerCase().trim();
  if (['male', 'm', 'man', 'he/him'].includes(g)) return 'male';
  if (['female', 'f', 'woman', 'she/her'].includes(g)) return 'female';
  return 'other';
}

/**
 * Score how well a candidate fills a gender gap in a team.
 * Higher = better fit. Max score = 1 (fills a gender need).
 */
function fitScore(team: Participant[], candidate: Participant): number {
  const males   = team.filter(p => p.gender === 'male').length;
  const females = team.filter(p => p.gender === 'female').length;

  if (candidate.gender === 'male'   && males < 2)   return 1;
  if (candidate.gender === 'female' && females < 2)  return 1;
  return 0;
}

/**
 * Pick the best candidate from a pool for a given partial team.
 * Returns the index into `pool`.
 */
function pickBest(team: Participant[], pool: Participant[]): number {
  let bestIdx = 0;
  let bestScore = -1;

  for (let i = 0; i < pool.length; i++) {
    const s = fitScore(team, pool[i]);
    if (s > bestScore) {
      bestScore = s;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function isIdealTeam(members: Participant[]): boolean {
  const males   = members.filter(p => p.gender === 'male').length;
  const females = members.filter(p => p.gender === 'female').length;
  return males === 2 && females === 2;
}

// ---------------------------------------------------------------------------
// Main algorithm
// ---------------------------------------------------------------------------

function buildTeams(
  partialTeams: PartialTeam[],
  singles: Participant[],
): { proposed: ProposedTeam[]; unmatched: Participant[] } {
  const pool = [...singles]; // mutable copy
  const proposed: ProposedTeam[] = [];

  // ── Phase 1: Fill partial teams (size 2 or 3 → 4) ─────────────────────
  // Sort by most constrained first (team of 3 before team of 2)
  const sortedPartials = [...partialTeams].sort(
    (a, b) => b.members.length - a.members.length,
  );

  for (const pt of sortedPartials) {
    const needed = 4 - pt.members.length;
    if (needed <= 0 || pool.length === 0) {
      // Already full or no one left
      if (needed <= 0) continue;
      proposed.push({
        team_id: pt.team_id,
        existing_members: pt.members,
        new_members: [],
      });
      continue;
    }

    const newMembers: Participant[] = [];
    const workingTeam = [...pt.members];

    for (let i = 0; i < needed && pool.length > 0; i++) {
      const bestIdx = pickBest(workingTeam, pool);
      const pick = pool.splice(bestIdx, 1)[0];
      newMembers.push(pick);
      workingTeam.push(pick);
    }

    proposed.push({
      team_id: pt.team_id,
      existing_members: pt.members,
      new_members: newMembers,
    });
  }

  // ── Phase 2: Form new teams of 4 from remaining singles ───────────────
  // Bucket by gender only
  const buckets: Record<string, Participant[]> = { male: [], female: [], other: [] };

  for (const p of pool) {
    if (p.gender === 'male') buckets.male.push(p);
    else if (p.gender === 'female') buckets.female.push(p);
    else buckets.other.push(p);
  }

  // Greedily form gender-balanced teams: 2M + 2F
  while (buckets.male.length >= 2 && buckets.female.length >= 2) {
    proposed.push({
      team_id: null,
      existing_members: [],
      new_members: [
        buckets.male.pop()!,
        buckets.male.pop()!,
        buckets.female.pop()!,
        buckets.female.pop()!,
      ],
    });
  }

  // Remaining participants that didn't fit a perfect gender pair
  const remaining = [...buckets.male, ...buckets.female, ...buckets.other];

  // Form best-effort teams of 4 from leftovers using greedy scoring
  while (remaining.length >= 4) {
    const team: Participant[] = [remaining.shift()!];
    for (let i = 0; i < 3; i++) {
      const bestIdx = pickBest(team, remaining);
      team.push(remaining.splice(bestIdx, 1)[0]);
    }
    proposed.push({
      team_id: null,
      existing_members: [],
      new_members: team,
    });
  }

  // Any remaining (1-3 people) go into a leftover team so they still get assigned
  if (remaining.length > 0) {
    proposed.push({
      team_id: null,
      existing_members: [],
      new_members: remaining,
      isLeftover: true,
    });
  }
  return { proposed, unmatched: [] };
}

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

/**
 * Preview the algorithm's output without writing anything to the database.
 * @param excludeIds - user IDs to treat as no-shows and exclude from matching
 */
export async function previewTeamMatching(excludeIds: string[] = []): Promise<MatchingResult> {
  const supabase = getSupabase();

  // 1. Fetch all accepted hackers
  const { data: hackers, error } = await supabase
    .from('users')
    .select('id, name, gender, team_id')
    .eq('status', 'accepted');

  if (error) {
    return {
      success: false,
      error: error.message,
      proposed_teams: [],
      unmatched: [],
      stats: { total_participants: 0, partial_teams_filled: 0, new_teams_formed: 0, unmatched_count: 0, ideal_teams: 0 },
    };
  }

  const excludeSet = new Set(excludeIds);

  // 2. Classify raw field values
  const participants: Participant[] = (hackers ?? [])
    .filter(h => !excludeSet.has(h.id))
    .map(h => ({
      id: h.id,
      name: h.name ?? 'Unknown',
      gender: classifyGender(h.gender ?? ''),
      team_id: h.team_id,
    }));

  // 3. Separate into partial teams and singles
  const teamMap = new Map<string, Participant[]>();
  const singles: Participant[] = [];

  for (const p of participants) {
    if (p.team_id) {
      if (!teamMap.has(p.team_id)) teamMap.set(p.team_id, []);
      teamMap.get(p.team_id)!.push(p);
    } else {
      singles.push(p);
    }
  }

  // Only include partial teams (size < 4) that have space
  const partialTeams: PartialTeam[] = [];
  for (const [team_id, members] of teamMap.entries()) {
    if (members.length < 4) {
      partialTeams.push({ team_id, members });
    }
  }

  // 4. Run the algorithm
  const { proposed, unmatched } = buildTeams(partialTeams, singles);

  // 5. Compute stats
  const ideal_teams = proposed.filter(t => {
    const all = [...t.existing_members, ...t.new_members];
    return all.length === 4 && isIdealTeam(all);
  }).length;

  return {
    success: true,
    proposed_teams: proposed,
    unmatched,
    stats: {
      total_participants: participants.length,
      partial_teams_filled: proposed.filter(t => t.team_id !== null && t.new_members.length > 0).length,
      new_teams_formed: proposed.filter(t => t.team_id === null).length,
      unmatched_count: unmatched.length,
      ideal_teams,
    },
  };
}

/**
 * Apply the manually-arranged teams from the UI (respects drag-and-drop changes).
 * Takes the current client state so re-running the algorithm is not needed.
 */
export async function applyProposedTeams(
  teams: Array<{ team_id: string | null; isLeftover: boolean; memberIds: string[] }>
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();

  // Fetch names in one round-trip for auto-naming new teams
  const allIds = teams.flatMap(t => t.memberIds);
  const { data: users } = await supabase
    .from('users')
    .select('id, name')
    .in('id', allIds);
  const nameMap = Object.fromEntries((users ?? []).map(u => [u.id, u.name ?? u.id]));

  for (const team of teams) {
    if (team.memberIds.length === 0) continue;

    let teamId = team.team_id;

    if (!teamId) {
      const teamName = team.isLeftover
        ? 'Leftover Team'
        : `Auto-Team: ${team.memberIds.map(id => nameMap[id]).join(', ')}`.slice(0, 100);

      const { data: newTeam, error: createErr } = await supabase
        .from('teams')
        .insert({ name: teamName, has_space: team.memberIds.length < 4 })
        .select('id')
        .single();

      if (createErr || !newTeam) {
        return { success: false, error: `Failed to create team: ${createErr?.message}` };
      }
      teamId = newTeam.id;
    } else {
      await supabase
        .from('teams')
        .update({ has_space: team.memberIds.length < 4 })
        .eq('id', teamId);
    }

    for (const memberId of team.memberIds) {
      await supabase
        .from('users')
        .update({ team_id: teamId })
        .eq('id', memberId);
    }
  }

  return { success: true };
}

/**
 * Fetch all accepted participants for the no-show selector UI.
 */
export async function getAcceptedParticipants(): Promise<{ id: string; name: string }[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('users')
    .select('id, name')
    .eq('status', 'accepted')
    .order('name', { ascending: true });
  if (error) return [];
  return (data ?? []).map(u => ({ id: u.id, name: u.name ?? u.id }));
}
