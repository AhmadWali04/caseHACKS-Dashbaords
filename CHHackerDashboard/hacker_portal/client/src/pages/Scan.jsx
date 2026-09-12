import { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import Loading from '../components/Loading'; 
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../contexts/UserContext';
import GrainBackground from '../components/GrainBackground';


const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";


export default function ScanPage() {
  //const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState(null);
  const [scanCount, setScanCount] = useState(0);
  const { session } = useAuth();
  const { dbUser: user, userLoading } = useUser();
  //const [userId, setUserId] = useState(user?.id ?? null);;



  // For now, using test user email - replace with auth context
  //const userEmail = session?.user?.email || "test.hacker@casehacks.ca";
  //const userId = session?.user?.id || "09702fd8-9dab-4a86-8211-8b041d290a77"; // Replace with actual user ID from auth context
  //console.log("User ID:", userId);
  const handleScan = async (detectedCodes) => {
    if (!scanning || detectedCodes.length === 0) return;

    const scannerId = detectedCodes[0].rawValue;
    setScanning(false);

    const result = await scanUser(scannerId, user?.id);

    if (result.success) {
      setMessage({ 
        type: 'success', 
        text: `✓ ${result.userName} scanned successfully!` 
      });
      setScanCount(prev => prev + 1);
    } else {
      setMessage({ 
        type: 'error', 
        //replace with why it faiiled
        text: `✗ Scanning failed: ${result.error || 'Scanning Failed'}`
      });
    }

    setTimeout(() => {
      setScanning(false);
    }, 2000);
  };
// Make sure to do token stuff later for now just making the endpoint auto hit
  const scanUser = async (scannerId, userId) => {
    try {
      const response = await fetch(`/api/scan/${scannerId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`, // ADD THIS
        },
        body: JSON.stringify({ original_user_id: userId }),
      });

    // Check if response is ok and has content
    if (!response.ok) {
      const text = await response.text();
      console.error('Server error:', response.status, text);
      return { 
        success: false, 
        error: `Server error: ${response.status}` 
      };
    }

    // Check if response has content
    const text = await response.text();
    if (!text) {
      return { 
        success: false, 
        error: 'Empty response from server' 
      };
    }

    const result = JSON.parse(text);
      return result;
    } catch (error) {
      console.error("Error scanning user:", error);
      throw error;
    }
  };
  if (userLoading) return <Loading />;
  return (
    <div className="space-y-6 relative z-10">
      <GrainBackground />
      {/* Header */}
      <header>
        <h1 className="text-4xl font-bold" style={{ color: 'var(--foreground)' }}>
          Participant to Participant Scanner
        </h1>
        <p className="mt-1" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
          Scan another participant's QR code to connect.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scanner Card */}
        <div
          className="p-6 rounded-xl shadow-sm"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
            Scanner
          </h2>

          {!scanning ? (
            <div className="space-y-4">
              <button
                onClick={() => setScanning(true)}
                className="w-full px-6 py-3 rounded-lg font-medium text-white transition-colors"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                Start Scanning
              </button>
              {message && (
                <div
                  className={`p-4 rounded-lg border ${
                    message.type === 'success'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
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
                  components={{ finder: true }}
                  styles={{ container: { width: '100%', height: '100%' } }}
                />
              </div>
              <button
                onClick={() => { setScanning(false); setMessage(null); }}
                className="w-full px-6 py-3 rounded-lg font-medium text-white transition-colors"
                style={{ backgroundColor: '#ef4444' }}
              >
                Stop Scanning
              </button>
              <p className="text-sm text-center" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                Position the QR code within the scanner frame
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
