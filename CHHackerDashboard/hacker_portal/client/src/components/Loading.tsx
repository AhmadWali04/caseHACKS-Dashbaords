import React from 'react';
import GrainBackground from './GrainBackground';
export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] relative z-10"
      style={{ backgroundColor: 'var(--background, #f8f7fc)' }}
    >
      <GrainBackground />
      {/* Animated ring */}
      <div className="relative w-20 h-20 mb-8">
        <div
          className="absolute inset-0 rounded-full border-4 border-transparent animate-spin"
          style={{
            borderTopColor: 'var(--primary, #8571b6)',
            borderRightColor: 'var(--primary, #8571b6)',
            animationDuration: '0.9s',
            animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-3 h-3 rounded-full animate-pulse"
            style={{ backgroundColor: 'var(--primary, #8571b6)', animationDuration: '1s' }}
          />
        </div>
      </div>

      <p
        className="text-2xl font-bold tracking-tight mb-2"
        style={{ color: 'var(--foreground, #1a1a2e)' }}
      >
        CaseHacks
      </p>

      <div className="flex items-center gap-1.5 mt-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full animate-bounce"
            style={{
              backgroundColor: 'var(--primary, #8571b6)',
              opacity: 0.7,
              animationDelay: `${i * 0.15}s`,
              animationDuration: '0.8s',
            }}
          />
        ))}
      </div>
    </div>
  );
}