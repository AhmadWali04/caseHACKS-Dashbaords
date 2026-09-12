'use client';

import { createBrowserClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { getDashboardStats, getRecentCheckins } from '../scan/actions';
import QrScanner from '../components/QrScanner';
import DashboardLoading from './loading';

interface Event {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  location: string | null;
}

interface RecentCheckin {
  id: string;
  user_name: string;
  created_at: string;
  event_id?: string;
  events: { title: string } | null;  // Supabase join returns object, not array
}

export default function DashboardPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [todaysEvents, setTodaysEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState({ totalCheckins: 0, totalParticipants: 0 });
  const [recentCheckins, setRecentCheckins] = useState<RecentCheckin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = useMemo(() => createBrowserClient(), []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [userResult, eventsResult, statsData, checkinsResult] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from('events')
          .select('*')
          .gte('starts_at', today.toISOString())
          .lt('starts_at', tomorrow.toISOString())
          .order('starts_at', { ascending: true }),
        getDashboardStats(),
        getRecentCheckins(),
      ]);

      if (userResult.data.user) {
        setUserEmail(userResult.data.user.email || null);
      }
      if (!eventsResult.error && eventsResult.data) {
        setTodaysEvents(eventsResult.data);
      }
      setStats(statsData);
      setRecentCheckins(checkinsResult.checkins as RecentCheckin[]);
    } catch {
      setFetchError('Failed to load dashboard data. Please refresh.');
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time: listen for new check-ins and update stats + feed live
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-checkins')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'checkins' },
        (payload) => {
          setStats((prev) => ({ ...prev, totalCheckins: prev.totalCheckins + 1 }));
          // Realtime payload has no join — look up event title from today's events list
          const raw = payload.new as { id: string; user_name: string; created_at: string; event_id: string };
          const eventTitle = todaysEvents.find(e => e.id === raw.event_id)?.title ?? null;
          const newCheckin: RecentCheckin = {
            ...raw,
            events: eventTitle ? { title: eventTitle } : null,
          };
          setRecentCheckins((prev) => [newCheckin, ...prev].slice(0, 5));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (isLoading) return <DashboardLoading />;

  if (fetchError) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="p-8 bg-card rounded-lg border border-red-500/30 text-red-400 text-center max-w-md">
        <p className="font-semibold mb-2">Something went wrong</p>
        <p className="text-sm">{fetchError}</p>
        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90">
          Retry
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl sm:text-4xl font-bold text-primary">
            Check-in Monitor
          </h1>
          <div className="flex items-center gap-2 sm:gap-4">
            {userEmail && (
              <span className="hidden sm:block text-sm text-foreground/60">
                {userEmail}
              </span>
            )}
            <button
              onClick={handleSignOut}
              className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm bg-card border border-border text-foreground rounded-lg hover:bg-foreground/5 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* QR Scanner — first on mobile, right column on desktop */}
          <div className="p-4 sm:p-8 bg-card rounded-lg shadow order-first lg:order-last lg:col-span-1">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4">
              QR Code Scanner
            </h2>
            {todaysEvents.length > 0 ? (
              <QrScanner events={todaysEvents} onCheckinSuccess={fetchData} />
            ) : (
              <div className="p-8 bg-background rounded border-2 border-dashed border-border flex items-center justify-center text-center">
                <p className="text-foreground/60">
                  No events scheduled for today to scan for.
                </p>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 grid gap-4 sm:gap-6 order-last lg:order-first">
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 sm:p-6 bg-card rounded-lg shadow">
                <p className="text-xs sm:text-sm text-foreground/60 mb-1">Check-ins</p>
                <p className="text-2xl sm:text-3xl font-bold text-primary">{stats.totalCheckins}</p>
              </div>
              <div className="p-3 sm:p-6 bg-card rounded-lg shadow">
                <p className="text-xs sm:text-sm text-foreground/60 mb-1">Events Today</p>
                <p className="text-2xl sm:text-3xl font-bold text-primary">{todaysEvents.length}</p>
              </div>
              <div className="p-3 sm:p-6 bg-card rounded-lg shadow">
                <p className="text-xs sm:text-sm text-foreground/60 mb-1">Participants</p>
                <p className="text-2xl sm:text-3xl font-bold text-primary">{stats.totalParticipants}</p>
              </div>
            </div>

            {/* Recent Check-ins */}
            <div className="p-4 sm:p-8 bg-card rounded-lg shadow">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4">
                Recent Check-ins
              </h2>
              {recentCheckins.length === 0 ? (
                <div className="p-6 bg-background rounded">
                  <p className="text-center text-foreground/60">
                    No check-ins yet
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentCheckins.map((checkin) => (
                    <div key={checkin.id} className="p-3 bg-background rounded-lg border border-border">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-foreground">{checkin.user_name}</p>
                          <p className="text-xs text-foreground/60">
                            Checked into "{checkin.events?.title || 'an event'}"
                          </p>
                        </div>
                        <p className="text-xs text-foreground/60">
                          {new Date(checkin.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>


        </div>
      </div>
    </div>
  );
}
