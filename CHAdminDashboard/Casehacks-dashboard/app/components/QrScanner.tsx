'use client';

import { useState, useEffect, useCallback } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { checkInUser, getEventCheckins } from '../scan/actions';

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

interface QrScannerProps {
  events: Event[];
  onCheckinSuccess: () => void;
}

export default function QrScanner({ events, onCheckinSuccess }: QrScannerProps) {
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [checkins, setCheckins] = useState<Checkin[]>([]);

  useEffect(() => {
    if (events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  const loadCheckins = useCallback(async () => {
    if (!selectedEventId) return;
    const { checkins: checkinsData, error } = await getEventCheckins(selectedEventId);
    if (!error && checkinsData) {
      setCheckins(checkinsData);
    }
  }, [selectedEventId]);

  useEffect(() => {
    if (selectedEventId) {
      loadCheckins();
    }
  }, [loadCheckins, onCheckinSuccess]);

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
      onCheckinSuccess();
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
    <div className="space-y-4">
      {events.length > 0 && (
        <select
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
        >
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title}
            </option>
          ))}
        </select>
      )}

      {selectedEvent && (
        <div className="mt-2 p-3 bg-background rounded-lg border border-border text-sm">
          <p className="text-foreground/70">
            <strong>Total Check-ins for this event:</strong> {checkins.length}
          </p>
        </div>
      )}

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
            }`}
          >
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
              constraints={{ facingMode: 'environment' }}
              components={{ finder: true }}
              styles={{ container: { width: '100%', height: '100%' } }}
            />
          </div>
          <button
            onClick={() => setScanning(false)}
            className="w-full px-6 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
          >
            Stop Scanning
          </button>
        </div>
      )}
    </div>
  );
}
