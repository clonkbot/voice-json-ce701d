import { useState, useRef, useCallback, useEffect } from 'react';
import { VoiceWaveform } from './components/VoiceWaveform';
import { JsonDisplay } from './components/JsonDisplay';
import { SpeakingIndicator } from './components/SpeakingIndicator';
import './types/speech.d.ts';

interface JsonEntry {
  id: string;
  timestamp: string;
  transcript: string;
  data: Record<string, unknown>;
}

type SpeechRecognitionInstance = InstanceType<typeof SpeechRecognition>;

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [jsonEntries, setJsonEntries] = useState<JsonEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const parseVoiceToJson = useCallback((text: string): Record<string, unknown> => {
    const data: Record<string, unknown> = {
      raw_input: text,
      parsed_at: new Date().toISOString(),
      word_count: text.split(/\s+/).filter(Boolean).length,
    };

    // Parse key-value patterns like "name is John" or "age equals 25"
    const keyValuePatterns = [
      /(\w+)\s+(?:is|equals?|=)\s+["']?([^,."']+)["']?/gi,
      /(?:set|make)\s+(\w+)\s+(?:to|as)\s+["']?([^,."']+)["']?/gi,
    ];

    keyValuePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const key = match[1].toLowerCase();
        let value: string | number | boolean = match[2].trim();

        // Type conversion
        if (!isNaN(Number(value))) {
          value = Number(value);
        } else if (value.toLowerCase() === 'true') {
          value = true;
        } else if (value.toLowerCase() === 'false') {
          value = false;
        }

        data[key] = value;
      }
    });

    // Parse arrays like "items are apple, banana, orange"
    const arrayPattern = /(\w+)\s+(?:are|include|contain)\s+(.+?)(?:\.|$)/gi;
    let arrayMatch;
    while ((arrayMatch = arrayPattern.exec(text)) !== null) {
      const key = arrayMatch[1].toLowerCase();
      const items = arrayMatch[2].split(/,\s*(?:and\s+)?/).map(s => s.trim()).filter(Boolean);
      if (items.length > 1) {
        data[key] = items;
      }
    }

    return data;
  }, []);

  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 0.8;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const stopAudioAnalysis = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  const startAudioAnalysis = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

      const analyze = () => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(average / 255);

        animationFrameRef.current = requestAnimationFrame(analyze);
      };

      analyze();
    } catch (err) {
      console.error('Audio analysis error:', err);
    }
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser. Try Chrome or Edge.');
      return;
    }

    try {
      await startAudioAnalysis();

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        setTranscript(finalTranscript || interimTranscript);
      };

      recognition.onerror = (event) => {
        setError(`Recognition error: ${event.error}`);
        setIsRecording(false);
        stopAudioAnalysis();
      };

      recognition.onend = () => {
        if (isRecording) {
          recognition.start();
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);

      speak('Recording initiated. Speak your data structure.');
    } catch (err) {
      setError('Failed to start recording. Please check microphone permissions.');
      stopAudioAnalysis();
    }
  }, [isRecording, speak, startAudioAnalysis, stopAudioAnalysis]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    stopAudioAnalysis();
    setIsRecording(false);

    if (transcript.trim()) {
      const jsonData = parseVoiceToJson(transcript);
      const entry: JsonEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        transcript: transcript,
        data: jsonData,
      };

      setJsonEntries(prev => [entry, ...prev]);

      const keyCount = Object.keys(jsonData).length - 3; // Exclude metadata fields
      const response = keyCount > 0
        ? `JSON generated with ${keyCount} custom ${keyCount === 1 ? 'field' : 'fields'}. Data structure stored.`
        : 'JSON created from your voice input. Say key-value pairs for structured data.';

      speak(response);
    }

    setTranscript('');
  }, [transcript, parseVoiceToJson, speak, stopAudioAnalysis]);

  const downloadJson = useCallback((entry: JsonEntry) => {
    const blob = new Blob([JSON.stringify(entry.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voice-json-${entry.timestamp.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    speak('File downloaded.');
  }, [speak]);

  const downloadAllJson = useCallback(() => {
    if (jsonEntries.length === 0) return;

    const allData = jsonEntries.map(e => e.data);
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voice-json-all-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    speak(`Exported ${jsonEntries.length} entries.`);
  }, [jsonEntries, speak]);

  const deleteEntry = useCallback((id: string) => {
    setJsonEntries(prev => prev.filter(e => e.id !== id));
    speak('Entry deleted.');
  }, [speak]);

  useEffect(() => {
    return () => {
      stopAudioAnalysis();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      window.speechSynthesis.cancel();
    };
  }, [stopAudioAnalysis]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#e0e0e0] font-mono relative overflow-hidden flex flex-col">
      {/* Scanline overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.03]" style={{
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 255, 0.1) 2px, rgba(0, 255, 255, 0.1) 4px)',
      }} />

      {/* CRT vignette effect */}
      <div className="pointer-events-none fixed inset-0 z-40" style={{
        background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)',
      }} />

      {/* Ambient glow */}
      <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] opacity-20" style={{
        background: 'radial-gradient(ellipse at center, rgba(0, 255, 255, 0.3) 0%, transparent 70%)',
      }} />

      <div className="flex-1 relative z-10 px-4 py-6 md:px-8 md:py-12 max-w-6xl mx-auto w-full">
        {/* Header */}
        <header className="text-center mb-8 md:mb-12">
          <div className="inline-block relative">
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-cyan-300 to-amber-400 animate-pulse-glow">
              VOICE::JSON
            </h1>
            <div className="absolute -bottom-2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
          </div>
          <p className="mt-4 text-xs sm:text-sm text-cyan-500/60 tracking-[0.2em] uppercase">
            Voice-Activated Data Structure Generator v2.4.7
          </p>
        </header>

        {/* Main Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {/* Left Panel - Voice Input */}
          <div className="space-y-6">
            {/* Recording Module */}
            <div className="relative border border-cyan-500/30 bg-[#0d0d14]/80 backdrop-blur-sm p-4 sm:p-6 md:p-8">
              <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-cyan-400" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-cyan-400" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-cyan-400" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-cyan-400" />

              <div className="flex items-center gap-2 mb-6">
                <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-cyan-500/50'}`} />
                <span className="text-xs tracking-widest text-cyan-500/70 uppercase">
                  {isRecording ? 'Recording Active' : 'Standby Mode'}
                </span>
              </div>

              <VoiceWaveform isActive={isRecording} audioLevel={audioLevel} />

              <div className="mt-6 flex justify-center">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`relative group px-6 sm:px-10 py-3 sm:py-4 text-sm sm:text-base font-bold tracking-widest uppercase transition-all duration-300 min-h-[48px] ${
                    isRecording
                      ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30'
                      : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/20 hover:shadow-[0_0_30px_rgba(0,255,255,0.3)]'
                  }`}
                >
                  <span className="relative z-10">{isRecording ? '[ STOP ]' : '[ INITIATE VOICE INPUT ]'}</span>
                  {!isRecording && (
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </button>
              </div>

              {error && (
                <div className="mt-4 p-3 border border-amber-500/50 bg-amber-500/10 text-amber-400 text-xs">
                  <span className="font-bold">ERROR:</span> {error}
                </div>
              )}

              {transcript && (
                <div className="mt-6 p-3 sm:p-4 bg-[#0a0a0f] border border-cyan-500/20">
                  <div className="text-xs text-cyan-500/50 mb-2 tracking-widest">LIVE TRANSCRIPT:</div>
                  <p className="text-cyan-300 text-sm sm:text-base leading-relaxed">{transcript}<span className="animate-blink">_</span></p>
                </div>
              )}
            </div>

            {/* Speaking Indicator */}
            <SpeakingIndicator isActive={isSpeaking} />

            {/* Instructions */}
            <div className="border border-cyan-500/20 bg-[#0d0d14]/50 p-4 sm:p-6 text-xs">
              <div className="text-amber-400/70 mb-3 tracking-widest uppercase">// Voice Commands</div>
              <ul className="space-y-2 text-cyan-500/60">
                <li><span className="text-amber-400">&gt;</span> "name is John" → {`{"name": "John"}`}</li>
                <li><span className="text-amber-400">&gt;</span> "age equals 25" → {`{"age": 25}`}</li>
                <li><span className="text-amber-400">&gt;</span> "items are apple, banana" → {`{"items": [...]}`}</li>
                <li><span className="text-amber-400">&gt;</span> "active is true" → {`{"active": true}`}</li>
              </ul>
            </div>
          </div>

          {/* Right Panel - JSON Output */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs tracking-widest text-cyan-500/70 uppercase">Generated Data Structures</h2>
              {jsonEntries.length > 0 && (
                <button
                  onClick={downloadAllJson}
                  className="text-xs text-amber-400/70 hover:text-amber-400 transition-colors tracking-widest min-h-[44px] px-2 flex items-center"
                >
                  [ EXPORT ALL ]
                </button>
              )}
            </div>

            <div className="space-y-4 max-h-[400px] sm:max-h-[500px] md:max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {jsonEntries.length === 0 ? (
                <div className="border border-cyan-500/20 border-dashed bg-[#0d0d14]/30 p-6 sm:p-12 text-center">
                  <div className="text-4xl sm:text-6xl mb-4 opacity-20">{ }</div>
                  <p className="text-cyan-500/40 text-xs sm:text-sm">No JSON structures generated yet.</p>
                  <p className="text-cyan-500/30 text-xs mt-2">Initiate voice input to begin.</p>
                </div>
              ) : (
                jsonEntries.map((entry, index) => (
                  <JsonDisplay
                    key={entry.id}
                    entry={entry}
                    index={index}
                    onDownload={() => downloadJson(entry)}
                    onDelete={() => deleteEntry(entry.id)}
                    onSpeak={() => speak(`Entry contains: ${Object.keys(entry.data).filter(k => !['raw_input', 'parsed_at', 'word_count'].includes(k)).join(', ') || 'raw voice data'}`)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center border-t border-cyan-500/10 mt-auto">
        <p className="text-[10px] sm:text-xs text-cyan-500/30 tracking-wide">
          Requested by @LBallz77283 · Built by @clonkbot
        </p>
      </footer>
    </div>
  );
}

export default App;
