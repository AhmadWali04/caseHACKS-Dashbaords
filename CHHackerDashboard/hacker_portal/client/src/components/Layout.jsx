import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Calendar, User, Users, Menu, LogOut, QrCode, Trophy } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Layout() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { signOut, session } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Schedule', href: '/schedule', icon: Calendar },
    { name: 'Teams', href: '/teams', icon: Users },
    { name: 'Scan', href: '/scan', icon: QrCode },
    { name: 'Leaderboard', href: '/leaderboard', icon: Trophy },
    { name: 'Profile', href: '/profile', icon: User },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      {/* Top Navigation */}
      <nav className="bg-[var(--card)] border-b border-[var(--border)] sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <img src="/CaseLogo.png" alt="CaseHacks logo" className="h-12 w-auto hidden lg:block" />
              <img src="/CaseLogoMobile.png" alt="CaseHacks logo" className="h-12 w-auto lg:hidden" />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-[var(--primary)] bg-[var(--button)]'
                        : 'text-[var(--foreground)]/70 hover:text-[var(--primary)] hover:bg-[var(--button)]/50'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.name}
                  </Link>
                );
              })}
            </div>

            {/* User Avatar & Sign Out */}
            <div className="hidden lg:flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-sm font-medium">
                {/* Display first 2 letters of user's name or email as avatar*/}
                {session?.user?.name
                  ? session.user.name.slice(0, 2).toUpperCase()
                  : session?.user?.email                  ? session.user.email.slice(0, 2).toUpperCase()
                  : '??'}
              </div>
              <button
                onClick={signOut}
                className="flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors text-[var(--foreground)]/70 hover:text-[var(--primary)] hover:bg-[var(--button)]/50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-[var(--button)]/50 transition-colors"
              style={{ color: 'var(--foreground)' }}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-[var(--border)] bg-[var(--card)] px-4 py-3 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-[var(--primary)] bg-[var(--button)]'
                      : 'text-[var(--foreground)]/70 hover:text-[var(--primary)] hover:bg-[var(--button)]/50'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-3" />
                  {item.name}
                </Link>
              );
            })}
            <button
              onClick={() => { signOut(); setIsMobileMenuOpen(false); }}
              className="w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors text-[var(--foreground)]/70 hover:text-[var(--primary)] hover:bg-[var(--button)]/50"
            >
              <LogOut className="w-4 h-4 mr-3" />
              Sign Out
            </button>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
