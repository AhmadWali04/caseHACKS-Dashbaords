import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import GrainBackground from '../components/GrainBackground';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [mode, setMode] = useState('login');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  
  //const location = useLocation();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      alert(error.message);
    } else {
      setOtpSent(true);
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e) => {
  e.preventDefault();
  setLoading(true);
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: otp,
    type: 'email',
  });
  
  if (error) {
    alert(error.message);
    setLoading(false);
  } else {
    if (mode === 'signup' && name) {
      await supabase.auth.updateUser({ data: { name } });
    }
    
    // Ensure Supabase client has fully registered the session locally 
    // before cutting the cord and forcing React Router to shift views
    const sessionCheck = await supabase.auth.getSession();
    if (sessionCheck.data.session) {
      navigate('/', { replace: true });
    }
  }
};

  return (
    <div className="flex flex-col items-center justify-center min-h-screen" >
      <GrainBackground />
      <div className="p-8 rounded-2xl shadow-sm max-w-md w-full" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
        <img src="/CaseLogoMobile.png" alt="CaseHacks logo" className="mx-auto mb-4" style={{ height: 48 }} />
        <h1 className="text-2xl font-bold mb-2 text-center" style={{ color: 'var(--foreground)' }}>Participant Portal</h1>
        <p className="mb-6 text-center" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
          {otpSent ? 'Check your email for a code' : mode === 'login' ? 'Sign in to your account' : 'Create a new account'}
        </p>

        {!otpSent ? (
          <>{/* 
            <div className="flex mb-6 rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              {['login', 'signup'].map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className="flex-1 py-2 text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: mode === m ? 'var(--primary)' : 'transparent',
                    color: mode === m ? 'white' : 'var(--foreground)',
                    opacity: mode === m ? 1 : 0.6,
                  }}
                >
                  {m === 'login' ? 'Login' : 'Sign Up'}
                </button>
              ))}
            </div>*/}

            <form onSubmit={handleSubmit}>
              {mode === 'signup' && (
                <div className="mb-4">
                  <input
                    className="w-full p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ backgroundColor: 'var(--input)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                    type="text"
                    placeholder="Your name"
                    value={name}
                    required
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              )}
              <div className="mb-4">
                <input
                  className="w-full p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ backgroundColor: 'var(--input)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                  type="email"
                  placeholder="Your email"
                  value={email}
                  required
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button
                className="w-full p-3 rounded-md text-white font-semibold hover:opacity-90 transition-opacity"
                style={{ backgroundColor: 'var(--primary)' }}
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send Code'}
              </button>
            </form>
          </>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <p className="text-sm text-center mb-4" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
              Sent to <strong>{email}</strong>
            </p>
            <div className="mb-4">
              <input
                className="w-full p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-xl tracking-widest"
                style={{ backgroundColor: 'var(--input)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                type="text"
                autoComplete="one-time-code"
                placeholder="000000"
                value={otp}
                maxLength={6}
                required
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <button
              className="w-full p-3 rounded-md text-white font-semibold hover:opacity-90 transition-opacity"
              style={{ backgroundColor: 'var(--primary)' }}
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
            <button
              type="button"
              onClick={() => { setOtpSent(false); setOtp(''); }}
              className="w-full mt-3 text-sm text-center"
              style={{ color: 'var(--foreground)', opacity: 0.5, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              ← Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}