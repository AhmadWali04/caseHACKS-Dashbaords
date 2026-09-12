import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { UserProvider } from './contexts/UserContext';
import { useUser } from './contexts/UserContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Loading from './components/Loading';
import Dashboard from './pages/Dashboard';
import Schedule from './pages/Schedule';
import Profile from './pages/Profile';
import Teams from './pages/Teams';
import Auth from './pages/Auth';
import Scan from './pages/Scan';
import Leaderboard from './pages/Leaderboard';
import Application from './pages/Application';

const ALLOWED_EMAILS = import.meta.env.VITE_ALLOWED_EMAILS?.split(',').map(e => e.trim()) || [];

function AdminGate({ children }) {
  const { dbUser, userLoading } = useUser();
  if (userLoading) return <Loading />;
  if (!ALLOWED_EMAILS.includes(dbUser?.email)) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p>Access restricted.</p>
      </div>
    );
  }
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <UserProvider>
          <Routes>
            <Route path="/login" element={<Auth />} />
            <Route path="/application" element={
              <ProtectedRoute requireApplication={false}>
                <AdminGate>
                  <Application />
                </AdminGate>
              </ProtectedRoute>
            } />
            <Route path="/" element={<Layout />}>
              <Route index element={
                <ProtectedRoute>

                    <Dashboard />

                </ProtectedRoute>
              } />
              <Route path="schedule" element={
                <ProtectedRoute>
                  <AdminGate>
                    <Schedule />
                  </AdminGate>
                </ProtectedRoute>
              } />
              <Route path="profile" element={
                <ProtectedRoute>
                  <AdminGate>
                    <Profile />
                  </AdminGate>
                </ProtectedRoute>
              } />
              <Route path="teams" element={
                <ProtectedRoute>
                  <AdminGate>
                    <Teams />
                  </AdminGate>
                </ProtectedRoute>
              } />
              <Route path="scan" element={
                <ProtectedRoute>
                  <AdminGate>
                    <Scan />
                  </AdminGate>
                </ProtectedRoute>
              } />
              <Route path="leaderboard" element={
                <ProtectedRoute>
                  <AdminGate>
                    <Leaderboard />
                  </AdminGate>
                </ProtectedRoute>
              } />
            </Route>
          </Routes>
        </UserProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;