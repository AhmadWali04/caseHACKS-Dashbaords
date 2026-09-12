import { useState, useEffect, useRef, useMemo } from 'react';
import { MapPin, X, Clock, Calendar } from 'lucide-react';
import Loading from '../components/Loading';
import GrainBackground from '../components/GrainBackground';
import { useAuth } from '../contexts/AuthContext';


const HACKATHON_DAYS = [
  { label: 'Fri', date: 'May 22', iso: '2026-05-22' },
  { label: 'Sat', date: 'May 23', iso: '2026-05-23' },
  { label: 'Sun', date: 'May 24', iso: '2026-05-24' }
];

const PX_PER_HOUR = 80;
const START_HOUR  = 8 + 45 / 60; // 8:30 AM
const END_HOUR    = 27;           // 3:00 AM next day


const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;
const GRID_HEIGHT   = (TOTAL_MINUTES / 60) * PX_PER_HOUR;
const GAP           = 4; // px gutter between event columns


const fgStyle  = (opacity = 1)  => ({ color: 'var(--foreground)', opacity });
const fgColor  = { color: 'var(--foreground)' };
const hourToLabel = (h) => {
  const d = h >= 24 ? h - 24 : h;
  if (d === 0)  return '12 AM';
  if (d < 12)   return `${d} AM`;
  if (d === 12) return '12 PM';
  return `${d - 12} PM`;
};


