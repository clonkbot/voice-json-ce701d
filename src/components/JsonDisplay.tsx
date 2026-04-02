import { useState, useEffect } from 'react';

interface JsonEntry {
  id: string;
  timestamp: string;
  transcript: string;
  data: Record<string, unknown>;
}

interface JsonDisplayProps {
  entry: JsonEntry;
  index: number;
  onDownload: () => void;
  onDelete: () => void;
  onSpeak: () => void;
}

export function JsonDisplay({ entry, index, onDownload, onDelete, onSpeak }: JsonDisplayProps) {
  const [displayedJson, setDisplayedJson] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  const fullJson = JSON.stringify(entry.data, null, 2);

  useEffect(() => {
    if (index === 0) {
      // Typewriter effect only for the most recent entry
      let currentIndex = 0;
      setDisplayedJson('');
      setIsTyping(true);

      const typeInterval = setInterval(() => {
        if (currentIndex < fullJson.length) {
          setDisplayedJson(fullJson.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(typeInterval);
          setIsTyping(false);
        }
      }, 8);

      return () => clearInterval(typeInterval);
    } else {
      setDisplayedJson(fullJson);
      setIsTyping(false);
    }
  }, [entry.id, fullJson, index]);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div
      className="relative border border-cyan-500/30 bg-[#0d0d14]/80 backdrop-blur-sm overflow-hidden transition-all duration-500 animate-fade-in"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 border-b border-cyan-500/20 bg-[#0a0a0f]/50">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[10px] sm:text-xs text-cyan-500/70 font-mono tracking-wider">
            {formatTime(entry.timestamp)}
          </span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={onSpeak}
            className="p-2 text-amber-400/60 hover:text-amber-400 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
            title="Speak entry"
          >
            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
          </button>
          <button
            onClick={onDownload}
            className="p-2 text-cyan-400/60 hover:text-cyan-400 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
            title="Download JSON"
          >
            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-400/60 hover:text-red-400 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
            title="Delete entry"
          >
            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Transcript preview */}
      <div className="px-3 sm:px-4 py-2 border-b border-cyan-500/10 bg-[#0a0a0f]/30">
        <div className="text-[10px] text-amber-400/50 mb-1 tracking-widest uppercase">Voice Input:</div>
        <p className="text-[10px] sm:text-xs text-cyan-300/60 truncate">{entry.transcript}</p>
      </div>

      {/* JSON content */}
      <div className="p-3 sm:p-4 overflow-x-auto">
        <pre className="text-[10px] sm:text-xs leading-relaxed">
          <code className="block whitespace-pre text-cyan-300">
            {displayedJson}
            {isTyping && <span className="animate-blink text-amber-400">|</span>}
          </code>
        </pre>
      </div>

      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400/50" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-400/50" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-400/50" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-400/50" />
    </div>
  );
}
