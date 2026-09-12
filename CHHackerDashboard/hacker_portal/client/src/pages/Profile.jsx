import { useState, useEffect } from 'react';
import { User, Save, Loader2 } from 'lucide-react';
import Loading from '../components/Loading'; 
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../contexts/UserContext';
import GrainBackground from '../components/GrainBackground';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

export default function Profile() {
  //const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const { session } = useAuth();
  const { dbUser: user, userLoading } = useUser();
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    school: '',
    dietary: '',
    github: '',
    linkedin: '',
    other: '',
  });

  // For now, using test user email - replace with auth context
  //const userEmail = session?.user?.email || "test.hacker@casehacks.ca";

  useEffect(() => {
    if (!user) return;
    setFormData({
      name: user.name || '',
      email: user.email || '',
      school: user.school || '',
      dietary: user.dietary || '',
      github: user.github || '',
      linkedin: user.linkedin || '',
      other: user.other || '',
    });
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch(`${API_URL}/api/user/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
         },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
      } else {
        setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
    }

    setSaving(false);
  };

  if (userLoading) return <Loading />;

  return (
    <div className="max-w-2xl mx-auto relative z-10">
      <GrainBackground />
      <header className="mb-8">
        <h1 className="text-4xl font-bold" style={{ color: 'var(--foreground)' }}>
          Profile Settings
        </h1>
        <p className="mt-1" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
          Update your personal information
        </p>
      </header>

      {message.text && (
        <div 
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-100 text-green-700 border border-green-200' 
              : 'bg-red-100 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div 
          className="p-6 rounded-xl shadow-sm space-y-6"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        >
          {/* Personal Info Section */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <User className="w-5 h-5" style={{ color: 'var(--primary)' }} />
              <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
                Personal Information
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  disabled
                  className="w-full px-4 py-2 rounded-lg border opacity-60 cursor-not-allowed"
                  style={{ 
                    backgroundColor: 'var(--button)', 
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)'
                  }}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--foreground)', opacity: 0.5 }}>
                  Name cannot be changed
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  disabled
                  className="w-full px-4 py-2 rounded-lg border opacity-60 cursor-not-allowed"
                  style={{ 
                    backgroundColor: 'var(--button)', 
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)'
                  }}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--foreground)', opacity: 0.5 }}>
                  Email cannot be changed
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
                  School/University
                </label>
                <input
                  type="text"
                  name="school"
                  value={formData.school}
                  onChange={handleChange}
                  disabled
                  className="w-full px-4 py-2 rounded-lg border opacity-60 cursor-not-allowed"
                  style={{ 
                    backgroundColor: 'var(--button)', 
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)'
                  }}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--foreground)', opacity: 0.5 }}>
                  School cannot be changed
                </p>
              </div>

            </div>
          </div>

          {/* Preferences Section */}
          <div className="pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
              Preferences
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
                  Dietary Restrictions
                </label>
                <input
                  type="text"
                  name="dietary"
                  value={formData.dietary}
                  onChange={handleChange}
                  placeholder="e.g., Vegetarian, Vegan, Halal"
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                  style={{ 
                    backgroundColor: 'var(--background)', 
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Social Links Section */}
          <div className="pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
              Social Links
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
                  GitHub
                </label>
                <input
                  type="url"
                  name="github"
                  value={formData.github}
                  onChange={handleChange}
                  placeholder="https://github.com/username"
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                  style={{ 
                    backgroundColor: 'var(--background)', 
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)'
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
                  LinkedIn
                </label>
                <input
                  type="url"
                  name="linkedin"
                  value={formData.linkedin}
                  onChange={handleChange}
                  placeholder="https://linkedin.com/in/username"
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                  style={{ 
                    backgroundColor: 'var(--background)', 
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)'
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
                  Other
                </label>
                <input
                  type="url"
                  name="other"
                  value={formData.other}
                  onChange={handleChange}
                  placeholder="https://yourwebsite.com"
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                  style={{ 
                    backgroundColor: 'var(--background)', 
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-medium text-white transition-colors disabled:opacity-60"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