function minutesFromStart(date, startDate = null) {
  let h = date.getHours();
  const refH = startDate ? startDate.getHours() : 6;
  if (h < refH && h < 12) h += 24;
  return (h - START_HOUR) * 60 + date.getMinutes();
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function buildHourLabels() {
  const labels = [];
  const totalSlots = Math.ceil(END_HOUR - Math.floor(START_HOUR));
  for (let i = 0; i <= totalSlots; i++) {
    const rawHour = Math.floor(START_HOUR) + i;
    labels.push({ label: hourToLabel(rawHour), offsetPx: (rawHour - START_HOUR) * PX_PER_HOUR, rawHour });
  }
  return labels;
}

/**
 * Assign each event a { col, totalCols } so overlapping events spread across
 * equal-width columns. Sort by start → group mutually-overlapping events →
 * greedily assign to the first available column within each group.
 */
function assignColumns(events) {
  if (!events.length) return [];

  const sorted = [...events]
    .map((e) => ({
      ...e,
      _startMin: minutesFromStart(new Date(e.starts_at)),
      _endMin:   minutesFromStart(new Date(e.ends_at), new Date(e.starts_at)),
    }))
    .sort((a, b) => a._startMin - b._startMin)
    .map((e) => ({ ...e, col: 0, totalCols: 1 }));

  let groupStart  = 0;
  let groupEndMin = sorted[0]._endMin;

  for (let i = 1; i <= sorted.length; i++) {
    const atEnd   = i === sorted.length;
    const overlaps = !atEnd && sorted[i]._startMin < groupEndMin;

    if (overlaps) {
      groupEndMin = Math.max(groupEndMin, sorted[i]._endMin);
    } else {
      const group   = sorted.slice(groupStart, i);
      const colEnds = [];

      for (const ev of group) {
        let placed = false;
        for (let c = 0; c < colEnds.length; c++) {
          if (ev._startMin >= colEnds[c]) {
            ev.col    = c;
            colEnds[c] = ev._endMin;
            placed    = true;
            break;
          }
        }
        if (!placed) {
          ev.col = colEnds.length;
          colEnds.push(ev._endMin);
        }
      }

      const totalCols = colEnds.length;
      for (const ev of group) ev.totalCols = totalCols;

      groupStart  = i;
      if (!atEnd) groupEndMin = sorted[i]._endMin;
    }
  }

  return sorted;
}

const formatTime = (dateString) =>
  dateString
    ? new Date(dateString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    : '';

const formatDate = (dateString) =>
  dateString
    ? new Date(dateString).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : '';

// Returns YYYY-MM-DD in the user's LOCAL timezone 
const todayISO = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

//  YYYY-MM-DD from a date string in local time
const localDateISO = (dateString) => {
  const d = new Date(dateString);
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function Schedule() {
  const [events,        setEvents]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [now,           setNow]           = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDay,   setSelectedDay]   = useState(
    () => HACKATHON_DAYS.find((d) => d.iso === todayISO())?.iso ?? HACKATHON_DAYS[0].iso
  );
  const nowLineRef = useRef(null);
  const scrollRef  = useRef(null);

  useEffect(() => {
    fetch(`/api/events`)
      .then((res) => res.json())
      .then((data) => setEvents(data.events || []))
      .catch((err) => console.error('Error fetching events:', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    const isToday = selectedDay === todayISO();
    scrollRef.current.scrollTop =
      isToday && nowLineRef.current ? nowLineRef.current.offsetTop - 120 : 0;
  }, [selectedDay, loading]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setSelectedEvent(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const visibleEvents = useMemo(() => events.filter(e => e.starts_at && localDateISO(e.starts_at) === selectedDay), [events, selectedDay]);

  const isSelectedToday = selectedDay === todayISO();
  const layoutEvents = useMemo(() => assignColumns(visibleEvents), [visibleEvents]);
  const nowTop          = clamp((minutesFromStart(now) / 60) * PX_PER_HOUR, 0, GRID_HEIGHT);
  const hourLabels      = buildHourLabels();

  if (loading) return <Loading />;

  return (
    <div className="max-w-4xl mx-auto space-y-6 relative z-10">
      <GrainBackground />
      <header>
        <h1 className="text-4xl font-bold" style={fgColor}>Schedule</h1>
        <p className="mt-1" style={fgStyle(0.6)}>CaseHacks · May 22-24</p>
      </header>

      {/* Day Picker */}
      <div
        className="grid grid-cols-3 gap-2 p-2 rounded-xl"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        {HACKATHON_DAYS.map((day) => {
          const isSelected = selectedDay === day.iso;
          const isToday    = day.iso === todayISO();
          return (
            <button
              key={day.iso}
              onClick={() => setSelectedDay(day.iso)}
              className="flex flex-col items-center py-3 px-2 rounded-lg transition-all"
              style={isSelected ? { backgroundColor: 'var(--primary)', color: 'white' } : fgColor}
            >
              <span className="text-xs font-medium uppercase tracking-wider opacity-80">{day.label}</span>
              <span className="text-sm font-bold mt-0.5">{day.date}</span>
              {isToday && (
                <span
                  className="mt-1 w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: isSelected ? 'white' : 'var(--primary)' }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Calendar Grid */}
      <div
        className="rounded-xl border overflow-hidden relative"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
      >
        {/* Fade hint at bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none z-30 rounded-b-xl"
          style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.18) 60%, rgba(0,0,0,0.32) 100%)' }}
        />

        <div
          ref={scrollRef}
          className="overflow-y-auto"
          style={{ maxHeight: '70vh', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style>{`div::-webkit-scrollbar { display: none; }`}</style>

          <div className="flex">
            {/* Hour labels */}
            <div className="shrink-0 w-16 relative select-none" style={{ height: GRID_HEIGHT }}>
              {hourLabels.map(({ label, offsetPx, rawHour }) => (
                <div
                  key={rawHour}
                  className="absolute right-3 text-xs font-medium"
                  style={{ top: offsetPx - 8, ...fgStyle(0.4) }}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Grid */}
            <div
              className="flex-1 relative border-l"
              style={{ height: GRID_HEIGHT, borderColor: 'var(--border)' }}
            >
              {/* Hour lines */}
              {hourLabels.map(({ offsetPx, rawHour }) => (
                <div
                  key={rawHour}
                  className="absolute left-0 right-0 h-px"
                  style={{ top: offsetPx, backgroundColor: 'var(--border)', opacity: 0.6 }}
                />
              ))}
              {/* Half-hour lines */}
              {hourLabels.slice(0, -1).map(({ offsetPx, rawHour }) => (
                <div
                  key={`h-${rawHour}`}
                  className="absolute left-0 right-0 h-px"
                  style={{ top: offsetPx + PX_PER_HOUR / 2, backgroundColor: 'var(--border)', opacity: 0.25 }}
                />
              ))}

              {/* Events */}
              {layoutEvents.map((event) => {
                const start  = new Date(event.starts_at);
                const end    = new Date(event.ends_at);
                const top    = clamp((event._startMin / 60) * PX_PER_HOUR, 0, GRID_HEIGHT);
                const height = clamp(((event._endMin - event._startMin) / 60) * PX_PER_HOUR, 24, GRID_HEIGHT - top);
                const isNow  = now >= start && now <= end;
                const isPast = now > end;

                const colWidth = `calc((100% - ${GAP * 2}px) / ${event.totalCols} - ${GAP}px)`;
                const colLeft  = `calc(${GAP}px + (${event.col} * (100% - ${GAP * 2}px) / ${event.totalCols})${event.col > 0 ? ` + ${GAP / 2}px` : ''})`;
                const textStyle = isNow ? { color: 'white' } : fgColor;

                return (
                  <div
                    key={event.id}
                    className="absolute rounded-lg px-2 py-1.5 overflow-hidden cursor-pointer transition-all hover:brightness-110 hover:shadow-md hover:z-10"
                    style={{
                      top, height,
                      width: colWidth,
                      left: colLeft,
                      backgroundColor: isNow ? 'var(--primary)' : 'var(--button)',
                      border: '1px solid var(--primary)',
                      opacity: isPast ? 0.4 : 1,
                    }}
                    onClick={() => setSelectedEvent(event)}
                  >
                    <p className="text-xs font-bold leading-tight truncate -mt-0.25" style={textStyle}>
                      {event.title}
                    </p>
                    {height > 36 && event.location && event.location !== '-' && (
                      <p className="pl-1 flex items-center gap-1 text-xs truncate" style={{ ...textStyle, opacity: isNow ? 0.75 : 0.45 }}>
                        <MapPin className="w-3 h-3 shrink-0" />{event.location}
                      </p>
                    )}
                    {height > 56 && (
                      <p className="text-xs mt-1 truncate" style={{ ...textStyle, opacity: isNow ? 0.85 : 0.55 }}>
                        {formatTime(event.starts_at)}{event.ends_at ? ` – ${formatTime(event.ends_at)}` : ''}
                      </p>
                    )}
                  </div>
                );
              })}

              {/* Now line */}
              {isSelectedToday && (
                <div
                  ref={nowLineRef}
                  className="absolute left-0 right-0 flex items-center z-20 pointer-events-none"
                  style={{ top: nowTop }}
                >
                  <div className="w-2.5 h-2.5 rounded-full shrink-0 -ml-1.5" style={{ backgroundColor: '#c4b0e8' }} />
                  <div className="flex-1 h-0.5" style={{ backgroundColor: '#c4b0e8' }} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Event Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-xl font-bold leading-snug" style={fgColor}>{selectedEvent.title}</h2>
              <button
                onClick={() => setSelectedEvent(null)}
                className="shrink-0 p-1 rounded-lg hover:bg-[var(--button)] transition-colors"
                style={fgColor}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm" style={fgStyle(0.7)}>
                <Clock className="w-4 h-4 shrink-0" />
                <span>
                  {formatTime(selectedEvent.starts_at)}
                  {selectedEvent.ends_at ? ` – ${formatTime(selectedEvent.ends_at)}` : ''}
                </span>
              </div>
              {selectedEvent.location && (
                <div className="flex items-center gap-2 text-sm" style={fgStyle(0.7)}>
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span>{selectedEvent.location}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm" style={fgStyle(0.7)}>
                <Calendar className="w-4 h-4 shrink-0" />
                <span>{formatDate(selectedEvent.starts_at)}</span>
              </div>
            </div>

            {selectedEvent.description ? (
              <p className="text-sm leading-relaxed" style={fgStyle(0.8)}>{selectedEvent.description}</p>
            ) : (
              <p className="text-sm italic" style={fgStyle(0.4)}>No description available.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}