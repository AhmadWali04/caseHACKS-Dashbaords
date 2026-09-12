import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Users, 
  Search, 
  UserPlus, 
  Plus, 
  Loader2, 
  CheckCircle, 
  Pencil, 
  Save,
  Trophy,
  Crown,
  Sparkles,
  LogOut,
  Bell,
  Check,
  X
} from 'lucide-react';
import Loading from '../components/Loading';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../contexts/UserContext';
import GrainBackground from '../components/GrainBackground';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

export default function Teams() {
  const [teams, setTeams] = useState([]);
  const [leaderboardTeams, setLeaderboardTeams] = useState([]);
  const { dbUser: user, userLoading, refetchUser } = useUser();
  const [userTeam, setUserTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [joiningTeam, setJoiningTeam] = useState(null);
  const [leavingTeam, setLeavingTeam] = useState(false);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [respondingInvite, setRespondingInvite] = useState(null);
  const [sentRequests, setSentRequests] = useState(new Set());
  const { session } = useAuth();

  const [newTeam, setNewTeam] = useState({ 
    name: '', 
    looking_for: '', 
    has_space: true 
  });

  const [editTeam, setEditTeam] = useState({ 
    name: '', 
    looking_for: '', 
    has_space: true 
  });

  const location = useLocation();
  const userEmail = user?.email ?? '';

  // --- Fetch helpers wrapped in useCallback to stabilize references ---

  const fetchTeams = useCallback(async () => {
    try {
      const [teamsRes, leaderboardRes] = await Promise.all([
        fetch(`${API_URL}/api/teams/available`),
        fetch(`${API_URL}/api/teams/leaderboard`, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        })
      ]);
      const teamsData = await teamsRes.json();
      const leaderboardData = await leaderboardRes.json();
      setTeams(teamsData.teams || []);
      setLeaderboardTeams(leaderboardData.teams || []);
    } catch (err) {
      console.error("Error fetching teams:", err);
    }
  }, [session?.access_token]);

  const fetchPendingInvites = useCallback(async (teamId) => {
    try {
      const res = await fetch(`${API_URL}/api/team/${teamId}/invites`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPendingInvites(data.invites || []);
      }
    } catch (err) {
      console.error("Error fetching invites:", err);
    }
  }, [session?.access_token]);

  // Fetch user's team whenever team_id changes (including after polling sets it)
  useEffect(() => {
    if (!user?.team_id) {
      setUserTeam(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetch(`${API_URL}/api/team/${user.team_id}`)
      .then(r => r.json())
      .then(d => {
        if (!cancelled) {
          setUserTeam(d.team);
          setEditTeam({
            name: d.team?.name || '',
            looking_for: d.team?.looking_for || '',
            has_space: d.team?.has_space ?? true,
          });
        }
      })
      .catch(err => console.error('Error fetching team:', err))
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [user?.team_id]);

  // Fetch all teams once user is known, and re-fetch if token changes
  useEffect(() => {
    if (!user?.id) return;
    fetchTeams();
  }, [user?.id, fetchTeams]);

  // Fetch pending invites when team loads — only if user is the owner
  useEffect(() => {
    if (!userTeam?.id || !user?.id) return;
    const isOwner = userTeam.owner_id
      ? userTeam.owner_id === user.id
      : userTeam.users?.[0]?.email === userEmail;
    if (isOwner) fetchPendingInvites(userTeam.id);
  }, [userTeam?.id, user?.id, userEmail, fetchPendingInvites]);

  // Refetch when navigating back to this page — SPA routing never triggers
  // visibilitychange since the tab stays visible, so we watch the route instead
  useEffect(() => {
    if (!user?.id || userTeam) return;
    refetchUser();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll every 5s as a heartbeat while waiting to be accepted into a team
  useEffect(() => {
    if (!user?.id || userTeam) return;
    const interval = setInterval(refetchUser, 5000);
    return () => clearInterval(interval);
  }, [user?.id, userTeam, refetchUser]);

  // --- Handlers ---

  const handleUpdateTeam = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await fetch(`${API_URL}/api/team/${userTeam.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(editTeam),
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Team updated successfully!' });
        setEditMode(false);
        await Promise.all([refetchUser(), fetchTeams()]);
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Failed to update team' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
    }
    setSaving(false);
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setCreating(true);
    setMessage({ type: '', text: '' });
    const teamName = `${user?.name || 'My'}'s Team`;
    try {
      const response = await fetch(`${API_URL}/api/teams`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ ...newTeam, name: teamName, creator_email: userEmail }),
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Team created successfully!' });
        setNewTeam({ name: '', looking_for: '', has_space: true });
        setShowCreateForm(false);
        await Promise.all([refetchUser(), fetchTeams()]);
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Failed to create team' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
    }
    setCreating(false);
  };

  const handleLeaveTeam = async () => {
    if (!user?.id) return;
    const confirmed = window.confirm('Are you sure you want to leave your team?');
    if (!confirmed) return;

    setLeavingTeam(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await fetch(`${API_URL}/api/user/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ team_id: null })
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'You have left the team.' });
        setUserTeam(null);
        setPendingInvites([]);
        await Promise.all([refetchUser(), fetchTeams()]);
      } else {
        setMessage({ type: 'error', text: 'Failed to leave team.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Something went wrong.' });
    }
    setLeavingTeam(false);
  };

  const handleRequestJoin = async (teamId, teamName) => {
    if (!user?.id) return;
    setJoiningTeam(teamId);
    try {
      const response = await fetch(`${API_URL}/api/team/${teamId}/invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ user_id: user.id })
      });
      if (response.ok) {
        setSentRequests(prev => new Set([...prev, teamId]));
        setMessage({ type: 'success', text: `Join request sent to ${teamName}!` });
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Failed to send request.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Something went wrong.' });
    }
    setJoiningTeam(null);
  };

  const handleRespondToInvite = async (inviteId, userId, action) => {
    setRespondingInvite(inviteId);
    try {
      const response = await fetch(`${API_URL}/api/team/${userTeam.id}/invites/${inviteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ action })
      });
      if (response.ok) {
        setMessage({
          type: 'success',
          text: action === 'accept' ? 'Member added to team!' : 'Request declined.'
        });
        await Promise.all([refetchUser(), fetchTeams(), fetchPendingInvites(userTeam.id)]);
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Failed to respond.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Something went wrong.' });
    }
    setRespondingInvite(null);
  };

  // Joinable teams: open, not the user's own, matching search
  const joinableTeams = useMemo(() =>
    leaderboardTeams.filter(team => {
      const isOwnTeam = userTeam?.id === team.id;
      const hasSpace = team.has_space === true;
      const matchesSearch =
        team.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.looking_for?.toLowerCase().includes(searchQuery.toLowerCase());
      return !isOwnTeam && hasSpace && matchesSearch;
    }), [leaderboardTeams, userTeam, searchQuery]
  );

  // FIX: use owner_id if available, fall back to array position
  const isOwner = userTeam && (
    userTeam.owner_id
      ? userTeam.owner_id === user?.id
      : userTeam.users?.[0]?.email === userEmail
  );

  if (userLoading || loading) return <Loading />;

  return (
    <div className="space-y-6 relative z-10">
      <GrainBackground />
      {/* HEADER */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold" style={{ color: 'var(--foreground)' }}>
            {userTeam ? 'Your Team' : 'Find Your Team'}
          </h1>
          <p className="mt-2" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
            Create teams, recruit others, and climb the leaderboard.
          </p>
        </div>
 
        {!userTeam && (
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-white transition-all hover:scale-[1.02]"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            <Plus className="w-4 h-4" />
            {showCreateForm ? 'Cancel' : 'Create Team'}
          </button>
        )}
      </header>
 
      {/* YOUR TEAM */}
      {userTeam && (
        <div
          className="p-6 rounded-2xl border shadow-sm"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--primary)' }}
        >
          <div className="flex flex-col lg:flex-row justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5" style={{ color: 'var(--primary)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--primary)' }}>
                  YOUR TEAM
                </span>
              </div>
              <h2 className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>
                {userTeam.name}
              </h2>
              {userTeam.looking_for && (
                <p className="mt-2" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                  Looking for: {userTeam.looking_for}
                </p>
              )}
            </div>
 
            <div className="flex gap-3 items-start">
              <div className="px-5 py-4 rounded-xl" style={{ backgroundColor: 'var(--button)' }}>
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  <span className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
                    {userTeam.total_points ??
                      (userTeam.users || []).reduce((acc, m) =>
                        acc + (m.event_attendance_points || 0) + (m.user_interaction_points || 0), 0
                      )}
                  </span>
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                  Team Points
                </p>
              </div>
 
              <button
                onClick={() => setEditMode(!editMode)}
                className="h-fit p-3 rounded-xl"
                style={{ backgroundColor: 'var(--button)' }}
                title="Edit team"
              >
                <Pencil className="w-5 h-5" style={{ color: 'var(--foreground)' }} />
              </button>
 
              <button
                onClick={handleLeaveTeam}
                disabled={leavingTeam}
                className="h-fit p-3 rounded-xl transition-all hover:bg-red-100"
                style={{ backgroundColor: 'var(--button)' }}
                title="Leave team"
              >
                {leavingTeam
                  ? <Loader2 className="w-5 h-5 animate-spin text-red-500" />
                  : <LogOut className="w-5 h-5 text-red-500" />
                }
              </button>
            </div>
          </div>
 
          {/* EDIT MODE */}
          {editMode ? (
            <form onSubmit={handleUpdateTeam} className="space-y-4">
              <div
                className="w-full px-4 py-3 rounded-xl border flex items-center gap-2"
                style={{
                  backgroundColor: 'var(--background)',
                  borderColor: 'var(--border)',
                  opacity: 0.6,
                }}
              >
                <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                  Team name:
                </span>
                <span className="font-semibold" style={{ color: 'var(--foreground)' }}>
                  {userTeam.name}
                </span>
              </div>
              <input
                type="text"
                value={editTeam.looking_for}
                onChange={(e) => setEditTeam({ ...editTeam, looking_for: e.target.value })}
                placeholder="Looking for..."
                className="w-full px-4 py-3 rounded-xl border"
                style={{
                  backgroundColor: 'var(--background)',
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)'
                }}
              />
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editTeam.has_space}
                  onChange={(e) => setEditTeam({ ...editTeam, has_space: e.target.checked })}
                />
                <span className="text-sm" style={{ color: 'var(--foreground)' }}>
                  Open to new members
                </span>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white font-medium disabled:opacity-60"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                {saving
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</>
                  : <><Save className="w-4 h-4" />Save Changes</>
                }
              </button>
            </form>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userTeam.users?.map((member, index) => {
                  const total =
                    (member.event_attendance_points || 0) +
                    (member.user_interaction_points || 0);
                  return (
                    <div
                      key={member.id}
                      className="p-4 rounded-xl border"
                      style={{
                        backgroundColor: 'var(--background)',
                        borderColor: 'var(--border)'
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold" style={{ color: 'var(--foreground)' }}>
                              {member.name}
                              {member.email === userEmail && ' (You)'}
                            </h3>
                          </div>
                          <p className="text-sm mt-1" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                            {member.email}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>
                            {total}
                          </div>
                          <p className="text-xs" style={{ color: 'var(--foreground)', opacity: 0.5 }}>
                            points
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
 
              {isOwner && pendingInvites.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Bell className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                    <span className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
                      Pending Join Requests ({pendingInvites.length})
                    </span>
                  </div>
                  <div className="space-y-2">
                    {pendingInvites.map((invite) => (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between p-3 rounded-xl border"
                        style={{
                          backgroundColor: 'var(--background)',
                          borderColor: 'var(--border)'
                        }}
                      >
                        <div>
                          <p className="font-medium" style={{ color: 'var(--foreground)' }}>
                            {invite.user_name}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--foreground)', opacity: 0.5 }}>
                            {invite.user_email}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRespondToInvite(invite.id, invite.user_id, 'accept')}
                            disabled={respondingInvite === invite.id}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-green-500 hover:bg-green-600 disabled:opacity-60 transition-colors"
                          >
                            {respondingInvite === invite.id
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <Check className="w-3 h-3" />
                            }
                            Accept
                          </button>
                          <button
                            onClick={() => handleRespondToInvite(invite.id, invite.user_id, 'reject')}
                            disabled={respondingInvite === invite.id}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-60 transition-colors"
                          >
                            <X className="w-3 h-3" />
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
 
      {/* MESSAGE */}
      {message.text && (
        <div
          className={`p-4 rounded-xl border ${
            message.type === 'success'
              ? 'bg-green-100 border-green-200 text-green-700'
              : 'bg-red-100 border-red-200 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}
 
      {/* CREATE TEAM FORM */}
      {showCreateForm && !userTeam && (
        <div
          className="p-6 rounded-2xl border shadow-sm"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <h2 className="text-2xl font-bold mb-5" style={{ color: 'var(--foreground)' }}>
            Create Team
          </h2>
          <form onSubmit={handleCreateTeam} className="space-y-4">
            <div
              className="w-full px-4 py-3 rounded-xl border flex items-center gap-2"
              style={{
                backgroundColor: 'var(--background)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)',
                opacity: 0.6,
              }}
            >
              <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                Team name:
              </span>
              <span className="font-semibold" style={{ color: 'var(--foreground)' }}>
                {user?.name ? `${user.name}'s Team` : "My Team"}
              </span>
            </div>
            <input
              type="text"
              value={newTeam.looking_for}
              onChange={(e) => setNewTeam({ ...newTeam, looking_for: e.target.value })}
              placeholder="Looking for frontend devs, designers, etc."
              className="w-full px-4 py-3 rounded-xl border"
              style={{
                backgroundColor: 'var(--background)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)'
              }}
            />
            <button
              type="submit"
              disabled={creating}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white font-medium disabled:opacity-60"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              {creating
                ? <><Loader2 className="w-4 h-4 animate-spin" />Creating Team...</>
                : <><Plus className="w-4 h-4" />Create Team</>
              }
            </button>
          </form>
        </div>
      )}
 
      {/* SEARCH — only shown when user has no team */}
      {!userTeam && (
        <>
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
              style={{ color: 'var(--foreground)', opacity: 0.4 }}
            />
            <input
              type="text"
              placeholder="Search open teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl border"
              style={{
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)'
              }}
            />
          </div>
 
          {joinableTeams.length === 0 ? (
            <div
              className="text-center py-16 rounded-2xl border"
              style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
            >
              <Users className="w-14 h-14 mx-auto mb-4" style={{ color: 'var(--foreground)', opacity: 0.3 }} />
              <p style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                {searchQuery ? 'No open teams match your search' : 'No open teams right now'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {joinableTeams.map((team) => {
                const alreadySent = sentRequests.has(team.id);
                return (
                  <div
                    key={team.id}
                    className="p-6 rounded-2xl border transition-all hover:shadow-lg"
                    style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
                  >
                    <div className="mb-5">
                      <h2 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
                        {team.name}
                      </h2>
                      {team.looking_for && (
                        <p className="mt-2 text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                          Looking for: {team.looking_for}
                        </p>
                      )}
                      <p className="mt-1 text-xs" style={{ color: 'var(--foreground)', opacity: 0.5 }}>
                        {team.member_count ?? team.members?.length ?? 0} member
                        {(team.member_count ?? team.members?.length ?? 0) !== 1 ? 's' : ''}
                      </p>
                    </div>
 
                    {team.members && team.members.length > 0 && (
                      <div className="space-y-2 mb-5">
                        {team.members.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-3 p-3 rounded-xl"
                            style={{ backgroundColor: 'var(--background)' }}
                          >
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                              style={{ backgroundColor: 'var(--primary)' }}
                            >
                              {member.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <p className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>
                              {member.name}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
 
                    {alreadySent ? (
                      <div
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium"
                        style={{ backgroundColor: 'var(--button)', color: 'var(--foreground)', opacity: 0.7 }}
                      >
                        <Bell className="w-4 h-4" />
                        Request Sent
                      </div>
                    ) : (
                      <button
                        onClick={() => handleRequestJoin(team.id, team.name)}
                        disabled={joiningTeam === team.id}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-medium transition-all hover:opacity-90 disabled:opacity-50"
                        style={{ backgroundColor: 'var(--primary)' }}
                      >
                        {joiningTeam === team.id ? (
                          <><Loader2 className="w-4 h-4 animate-spin" />Sending...</>
                        ) : (
                          <><UserPlus className="w-4 h-4" />Request to Join</>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
 
      {/* INFO */}
      <div
        className="p-5 rounded-2xl"
        style={{ backgroundColor: 'var(--button)', color: 'var(--foreground)' }}
      >
        <p className="font-semibold mb-2">💡 Team Tips</p>
        <p style={{ opacity: 0.7 }}>
          Teams earn points through event attendance and hacker interactions.
          Collaborate, attend workshops, and network to climb the leaderboard.
        </p>
      </div>
    </div>
  );
}