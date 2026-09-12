'use client';

import { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { checkInUser, getEvents, getEventCheckins } from './actions';

interface Event {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
}

interface Checkin {
  id: string;
  user_name: string;
  created_at: string;
}

export default function ScanPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [scanCount, setScanCount] = useState(0);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadCheckins();
    }
  }, [selectedEventId, scanCount]);

  const loadEvents = async () => {
    const { events: eventsData, error } = await getEvents();
    if (!error && eventsData) {
      setEvents(eventsData);
      if (eventsData.length > 0 && !selectedEventId) {
        setSelectedEventId(eventsData[0].id);
      }
    }
  };

  const loadCheckins = async () => {
    if (!selectedEventId) return;
    const { checkins: checkinsData, error } = await getEventCheckins(selectedEventId);
    if (!error && checkinsData) {
      setCheckins(checkinsData);
    }
  };

  const handleScan = async (detectedCodes: any[]) => {
    if (!scanning || !selectedEventId || detectedCodes.length === 0) return;

    const userId = detectedCodes[0].rawValue;
    setScanning(false);

    const result = await checkInUser(userId, selectedEventId);

    if (result.success) {
      setMessage({ 
        type: 'success', 
        text: `✓ ${result.userName} checked in successfully!` 
      });
      setScanCount(prev => prev + 1);
    } else {
      setMessage({ 
        type: 'error', 
        text: result.error || 'Check-in failed' 
      });
    }

    setTimeout(() => {
      setMessage(null);
      setScanning(true);
    }, 2000);
  };

  const selectedEvent = events.find(e => e.id === selectedEventId);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-primary mb-8">Event Check-In Scanner</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Scanner Section */}
          <div className="space-y-4">
            <div className="bg-card rounded-lg shadow p-6">
              <h2 className="text-2xl font-semibold text-foreground mb-4">Select Event</h2>
              
              {events.length === 0 ? (
                <p className="text-foreground/60">No events available</p>
              ) : (
                <select
                  value={selectedEventId}
                  onChange={(e) => {
                    setSelectedEventId(e.target.value);
                    setScanning(false);
                    setMessage(null);
                  }}
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                >
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.title} - {new Date(event.starts_at).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              )}

              {selectedEvent && (
                <div className="mt-4 p-4 bg-background rounded-lg border border-border">
                  <p className="text-sm text-foreground/70">
                    <strong>Event:</strong> {selectedEvent.title}
                  </p>
                  <p className="text-sm text-foreground/70">
                    <strong>Time:</strong> {new Date(selectedEvent.starts_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </p>
                  <p className="text-sm text-foreground/70 mt-2">
                    <strong>Total Check-ins:</strong> {checkins.length}
                  </p>
                </div>
              )}
            </div>

            {/* Scanner */}
            <div className="bg-card rounded-lg shadow p-6">
              <h2 className="text-2xl font-semibold text-foreground mb-4">Scanner</h2>
              
              {!selectedEventId ? (
                <div className="p-8 bg-background rounded-lg border border-border text-center">
                  <p className="text-foreground/60">Please select an event to start scanning</p>
                </div>
              ) : (
                <>
                  {!scanning ? (
                    <div className="space-y-4">
                      <button
                        onClick={() => setScanning(true)}
                        disabled={!selectedEventId}
                        className="w-full px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Start Scanning
                      </button>
                      {message && (
                        <div
                          role="status"
                          aria-live="polite"
                          aria-atomic="true"
                          className={`p-4 rounded-lg ${
                          message.type === 'success' 
                            ? 'bg-green-50 border border-green-200' 
                            : 'bg-red-50 border border-red-200'
                        }`}>
                          <p className={`text-sm font-medium ${
                            message.type === 'success' ? 'text-green-800' : 'text-red-800'
                          }`}>
                            {message.text}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
                        <Scanner
                          onScan={handleScan}
                          onError={(error) => {
                            console.error('Scanner error:', error);
                            setMessage({ type: 'error', text: 'Scanner error occurred' });
                          }}
                          components={{
                            finder: true,
                          }}
                          styles={{
                            container: { width: '100%', height: '100%' },
                          }}
                        />
                      </div>
                      <button
                        onClick={() => {
                          setScanning(false);
                          setMessage(null);
                        }}
                        className="w-full px-6 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
                      >
                        Stop Scanning
                      </button>
                      <p className="text-sm text-center text-foreground/60">
                        Position the QR code within the scanner frame
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Recent Check-ins Section */}
          <div className="bg-card rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Recent Check-ins</h2>
            
            {!selectedEventId ? (
              <p className="text-foreground/60">Select an event to view check-ins</p>
            ) : checkins.length === 0 ? (
              <p className="text-foreground/60">No check-ins yet for this event</p>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {checkins.map((checkin) => (
                  <div
                    key={checkin.id}
                    className="p-4 bg-background rounded-lg border border-border"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-foreground">{checkin.user_name}</p>
                        <p className="text-sm text-foreground/60">
                          {new Date(checkin.created_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </p>
                      </div>
                      <span className="text-green-600 text-xl">✓</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
