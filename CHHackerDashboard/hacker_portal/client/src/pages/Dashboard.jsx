import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, ExternalLink, Bell, Users, CheckCircle, Trophy, Maximize2  } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../contexts/AuthContext';
import Loading from '../components/Loading'; 
import GrainBackground from '../components/GrainBackground';
import { useUser } from '../contexts/UserContext';



const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export default function Dashboard() {
  const { dbUser: user, userLoading, refetchUser } = useUser();
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  //const [user, setUser] = useState(null);
  const [team, setTeam] = useState(null);
  const [checkins, setCheckins] = useState([]);
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [qrFullscreen, setQrFullscreen] = useState(false);
  const { session } = useAuth();
  const [rsvp, setRsvp] = useState(null); // null = not yet loaded from user
  const [rsvpLoading, setRsvpLoading] = useState(false);
  
  // For now, using test user email - replace with auth context
  //const userEmail = session?.user?.email || "test.hacker@casehacks.ca";

  const deadline = new Date("2026-05-24T17:00:00-04:00").getTime();

  const updateCountdown = () => {
    const now = Date.now();
    const diff = deadline - now;

    if (diff <= 0) {
      setCountdown({ hours: 0, minutes: 0, seconds: 0 });
      return;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    setCountdown({ hours, minutes, seconds });
  };

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const authHeaders = { Authorization: `Bearer ${session.access_token}` };

        // One call for announcements + events + checkins (was 3 separate calls)
        const dashRes = await fetch(`${API_URL}/api/dashboard/${user.id}`, { headers: authHeaders });
        const dashData = await dashRes.json();

        setAnnouncements(dashData.announcements || []);
        setEvents(dashData.events || []);
        setCheckins(dashData.checkins || []);

        // Team is user-specific and only needed when they're on one
        if (user.team_id) {
          const teamRes = await fetch(`${API_URL}/api/team/${user.team_id}`, { headers: authHeaders });
          const teamData = await teamRes.json();
          if (teamData.team) setTeam(teamData.team);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);

    return () => clearInterval(timer);
  }, [user]);

  const formatCountdown = (targetDateTime) => {
    const pad = (n) => n.toString().padStart(2, '0');

    const target = new Date(targetDateTime).getTime();
    const now = Date.now();

    let diff = Math.max(0, target - now);

    const hours = Math.floor(diff / (1000 * 60 * 60));
    diff %= 1000 * 60 * 60;

    const minutes = Math.floor(diff / (1000 * 60));
    diff %= 1000 * 60;

    const seconds = Math.floor(diff / 1000);

    return `${pad(countdown.hours)}:${pad(countdown.minutes)}:${pad(countdown.seconds)}`;
  };

  // Get application status styling (kept for the header badge)
  const getStatusStyle = (status) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'waitlisted':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'accepted':
        return '✓ Accepted';
      case 'rejected':
        return '✗ Not Accepted';
      case 'waitlisted':
        return '⏳ Waitlisted';
      default:
        return '⏳ Pending';
    }
  };

  // get rsvp state
  useEffect(() => {
    if (user) setRsvp(user.checked_rsvp ?? false);
  }, [user?.id]);

  const handleRsvp = async () => {
    const next = !rsvp;
    if (!next) {
      // Confirm before un-RSVPing
      const confirmed = window.confirm(
        "Are you sure you want to cancel your RSVP? Your spot may not be guaranteed if you re-RSVP later."
      );
      if (!confirmed) return;
    }
    setRsvpLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/user/${user.id}/rsvp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ checked_rsvp: next }),
      });
      if (res.ok) {
        setRsvp(next);
      } else {
        console.error('RSVP update failed');
      }
    } catch (err) {
      console.error('RSVP error:', err);
    } finally {
      setRsvpLoading(false);
    }
  };

  if (userLoading || loading) return <Loading />;
  return (
    <div className="space-y-6 relative z-10">
      <GrainBackground />
 
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold" style={{ color: 'var(--foreground)' }}>
            Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! 👋
          </h1>
          <p className="mt-1" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
            Here's what's happening at [case]Hacks.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium"
            style={{ backgroundColor: 'var(--button)', color: 'var(--foreground)' }}
          >
            <Trophy className="w-4 h-4" style={{ color: '#f59e0b' }} />
            <span>{(user?.event_attendance_points ?? 0) + (user?.user_interaction_points ?? 0)} pts</span>
          </div>
          {user?.status === 'accepted' ? (
            <button
              onClick={handleRsvp}
              disabled={rsvpLoading}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors disabled:opacity-60 ${
                rsvp
                  ? 'bg-green-100 text-green-700 border-green-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                  : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-green-50 hover:text-green-700 hover:border-green-200'
              }`}
            >
              {rsvpLoading ? '...' : rsvp ? '✓ RSVP\'d — Click to Cancel' : '+ RSVP to Attend'}
            </button>
          ) : (
            <div className={`px-4 py-2 rounded-full text-sm font-medium border ${getStatusStyle(user?.status)}`}>
              {getStatusText(user?.status)}
            </div>
          )}
        </div>
      </header>

      {/* Announcements Banner */}
      {announcements.length > 0 && (
        <div 
          className="rounded-xl p-4 flex items-start space-x-3 border"
          style={{ backgroundColor: 'var(--primary)', borderColor: 'var(--primary)' }}
        >
          <Bell className="w-5 h-5 text-white mt-0.5 shrink-0" />
          <div>
            <p className="text-white font-medium">{announcements[0]?.message}</p>
            <p className="text-white/70 text-sm mt-1">
              {announcements[0]?.users?.name || "Organizer"} • {new Date(announcements[0]?.created_at).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Countdown & QR Code Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Countdown Card */}
        <div 
          className="md:col-span-2 p-6 rounded-xl shadow-sm border"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center space-x-2 mb-3" style={{ color: 'var(--primary)' }}>
            <Clock className="w-5 h-5" />
            <span className="uppercase tracking-wider text-xs font-bold">Competition Countdown</span>
          </div>
          <div 
            className="text-5xl font-mono font-bold tracking-tight"
            style={{ color: 'var(--foreground)' }}
          >
            {formatCountdown("2026-5-24T11:00:00")}
          </div>
          <p className="mt-2 text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
            Until submission deadline
          </p>
          
          <div className="mt-6 flex flex-wrap gap-3">
            <Link 
              to="/schedule" 
              className="text-sm font-medium px-4 py-2 rounded-lg transition-colors text-white hover:opacity-80 transition-opacity"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              View Full Schedule
            </Link>
            <a 
              href="https://casehacks-2026.devpost.com/" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium px-4 py-2 rounded-lg border flex items-center transition-colors hover:bg-[var(--button)]/50"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
            >
              Submission Portal <ExternalLink className="w-4 h-4 ml-1" />
            </a>
          </div>
        </div>

        {/* QR Code Card */}
        <div 
          className="p-6 rounded-xl shadow-sm border flex flex-col items-center justify-center text-center"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <div
            className="p-4 rounded-lg mb-1 bg-white cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setQrFullscreen(true)}
          >
            {user?.id ? (
              <QRCodeSVG 
                value={user.id} 
                size={96}
                level="M"
                fgColor="#8571b6"
              />
            ) : (
              <div className="w-24 h-24 flex items-center justify-center text-sm" style={{ color: 'var(--foreground)', opacity: 0.5 }}>
                Loading...
              </div>
            )}
          </div>
          <h3 className="font-semibold text-lg" style={{ color: 'var(--foreground)' }}>
            {user?.name || "Check-in Pass"}
          </h3>
          <div className="flex items-center justify-center gap-2 mt-1">
          <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
            Scan at events & workshops
          </p>
          <button
            onClick={() => setQrFullscreen(true)}
            className="p-2 rounded-lg transition-colors hover:bg-[var(--button)]"
            style={{ color: 'var(--primary)' }}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
        </div>
      </div>

      {/* Upcoming Events */}
      <div 
        className="p-6 rounded-xl shadow-sm"
        style={{ 
          backgroundColor: 'var(--card)', 
          border: '1px solid var(--border)'
        }}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
            Upcoming Events
          </h3>
          <Link 
            to="/schedule" 
            className="text-sm font-medium"
            style={{ color: 'var(--primary)' }}
          >
            View All →
          </Link>
        </div>
        
        {events.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
            No upcoming events
          </p>
        ) : (
          <div className="space-y-3">
            {events.filter(event => new Date(event.ends_at) >= new Date()).slice(0, 5).map((event) => {
              const startTime = new Date(event.starts_at);
              const endTime = new Date(event.ends_at);
              const now = new Date();
              const isInProgress = now >= startTime && now <= endTime;
              const isUpcoming = now < startTime;
              
              return (
                <div 
                  key={event.id}
                  className="flex items-center justify-between py-3"
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <div className="flex items-center space-x-4">
                    <div 
                      className="w-12 text-center"
                      style={{ color: 'var(--primary)' }}
                    >
                      <div className="text-sm font-bold">
                        {startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                      </div>
                    </div>
                    <div>
                      <p className="font-medium" style={{ color: 'var(--foreground)' }}>
                        {event.title}
                      </p>
                      <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                        {event.location || 'TBA'}
                      </p>
                    </div>
                  </div>
                  {isInProgress && (
                    <span 
                      className="text-xs px-2 py-1 rounded-full font-medium bg-green-100 text-green-700"
                    >
                      Now
                    </span>
                  )}
                  {isUpcoming && (
                    <span 
                      className="text-xs px-2 py-1 rounded-full font-medium bg-blue-100 text-blue-700"
                    >
                      Upcoming
                    </span>
                  )}
                  {!isInProgress && !isUpcoming && (
                    <span 
                      className="text-xs px-2 py-1 rounded-full font-medium"
                      style={{ backgroundColor: 'var(--button)', color: 'var(--foreground)' }}
                    >
                      Completed
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Team & Check-ins Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Team Card */}
        <div 
          className="p-6 rounded-xl shadow-sm"
          style={{ 
            backgroundColor: 'var(--card)', 
            border: '1px solid var(--border)'
          }}
        >
          <div className="flex items-center space-x-2 mb-4">
            <Users className="w-5 h-5" style={{ color: 'var(--primary)' }} />
            <h3 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
              Your Team
            </h3>
          </div>
          
          {team ? (
            <div className="space-y-4">
              <p className="font-semibold text-lg" style={{ color: 'var(--foreground)' }}>
                {team.name}
              </p>
              
              {team.users && team.users.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                    Team Members
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {team.users.map((member) => (
                      <span 
                        key={member.id}
                        className="text-xs px-3 py-1 rounded-full"
                        style={{ backgroundColor: 'var(--button)', color: 'var(--foreground)' }}
                      >
                        {member.name || member.email}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                You're not part of a team yet
              </p>
              <Link 
                to="/teams"
                className="mt-3 inline-block text-sm font-medium px-4 py-2 rounded-lg hover:opacity-80 transition-opacity"
                style={{ backgroundColor: 'var(--primary)', color: 'white' }}
              >
                Find a Team
              </Link>
            </div>
          )}
        </div>

        {/* Check-in History Card */}
        <div 
          className="p-6 rounded-xl shadow-sm"
          style={{ 
            backgroundColor: 'var(--card)', 
            border: '1px solid var(--border)'
          }}
        >
          <div className="flex items-center space-x-2 mb-4">
            <CheckCircle className="w-5 h-5" style={{ color: 'var(--primary)' }} />
            <h3 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
              Check-in History
            </h3>
          </div>
          
          {checkins.length > 0 ? (
            <div className="space-y-3">
              {checkins.slice(0, 5).map((checkin) => (
                <div 
                  key={checkin.id}
                  className="flex items-center justify-between py-2"
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <div>
                    <p className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>
                      {checkin.events?.title || 'Event'}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                      {checkin.events?.location || 'Location TBA'}
                    </p>
                  </div>
                  <span 
                    className="text-xs"
                    style={{ color: 'var(--foreground)', opacity: 0.5 }}
                  >
                    {new Date(checkin.created_at).toLocaleTimeString('en-US', { 
                      hour: 'numeric', 
                      minute: '2-digit',
                      hour12: true 
                    })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                No check-ins yet
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--foreground)', opacity: 0.4 }}>
                Scan your QR code at events to check in
              </p>
            </div>
          )}
        </div>
      </div>
      {qrFullscreen && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
          onClick={() => setQrFullscreen(false)}
        >
          <div className="p-6 rounded-2xl bg-white">
            {user?.id && <QRCodeSVG value={user.id} size={240} level="M" fgColor="#8571b6" />}
          </div>
          <p className="text-white/70 text-sm">Tap anywhere to close</p>
        </div>
      )}
    </div>
  );
}
