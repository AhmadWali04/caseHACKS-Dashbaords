import { getHackerById } from './actions';
import Link from 'next/link';

interface HackerProfileProps {
  params: Promise<{ hackerId: string }>;
}

// Force recompile
export default async function HackerProfilePage({ params }: HackerProfileProps) {
  const { hackerId } = await params;
  const hacker = await getHackerById(hackerId);

  if (!hacker) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-destructive mb-4">Hacker Not Found</h1>
          <p className="text-foreground/60">The requested hacker profile could not be found.</p>
          <Link href="/dashboard/hackers" className="mt-8 inline-block px-6 py-2 bg-primary text-white rounded-lg">
            Back to Hackers List
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/dashboard/hackers" className="text-sm text-primary hover:underline">
            &larr; Back to Hackers List
          </Link>
        </div>

        <div className="bg-card rounded-lg shadow-lg p-8">
          <div className="flex flex-col md:flex-row items-start gap-8">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-primary">{hacker.name || 'N/A'}</h1>
              <p className="text-lg text-foreground/80 mt-1">{hacker.email}</p>
              
              <div className="mt-4">
                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${hacker.status === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  Status: {hacker.status || 'pending'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-10 border-t border-border pt-8 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground/60">School</p>
              <p className="text-base text-foreground">{hacker.school || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground/60">Year</p>
              <p className="text-base text-foreground">{hacker.year || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground/60">Dietary Restrictions</p>
              <p className="text-base text-foreground">{hacker.dietary || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground/60">T-Shirt Size</p>
              <p className="text-base text-foreground">{hacker.tshirt_size || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground/60">GitHub</p>
              <p className="text-base text-primary hover:underline">
                {hacker.github ? <a href={hacker.github} target="_blank" rel="noopener noreferrer">{hacker.github}</a> : 'N/A'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground/60">LinkedIn</p>
              <p className="text-base text-primary hover:underline">
                {hacker.linkedin ? <a href={hacker.linkedin} target="_blank" rel="noopener noreferrer">{hacker.linkedin}</a> : 'N/A'}
              </p>
            </div>
            <div className="md:col-span-2 space-y-1">
              <p className="text-sm font-medium text-foreground/60">Portfolio/Website</p>
              <p className="text-base text-primary hover:underline">
                {hacker.other ? <a href={hacker.other} target="_blank" rel="noopener noreferrer">{hacker.other}</a> : 'N/A'}
              </p>
            </div>
            <div className="md:col-span-2 space-y-1">
              <p className="text-sm font-medium text-foreground/60">Attendance Points</p>
              <p className="text-base text-foreground">{hacker.event_attendance_points ?? 0}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
