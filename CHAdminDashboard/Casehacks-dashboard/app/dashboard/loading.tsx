export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="h-10 w-64 bg-card rounded-lg animate-pulse" />
          <div className="h-8 w-32 bg-card rounded-lg animate-pulse" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-6 bg-card rounded-lg shadow">
                  <div className="h-4 w-24 bg-background rounded animate-pulse mb-2" />
                  <div className="h-8 w-16 bg-background rounded animate-pulse" />
                </div>
              ))}
            </div>
            <div className="p-8 bg-card rounded-lg shadow">
              <div className="h-7 w-40 bg-background rounded animate-pulse mb-4" />
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-background rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          </div>
          <div className="p-8 bg-card rounded-lg shadow lg:col-span-1">
            <div className="h-7 w-40 bg-background rounded animate-pulse mb-4" />
            <div className="h-48 bg-background rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
