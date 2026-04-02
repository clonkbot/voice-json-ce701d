interface SpeakingIndicatorProps {
  isActive: boolean;
}

export function SpeakingIndicator({ isActive }: SpeakingIndicatorProps) {
  if (!isActive) return null;

  return (
    <div className="relative border border-amber-500/30 bg-[#0d0d14]/80 backdrop-blur-sm p-4 sm:p-6 overflow-hidden animate-fade-in">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-amber-500/10 to-amber-500/5 animate-pulse" />

      <div className="relative flex items-center gap-4">
        {/* AI Eye */}
        <div className="relative w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
          <div className="absolute inset-0 rounded-full border-2 border-amber-500/50" />
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-amber-500/30 to-amber-600/10 flex items-center justify-center">
            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-amber-400 animate-pulse shadow-[0_0_15px_rgba(251,191,36,0.8)]" />
          </div>
          {/* Scanning effect */}
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-amber-400/20 to-transparent animate-scan" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-amber-400 tracking-widest uppercase font-bold">VOICE::OUTPUT</span>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-400 animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          </div>

          {/* Sound wave bars */}
          <div className="flex items-center gap-[2px] h-4 sm:h-6">
            {Array.from({ length: 24 }, (_, i) => (
              <div
                key={i}
                className="flex-1 max-w-1 bg-amber-400/60 rounded-full animate-wave"
                style={{
                  height: `${30 + Math.random() * 70}%`,
                  animationDelay: `${i * 50}ms`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-amber-400/50" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-amber-400/50" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-amber-400/50" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-amber-400/50" />
    </div>
  );
}
