export default function HackersLoading() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="h-10 w-48 bg-card rounded-lg animate-pulse mb-8" />
        <div className="bg-card rounded-lg shadow overflow-hidden">
          <div className="p-4 space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex gap-6 items-center">
                <div className="h-5 w-32 bg-background rounded animate-pulse" />
                <div className="h-5 w-48 bg-background rounded animate-pulse" />
                <div className="h-5 w-28 bg-background rounded animate-pulse" />
                <div className="h-5 w-16 bg-background rounded animate-pulse" />
                <div className="h-5 w-20 bg-background rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
