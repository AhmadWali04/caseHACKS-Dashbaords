import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';

const UserContext = createContext(null);

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

export function UserProvider({ children }) {
  const [dbUser, setDbUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const { session } = useAuth();

  const fetchCounterRef = useRef(0);

  // FIX: Store stable session identifiers rather than the session object itself.
  // The session object reference changes on every auth listener emit (e.g. tab
  // focus triggers Supabase to re-emit the same session), which previously caused
  // fetchDbUser to rebuild and the effect to re-fire, resetting userLoading and
  // causing a full reload on every tab switch / trackpad swipe.
  const sessionEmailRef = useRef(null);
  const sessionTokenRef = useRef(null);

  const fetchDbUser = useCallback(async () => {
    const email = sessionEmailRef.current;
    const token = sessionTokenRef.current;

    if (!email || !token) {
      setDbUser(null);
      setFetchError(null);
      setUserLoading(false);
      return;
    }

    const thisFetch = ++fetchCounterRef.current;
    setFetchError(null);

    try {
      const res = await fetch(
        `${API_URL}/api/user/email/${encodeURIComponent(email)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(10_000),
        }
      );

      if (thisFetch !== fetchCounterRef.current) return;

      if (!res.ok) {
        const errorMessage =
          res.status === 401 || res.status === 403
            ? 'Session expired. Please log in again.'
            : `Failed to load account (${res.status})`;
        throw new Error(errorMessage);
      }

      const data = await res.json();
      if (!data || typeof data !== 'object') {
        throw new Error('Unexpected response format from server.');
      }

      if (thisFetch !== fetchCounterRef.current) return;
      setDbUser(data.user ?? null);
    } catch (err) {
      if (thisFetch !== fetchCounterRef.current) return;
      if (err.name === 'AbortError' || err.name === 'TimeoutError') return;
      console.error('Error fetching db user:', err);
      setFetchError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (thisFetch === fetchCounterRef.current) {
        setUserLoading(false);
      }
    }
  }, []); // No dependencies — reads session values through stable refs

  useEffect(() => {
    const email = session?.user?.email ?? null;
    const token = session?.access_token ?? null;

    // FIX: Only re-fetch when the actual credentials change, not when the
    // session object gets a new reference (which happens on every tab focus).
    if (
      email === sessionEmailRef.current &&
      token === sessionTokenRef.current
    ) {
      return;
    }

    sessionEmailRef.current = email;
    sessionTokenRef.current = token;

    if (email && token) {
      setUserLoading(true);
      fetchDbUser();
    } else {
      setDbUser(null);
      setFetchError(null);
      setUserLoading(false);
    }
  }, [session, fetchDbUser]);

  return (
    <UserContext.Provider
      value={{ dbUser, setDbUser, userLoading, fetchError, refetchUser: fetchDbUser }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}