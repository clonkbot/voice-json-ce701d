import { useMemo } from 'react';

interface VoiceWaveformProps {
  isActive: boolean;
  audioLevel: number;
}

export function VoiceWaveform({ isActive, audioLevel }: VoiceWaveformProps) {
  const bars = useMemo(() => Array.from({ length: 32 }, (_, i) => i), []);

  return (
    <div className="relative h-24 sm:h-32 flex items-center justify-center gap-[2px] sm:gap-1 px-2 sm:px-4">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `
          linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)
        `,
        backgroundSize: '20px 20px',
      }} />

      {bars.map((i) => {
        // Create varied heights based on position (center taller)
        const centerDistance = Math.abs(i - 15.5) / 15.5;
        const baseHeight = 1 - centerDistance * 0.7;

        // Add audio reactivity
        const audioMultiplier = isActive ? (1 + audioLevel * 2) : 0.3;
        const randomOffset = Math.sin(i * 0.5) * 0.2;
        const height = Math.max(0.1, (baseHeight + randomOffset) * audioMultiplier);

        return (
          <div
            key={i}
            className="relative flex-1 max-w-2 sm:max-w-3 transition-all duration-75"
            style={{
              height: `${height * 100}%`,
            }}
          >
            <div
              className={`absolute inset-0 rounded-full transition-all duration-75 ${
                isActive
                  ? 'bg-gradient-to-t from-cyan-600 via-cyan-400 to-cyan-200'
                  : 'bg-gradient-to-t from-cyan-900/50 via-cyan-700/30 to-cyan-500/20'
              }`}
              style={{
                animationDelay: `${i * 50}ms`,
                boxShadow: isActive ? '0 0 10px rgba(0, 255, 255, 0.5)' : 'none',
              }}
            />
            {isActive && (
              <div
                className="absolute inset-0 rounded-full bg-cyan-400/30 blur-sm animate-pulse"
                style={{ animationDelay: `${i * 30}ms` }}
              />
            )}
          </div>
        );
      })}

      {/* Center indicator */}
      <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 rounded-full transition-all duration-300 ${
        isActive
          ? 'bg-cyan-400 shadow-[0_0_20px_rgba(0,255,255,0.8)]'
          : 'bg-cyan-500/30'
      }`}>
        {isActive && (
          <div className="absolute inset-0 rounded-full bg-cyan-400 animate-ping opacity-50" />
        )}
      </div>

      {/* Side indicators */}
      <div className={`absolute left-2 top-1/2 -translate-y-1/2 text-[8px] sm:text-[10px] font-mono transition-colors ${
        isActive ? 'text-cyan-400' : 'text-cyan-500/30'
      }`}>
        [IN]
      </div>
      <div className={`absolute right-2 top-1/2 -translate-y-1/2 text-[8px] sm:text-[10px] font-mono transition-colors ${
        isActive ? 'text-amber-400' : 'text-amber-500/30'
      }`}>
        [REC]
      </div>
    </div>
  );
}
