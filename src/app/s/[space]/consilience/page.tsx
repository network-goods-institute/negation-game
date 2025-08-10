import { Suspense } from "react";
import { ConsiliencePageClient } from "./ConsiliencePageClient";

function ConsilienceLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-lg w-full space-y-8">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-muted animate-pulse rounded-full mx-auto" />
          <div className="w-64 h-8 bg-muted animate-pulse rounded mx-auto" />
          <div className="w-48 h-4 bg-muted animate-pulse rounded mx-auto" />
        </div>
        <div className="flex items-center justify-center gap-3 text-muted-foreground">
          <div className="w-5 h-5 bg-muted animate-pulse rounded" />
          <span>Loading consilience interface...</span>
        </div>
      </div>
    </div>
  );
}

export default function ConsiliencePage() {
  return (
    <Suspense fallback={<ConsilienceLoading />}>
      <ConsiliencePageClient />
    </Suspense>
  );
}