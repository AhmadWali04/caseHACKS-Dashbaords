import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../contexts/UserContext';

export default function ProtectedRoute({ children, requireApplication = true }) {
  const { session, loading: authLoading } = useAuth();
  const { dbUser, userLoading, fetchError } = useUser();
  const location = useLocation();
  
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div style={{ color: 'var(--foreground)', opacity: 0.6 }}>Loading auth...</div>
      </div>
    );
  }

  // Not logged in
  //if (!session) return <Navigate to="/login" state={{ from: location }} replace />;
  if(!session){
    console.log("No session found, redirecting to login.");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Wait for both auth and user data to fully resolve before making any routing
  // decisions. This prevents the brief window where dbUser is null (not yet
  // fetched) from being misread as "user has no application" and bouncing the
  // user to /application unnecessarily.
  if (authLoading || userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div style={{ color: 'var(--foreground)', opacity: 0.6 }}>Loading...</div>
      </div>
    );
  }

  

  // Surface fetch errors rather than silently redirecting to /application
  if (fetchError) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-center px-4">
        <div
          className="p-8 rounded-2xl shadow-sm max-w-md w-full"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <div
            className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center text-4xl"
            style={{ backgroundColor: 'var(--button)' }}
          >
            ⚠️
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
            Something went wrong
          </h1>
          <p className="mb-6" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
            We couldn't load your account information. Please refresh the page or try again later.
          </p>
        </div>
      </div>
    );
  }

  // Route doesn't require an application — render directly
  if (!requireApplication) return children;

  // FIX: Only redirect to /application when we are certain the user has no
  // record. Previously, `!dbUser` was true during the initial fetch (before the
  // API response came back), sending users with a valid application to
  // /application on every hard load. Now we only redirect after loading is
  // confirmed complete AND dbUser is definitively absent or has no status.
  if ((!dbUser || !dbUser.status) && location.pathname !== '/application') {
    return <Navigate to="/application" replace />;
  }

  // Show placeholder page if user is not accepted
  if (!dbUser || dbUser.status !== 'accepted') {
    const getStatusStyle = (status) => {
      switch (status) {
        case 'rejected':   return 'bg-red-100 text-red-700 border-red-200';
        case 'waitlisted': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        default:           return 'bg-gray-100 text-gray-700 border-gray-200';
      }
    };

    const getStatusText = (status) => {
      switch (status) {
        case 'rejected':   return '✗ Not Accepted';
        case 'waitlisted': return '⏳ Waitlisted';
        default:           return '⏳ Pending';
      }
    };

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div
          className="p-8 rounded-2xl shadow-sm max-w-md w-full"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <div
            className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center text-4xl"
            style={{ backgroundColor: 'var(--button)' }}
          >
            {(!dbUser || dbUser.status === 'pending') && '⏳'}
            {dbUser?.status === 'waitlisted' && '📋'}
            {dbUser?.status === 'rejected' && '😔'}
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
            {(!dbUser || dbUser.status === 'pending') && 'Application Under Review'}
            {dbUser?.status === 'waitlisted' && "You're on the Waitlist"}
            {dbUser?.status === 'rejected' && 'Application Not Accepted'}
          </h1>
          <p className="mb-6" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
            {(!dbUser || dbUser.status === 'pending') && "Thanks for applying to CaseHacks! We're reviewing your application and will get back to you soon."}
            {dbUser?.status === 'waitlisted' && "You're on our waitlist. We'll notify you if a spot opens up!"}
            {dbUser?.status === 'rejected' && "Unfortunately, we weren't able to accept your application this time. We hope to see you at future events!"}
          </p>
          <div className={`inline-block px-4 py-2 rounded-full text-sm font-medium border ${getStatusStyle(dbUser?.status)}`}>
            {getStatusText(dbUser?.status)}
          </div>
          {(!dbUser || dbUser.status === 'pending') && (
            <p className="mt-6 text-sm" style={{ color: 'var(--foreground)', opacity: 0.5 }}>
              Check back later for updates on your application status.
            </p>
          )}
        </div>
      </div>
    );
  }

  return children;
}