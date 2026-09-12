export default function QuestionsLoading() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="h-9 w-72 bg-card rounded-lg animate-pulse mb-2" />
        <div className="h-5 w-96 bg-card rounded-lg animate-pulse mb-8" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-card p-4 rounded-lg shadow border border-border flex items-center gap-3">
              <div className="h-5 w-5 bg-background rounded animate-pulse" />
              <div className="flex-1">
                <div className="h-5 w-3/4 bg-background rounded animate-pulse mb-2" />
                <div className="h-4 w-1/3 bg-background rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
