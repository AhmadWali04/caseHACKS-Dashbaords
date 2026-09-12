'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import { deleteEvent } from './actions';
import { toast } from 'sonner';

interface Event {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  location: string | null;
  point_value: number;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createBrowserClient();

  // Convert a UTC ISO string to the local "YYYY-MM-DDTHH:mm" format
  // needed by datetime-local inputs, so edits show the correct local time.
  const toLocalDatetimeValue = (isoString: string) => {
    const d = new Date(isoString);
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
  };

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('starts_at', { ascending: false });

    if (!error && data) {
      setEvents(data);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      const result = await deleteEvent(id);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success('Event deleted');
        fetchEvents();
      }
    }
  };

  const openModal = (event?: Event) => {
    setEditingEvent(event || null);
    setIsModalOpen(true);
    setError(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEvent(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const startsAt = formData.get('starts_at') as string;
    const endsAt = formData.get('ends_at') as string;

    if (new Date(startsAt) >= new Date(endsAt)) {
      setError('Start time must be before end time.');
      return;
    }

    // datetime-local gives "YYYY-MM-DDTHH:mm" with no timezone.
    // new Date() treats it as local time — .toISOString() converts to UTC correctly.
    const eventData = {
      title: formData.get('title') as string,
      description: formData.get('description') as string || null,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: new Date(endsAt).toISOString(),
      location: formData.get('location') as string || null,
      point_value: parseInt(formData.get('point_value') as string) || 1,
    };

    if (editingEvent) {
      // Update existing event
      const { error } = await supabase
        .from('events')
        .update(eventData)
        .eq('id', editingEvent.id);

      if (error) {
        setError(error.message);
      } else {
        toast.success('Event updated');
        closeModal();
        fetchEvents();
      }
    } else {
      // Create new event
      const { error } = await supabase
        .from('events')
        .insert(eventData);

      if (error) {
        setError(error.message);
      } else {
        toast.success('Event created');
        closeModal();
        fetchEvents();
      }
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-primary">Events Management</h1>
          <button
            onClick={() => openModal()}
            className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            + Add Event
          </button>
        </div>

        {events.length === 0 ? (
          <div className="p-12 bg-card rounded-lg shadow text-center">
            <p className="text-foreground/60">No events yet. Create your first event!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {events.map((event) => (
              <div key={event.id} className="p-6 bg-card rounded-lg shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground">{event.title}</h3>
                    {event.description && (
                      <p className="text-sm text-foreground/70 mt-2">{event.description}</p>
                    )}
                    <div className="flex flex-wrap gap-4 mt-3 text-sm text-foreground/60">
                      <span>🕒 {new Date(event.starts_at).toLocaleString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        hour: 'numeric', 
                        minute: '2-digit' 
                      })} - {new Date(event.ends_at).toLocaleString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        hour: 'numeric', 
                        minute: '2-digit' 
                      })}</span>
                      {event.location && <span>📍 {event.location}</span>}
                      <span>⭐ {event.point_value} pt{event.point_value !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => openModal(event)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(event.id)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-foreground mb-4">
                  {editingEvent ? 'Edit Event' : 'Create New Event'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  )}
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-foreground mb-1">
                      Event Title *
                    </label>
                    <input
                      type="text"
                      name="title"
                      id="title"
                      defaultValue={editingEvent?.title}
                      required
                      className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-foreground mb-1">
                      Description
                    </label>
                    <textarea
                      name="description"
                      id="description"
                      rows={3}
                      defaultValue={editingEvent?.description || ''}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="starts_at" className="block text-sm font-medium text-foreground mb-1">
                        Start Time *
                      </label>
                      <input
                        type="datetime-local"
                        name="starts_at"
                        id="starts_at"
                        defaultValue={editingEvent?.starts_at ? toLocalDatetimeValue(editingEvent.starts_at) : ''}
                        required
                        className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label htmlFor="ends_at" className="block text-sm font-medium text-foreground mb-1">
                        End Time *
                      </label>
                      <input
                        type="datetime-local"
                        name="ends_at"
                        id="ends_at"
                        defaultValue={editingEvent?.ends_at ? toLocalDatetimeValue(editingEvent.ends_at) : ''}
                        required
                        className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="location" className="block text-sm font-medium text-foreground mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      name="location"
                      id="location"
                      defaultValue={editingEvent?.location || ''}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label htmlFor="point_value" className="block text-sm font-medium text-foreground mb-1">
                      Attendance Points *
                    </label>
                    <input
                      type="number"
                      name="point_value"
                      id="point_value"
                      min={1}
                      defaultValue={editingEvent?.point_value ?? 1}
                      required
                      className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
                    >
                      {editingEvent ? 'Update Event' : 'Create Event'}
                    </button>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-4 py-2 bg-background border border-border text-foreground rounded-lg hover:bg-foreground/5 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
