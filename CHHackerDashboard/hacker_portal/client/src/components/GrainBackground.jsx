export default function GrainBackground() {
  return (
    <>
      <svg className="absolute pointer-events-none w-0 h-0">
        <filter id="grainy">
          <feTurbulence type="turbulence" baseFrequency="0.5" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </svg>

      <div
        className="fixed inset-0 z-[-1] pointer-events-none"
        style={{
            filter: "url(#grainy)",
            opacity: 0.2,
            backgroundColor: "var(--background)", 
        }}
        />
    </>
  );
}