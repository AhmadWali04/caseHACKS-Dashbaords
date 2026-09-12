import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <main className="flex flex-col items-center gap-8 text-center px-4">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-primary">
            CaseHacks Dashboard
          </h1>
          <p className="text-xl text-foreground/80">
            Internal organizer dashboard for hackathon management
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <Link 
            href="/login"
            className="px-8 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Sign In
          </Link>
          <Link 
            href="/signup"
            className="px-8 py-3 bg-card border-2 border-primary text-primary rounded-lg font-medium hover:bg-primary/10 transition-colors"
          >
            Request Access
          </Link>
        </div>
        
        <p className="text-sm text-foreground/60 mt-8">
          CaseHacks 2026 • Organizer Access Only
        </p>
      </main>
    </div>
  );
}
