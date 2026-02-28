import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { Upload, Mic, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const TUBE_COUNT = 15;
const SPIKE_COUNT = 120;
const SPIKE_RADIUS = 25.5;
const FFT_SIZE = 256;
const SPIKES_MAX_LENGTH = 8;

const PERSONAS = [
  { id: 'calm_narrator',     name: 'Calm Narrator',     description: 'Calm · Middle-aged · Neutral accent', color: '#3949ab' },
  { id: 'radio_host',        name: 'Radio Host',         description: 'Energetic · Young · Broadcast',       color: '#e53935' },
  { id: 'elder_storyteller', name: 'Elder Storyteller',  description: 'Warm · Elderly · Storytelling',       color: '#8e24aa' },
  { id: 'playful_kid',       name: 'Playful Kid',        description: 'Bright · Youthful · Playful energy',  color: '#00897b' },
];

const ETHNICITIES = ['Indian', 'British', 'Australian',] as const;
const EMOTIONS = ['happy', 'angry', 'sad'] as const;
const AGE_MIN = 5;
const AGE_MAX = 50;

// ─── Types ────────────────────────────────────────────────────────────────────
interface TubeConfig  { left: number; duration: number; delay: number; rotation: number; }
interface SpikeData   { angle: number; x1: number; y1: number; }
type RecordingState   = 'idle' | 'recording' | 'processing' | 'playing';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function MatchPage() {

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const tubeContainerRef = useRef<HTMLDivElement>(null);
  const coreRef          = useRef<HTMLDivElement>(null);
  const progressBarRef   = useRef<HTMLDivElement>(null);
  const currentTimeRef   = useRef<HTMLSpanElement>(null);
  const spikesRef        = useRef<Array<{ element: SVGLineElement | null; angle: number; x1: number; y1: number }>>([]);
  const tubeElementsRef  = useRef<(HTMLDivElement | null)[]>([]);

  // ── Audio refs ────────────────────────────────────────────────────────────
  const audioContextRef  = useRef<AudioContext | null>(null);
  const analyserRef      = useRef<AnalyserNode | null>(null);
  const audioRef         = useRef<HTMLAudioElement | null>(null);
  const streamRef        = useRef<MediaStream | null>(null);
  const sourceRef        = useRef<MediaElementAudioSourceNode | null>(null);   // audio element source
  const micSourceRef     = useRef<MediaStreamAudioSourceNode | null>(null);    // mic stream source
  const frequencyDataRef = useRef<Uint8Array | null>(null);
  const timeDomainDataRef= useRef<Uint8Array | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const rafRef           = useRef<number>(0);
  const progressRef      = useRef(0);

  // ── State ─────────────────────────────────────────────────────────────────
  const [isPlaying,      setIsPlaying]      = useState(false);
  const [totalTime,      setTotalTime]      = useState('--:--');
  const [personaIndex,   setPersonaIndex]   = useState(0);
  const [age,            setAge]            = useState(25);
  const [ethnicity,      setEthnicity]      = useState<(typeof ETHNICITIES)[number]>('American');
  const [emotion,        setEmotion]        = useState<(typeof EMOTIONS)[number]>('happy');
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [transcript,     setTranscript]     = useState<string | null>(null);
  const [error,          setError]          = useState<string | null>(null);

  const selectedPersona    = PERSONAS[personaIndex];
  const personaColorRef    = useRef(PERSONAS[0].color);
  const selectedPersonaRef = useRef(PERSONAS[0]);

  // Keep refs in sync so callbacks always read the latest persona without stale closures
  useEffect(() => {
    personaColorRef.current   = selectedPersona.color;
    selectedPersonaRef.current = selectedPersona;
  }, [selectedPersona]);

  // Reset state whenever the user switches persona
  useEffect(() => {
    setTranscript(null);
    setRecordingState('idle');
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  }, [personaIndex]);

  // ── Geometry ──────────────────────────────────────────────────────────────
  const tubeConfigs = useMemo<TubeConfig[]>(() => (
    Array.from({ length: TUBE_COUNT }, () => ({
      left:     Math.random() * 100,
      duration: 15 + Math.random() * 25,
      delay:    Math.random() * -40,
      rotation: -20 + Math.random() * 40,
    }))
  ), []);

  const spikeData = useMemo<SpikeData[]>(() => (
    Array.from({ length: SPIKE_COUNT }, (_, i) => {
      const angle = (i / SPIKE_COUNT) * Math.PI * 2;
      return { angle, x1: 50 + Math.cos(angle) * SPIKE_RADIUS, y1: 50 + Math.sin(angle) * SPIKE_RADIUS };
    })
  ), []);

  // ── Audio context ─────────────────────────────────────────────────────────
  const ensureAudioContext = useCallback(() => {
    if (audioContextRef.current) return audioContextRef.current;
    const ctx      = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize              = FFT_SIZE;
    analyser.smoothingTimeConstant = 0.7;
    analyserRef.current      = analyser;
    frequencyDataRef.current = new Uint8Array(analyser.frequencyBinCount);
    timeDomainDataRef.current= new Uint8Array(analyser.fftSize);

    // Create the MediaElementAudioSourceNode ONCE — Web Audio spec forbids calling
    // createMediaElementSource more than once on the same element.
    const elSrc = ctx.createMediaElementSource(audioRef.current!);
    elSrc.connect(analyser);
    analyser.connect(ctx.destination);
    sourceRef.current = elSrc;

    audioContextRef.current  = ctx;
    return ctx;
  }, []);

  // ── Animation loop ────────────────────────────────────────────────────────
  useEffect(() => {
    const core        = coreRef.current;
    const progressBar = progressBarRef.current;
    const tubeElements= tubeElementsRef.current;
    const spikes      = spikesRef.current;
    const analyser    = analyserRef.current;
    const frequencyData  = frequencyDataRef.current;
    const timeDomainData = timeDomainDataRef.current;
    const audio       = audioRef.current;

    function animate() {
      const hasAnalyser = analyser && frequencyData && timeDomainData;

      if (isPlaying && hasAnalyser && core && progressBar) {
        analyser.getByteFrequencyData(frequencyData as unknown as Uint8Array);
        analyser.getByteTimeDomainData(timeDomainData as unknown as Uint8Array);

        const binCount = frequencyData.length;
        const timeLen  = timeDomainData.length;
        let sumSquares = 0;
        for (let i = 0; i < timeLen; i++) {
          const n = (timeDomainData[i] - 128) / 128;
          sumSquares += n * n;
        }
        const rms    = Math.sqrt(sumSquares / timeLen);
        const volume = Math.min(1, 0.3 + rms * 2);

        const [r, g, b] = hexToRgb(personaColorRef.current);
        core.style.transform  = `scale(${1 + volume * 0.25})`;
        core.style.borderColor= `rgba(${r},${g},${b},${0.15 + volume * 0.25})`;
        core.style.boxShadow  = `0 0 ${60 + 40 * volume}px rgba(${r},${g},${b},${0.05 + 0.1 * volume})`;

        spikes.forEach((s, i) => {
          if (!s.element) return;
          const binIndex = Math.floor((i / SPIKE_COUNT) * binCount);
          const value    = frequencyData[binIndex] ?? 0;
          const len      = 1 + (value / 255) * SPIKES_MAX_LENGTH;
          s.element.setAttribute('x2', String(s.x1 + Math.cos(s.angle) * len));
          s.element.setAttribute('y2', String(s.y1 + Math.sin(s.angle) * len));
          s.element.style.opacity = String(0.25 + (value / 255) * 0.5);
        });

        const time = Date.now() * 0.001;
        tubeElements.forEach((tube, i) => {
          if (!tube) return;
          const drift = Math.sin(time + i) * 30;
          tube.style.filter = `blur(1px) drop-shadow(0 0 10px hsl(${180 + drift},100%,50%))`;
        });

        if (audio && !isNaN(audio.duration) && audio.duration > 0) {
          progressRef.current = (audio.currentTime / audio.duration) * 100;
          progressBar.style.width = `${progressRef.current}%`;
          const t = audio.currentTime;
          const m = Math.floor(t / 60);
          const s = Math.floor(t % 60);
          if (currentTimeRef.current)
            currentTimeRef.current.textContent = `${m}:${s.toString().padStart(2, '0')}`;
        }
      } else if (audio && progressBar && isPlaying && !hasAnalyser) {
        if (!isNaN(audio.duration) && audio.duration > 0) {
          progressRef.current = (audio.currentTime / audio.duration) * 100;
          progressBar.style.width = `${progressRef.current}%`;
        }
      }

      rafRef.current = requestAnimationFrame(animate);
    }

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying]);

  // ── Reset visualizer when idle ────────────────────────────────────────────
  useEffect(() => {
    if (isPlaying) return;
    const [r, g, b] = hexToRgb(personaColorRef.current);
    if (coreRef.current) {
      coreRef.current.style.transform  = 'scale(1)';
      coreRef.current.style.borderColor= `rgba(${r},${g},${b},0.2)`;
      coreRef.current.style.boxShadow  = `0 0 60px rgba(${r},${g},${b},0.1), inset 0 0 30px rgba(${r},${g},${b},0.05)`;
    }
    spikesRef.current.forEach((s) => {
      if (!s.element) return;
      s.element.setAttribute('x2', String(s.x1));
      s.element.setAttribute('y2', String(s.y1));
      s.element.style.opacity = '0.3';
    });
  }, [isPlaying]);

  // Update core glow when persona changes while idle
  useEffect(() => {
    if (isPlaying || !coreRef.current) return;
    const [r, g, b] = hexToRgb(selectedPersona.color);
    coreRef.current.style.borderColor= `rgba(${r},${g},${b},0.2)`;
    coreRef.current.style.boxShadow  = `0 0 60px rgba(${r},${g},${b},0.1), inset 0 0 30px rgba(${r},${g},${b},0.05)`;
  }, [selectedPersona.color, isPlaying]);

  // ── Audio element events ───────────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => { setIsPlaying(false); setRecordingState('idle'); };
    const onPause = () => setIsPlaying(false);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('pause', onPause);
    return () => {
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('pause', onPause);
    };
  }, []);

  // ── Submit recording to backend ───────────────────────────────────────────
  const submitRecording = useCallback(async (audioBlob: Blob) => {
    const form = new FormData();
    form.append('audio', audioBlob, 'recording.webm');
    form.append('personaId', selectedPersonaRef.current.id);

    try {
      const res  = await fetch('/api/transform', { method: 'POST', body: form });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const { transcript: t, audioBase64 } = data as { transcript: string; audioBase64: string };
      setTranscript(t);

      const audio = audioRef.current!;
      audio.src = `data:audio/mpeg;base64,${audioBase64}`;
      audio.load();

      const ctx = ensureAudioContext();
      if (ctx.state === 'suspended') ctx.resume();

      setRecordingState('playing');
      setIsPlaying(true);
      audio.play().catch(console.error);
    } catch (err) {
      console.error('[submitRecording]', err);
      setError('Something went wrong. Try again.');
      setRecordingState('idle');
      setIsPlaying(false);
      setTimeout(() => setError(null), 4000);
    }
  }, [ensureAudioContext]);

  // ── Mic button — two-press record/stop/submit flow ────────────────────────
  const handleMic = useCallback(async () => {
    if (recordingState === 'processing' || recordingState === 'playing') return;

    if (recordingState === 'recording') {
      // Second press: stop
      mediaRecorderRef.current?.stop();
      return;
    }

    // First press: start
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ctx = ensureAudioContext();
      if (ctx.state === 'suspended') ctx.resume();

      // Connect mic → analyser for live visualisation (not to destination — no echo)
      const micSrc = ctx.createMediaStreamSource(stream);
      micSrc.connect(analyserRef.current!);
      micSourceRef.current = micSrc;

      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        chunksRef.current = [];

        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        micSourceRef.current?.disconnect();
        micSourceRef.current = null;

        setIsPlaying(false);

        if (blob.size === 0) {
          setError('Recording too short. Try again.');
          setRecordingState('idle');
          setTimeout(() => setError(null), 4000);
          return;
        }

        setRecordingState('processing');
        submitRecording(blob);
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setRecordingState('recording');
      setIsPlaying(true);
    } catch (e) {
      console.error('Microphone access failed:', e);
      setError('Microphone access denied. Please allow mic access.');
      setTimeout(() => setError(null), 4000);
    }
  }, [recordingState, ensureAudioContext, submitRecording]);

  // ── Upload handler ─────────────────────────────────────────────────────────
  const handleUpload = useCallback(() => {
    const input = document.createElement('input');
    input.type   = 'file';
    input.accept = 'audio/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file || !audioRef.current) return;
      const audio = audioRef.current;
      audio.src = URL.createObjectURL(file);
      audio.load();
      audio.onloadedmetadata = () => {
        const d = audio.duration;
        setTotalTime(`${Math.floor(d / 60)}:${Math.floor(d % 60).toString().padStart(2, '0')}`);
      };
      setIsPlaying(false);
      setRecordingState('idle');
    };
    input.click();
  }, []);

  // ── Play / pause toggle ────────────────────────────────────────────────────
  const handlePlayToggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio?.src || recordingState === 'recording' || recordingState === 'processing') return;

    if (audio.paused) {
      const ctx = ensureAudioContext();
      if (ctx.state === 'suspended') ctx.resume();
      audio.play().catch(console.error);
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, [recordingState, ensureAudioContext]);

  // ── Derived UI labels ──────────────────────────────────────────────────────
  const micLabel: Record<RecordingState, string> = {
    idle:       'Tap to record',
    recording:  'Recording… tap to stop',
    processing: 'Transforming…',
    playing:    'Playing…',
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="match-page h-screen bg-[#050505] relative flex flex-col items-center overflow-hidden text-white">
      <audio ref={audioRef} className="hidden" />

      {/* Ambient tubes */}
      <div
        ref={tubeContainerRef}
        className="tube-container absolute w-full h-full perspective-[1000px] overflow-hidden z-0"
      >
        {tubeConfigs.map((cfg, i) => (
          <div
            key={i}
            ref={(el) => { if (el) tubeElementsRef.current[i] = el; }}
            className="tube"
            style={{
              left:             `${cfg.left}%`,
              animationDuration:`${cfg.duration}s`,
              animationDelay:   `${cfg.delay}s`,
              transform:        `rotate(${cfg.rotation}deg) rotateX(45deg)`,
            }}
          />
        ))}
      </div>
      <div className="grain" aria-hidden />

      {/* Persona label */}
      <div className="z-20 pt-[min(4vh,2rem)] text-center shrink-0 select-none pointer-events-none">
        <p
          className="text-sm font-semibold tracking-[0.3em] uppercase transition-colors duration-300"
          style={{ color: selectedPersona.color }}
        >
          {selectedPersona.name}
        </p>
        <p className="text-xs text-white/40 mt-0.5 tracking-wide">
          {selectedPersona.description}
        </p>
      </div>

      {/* Age / Ethnicity / Emotion — top right */}
      <section className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 w-[min(100vw-2rem,320px)] pointer-events-auto">
        <div className="space-y-4 rounded-xl bg-white/[0.03] border border-white/10 backdrop-blur-sm px-4 py-4 sm:px-5 sm:py-4">
          {/* Age slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <label className="text-[10px] font-medium tracking-[0.35em] text-white/40 uppercase">
                Age
              </label>
              <span className="text-xs tabular-nums text-white/60 tracking-wide">{age}</span>
            </div>
            <input
              type="range"
              min={AGE_MIN}
              max={AGE_MAX}
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              className="match-slider w-full h-1.5 appearance-none rounded-full bg-white/10 accent-white/50 focus:outline-none"
              aria-label="Age"
            />
          </div>

          {/* Ethnicity */}
          <div className="space-y-2">
            <label className="block text-[10px] font-medium tracking-[0.35em] text-white/40 uppercase">
              Ethnicity
            </label>
            <div className="flex flex-wrap gap-2">
              {ETHNICITIES.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setEthnicity(opt)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium tracking-wider uppercase transition-all duration-200 ${
                    ethnicity === opt
                      ? 'bg-white/15 border border-white/25 text-white'
                      : 'bg-white/5 border border-white/10 text-white/50 hover:text-white/70 hover:border-white/15'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Emotion */}
          <div className="space-y-2">
            <label className="block text-[10px] font-medium tracking-[0.35em] text-white/40 uppercase">
              Emotion
            </label>
            <div className="flex flex-wrap gap-2">
              {EMOTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setEmotion(opt)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium tracking-wider uppercase transition-all duration-200 ${
                    emotion === opt
                      ? 'bg-white/15 border border-white/25 text-white'
                      : 'bg-white/5 border border-white/10 text-white/50 hover:text-white/70 hover:border-white/15'
                  }`}
                >
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main visualizer */}
      <main className="flex-1 min-h-0 flex flex-col items-center justify-center w-full z-10 p-[min(4vw,1rem)] sm:p-[min(4vw,1.5rem)]">
        <div className="visualizer-wrapper relative flex items-center justify-center shrink-0 max-w-full max-h-full">
          <div className="absolute w-[120%] h-[120%] rounded-full border border-cyan-500/5 animate-[ping_4s_linear_infinite]" />
          <div className="absolute w-full h-full rounded-full border border-purple-500/5 animate-[ping_6s_linear_infinite_reverse]" />

          <svg className="spike-svg w-full h-full" viewBox="0 0 100 100">
            <g transform="rotate(-90 50 50)">
              {spikeData.map((s, i) => (
                <line
                  key={i}
                  ref={(el) => {
                    if (el) spikesRef.current[i] = { angle: s.angle, x1: s.x1, y1: s.y1, element: el };
                  }}
                  x1={s.x1} y1={s.y1} x2={s.x1} y2={s.y1}
                  stroke="var(--neon-primary)"
                  strokeWidth="0.3"
                  strokeLinecap="round"
                  style={{ opacity: 0.3, transition: 'all 0.15s cubic-bezier(0.4,0,0.2,1)' }}
                />
              ))}
            </g>
          </svg>

          <div
            ref={coreRef}
            id="visualizerCore"
            className={`visualizer-core${recordingState === 'processing' ? ' core-breathing' : ''}`}
          />
        </div>
      </main>

      {/* Controls */}
      <section className="w-full max-w-2xl z-40 shrink-0 pb-[min(4vh,2rem)] px-[min(5vw,2.5rem)] pt-2">
        <div className="space-y-[min(3vh,1.5rem)] sm:space-y-6">

          {/* Progress bar */}
          <div className="space-y-2 sm:space-y-4">
            <div className="relative w-full h-[1px] bg-white/10">
              <div
                ref={progressBarRef}
                className="absolute top-0 left-0 h-full w-0 bg-cyan-400 progress-bar-glow transition-all duration-300"
              />
            </div>
            <div className="flex justify-between text-[clamp(0.5rem,2vmin,0.625rem)] tracking-[0.4em] font-medium text-white/30 uppercase">
              <span ref={currentTimeRef}>0:00</span>
              <span>{totalTime}</span>
            </div>
          </div>

          {/* Button row */}
          <div className="flex items-center justify-between gap-2">

            {/* Left: Upload + Mic */}
            <div className="flex items-center gap-[min(4vw,2rem)] sm:gap-8">
              <button
                type="button"
                onClick={handleUpload}
                className="nav-btn flex items-center justify-center p-[min(1.5vw,0.5rem)]"
                aria-label="Upload audio"
              >
                <Upload className="w-[clamp(1rem,4vmin,1.25rem)] h-[clamp(1rem,4vmin,1.25rem)]" />
              </button>

              <button
                type="button"
                onClick={handleMic}
                disabled={recordingState === 'processing'}
                className={[
                  'nav-btn flex items-center justify-center p-[min(1.5vw,0.5rem)] relative',
                  recordingState === 'recording'  ? 'text-red-500 opacity-100 recording-pulse' : '',
                  recordingState === 'processing' ? 'opacity-30 pointer-events-none' : '',
                ].join(' ')}
                aria-label={micLabel[recordingState]}
              >
                <Mic className="w-[clamp(1rem,4vmin,1.25rem)] h-[clamp(1rem,4vmin,1.25rem)]" />
              </button>
            </div>

            {/* Center: Prev / Play / Next */}
            <div className="flex items-center gap-[min(6vw,3rem)] sm:gap-12">
              <button
                type="button"
                className="nav-btn p-[min(1.5vw,0.5rem)]"
                aria-label="Previous persona"
                onClick={() => setPersonaIndex((i) => (i - 1 + PERSONAS.length) % PERSONAS.length)}
              >
                <ChevronLeft className="w-[clamp(1.5rem,6vmin,2rem)] h-[clamp(1.5rem,6vmin,2rem)]" />
              </button>

              <button
                type="button"
                id="btn-play-toggle"
                onClick={handlePlayToggle}
                className="w-[min(18vw,6rem)] h-[min(18vw,6rem)] min-w-[3.5rem] min-h-[3.5rem] rounded-full glass-panel flex items-center justify-center text-cyan-400 hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(0,242,255,0.1)] group bg-white/5 backdrop-blur-[40px] border border-white/5"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying
                  ? <Pause className="w-[clamp(2rem,8vmin,2.5rem)] h-[clamp(2rem,8vmin,2.5rem)] group-hover:drop-shadow-[0_0_10px_rgba(0,242,255,0.8)]" />
                  : <Play  className="w-[clamp(2rem,8vmin,2.5rem)] h-[clamp(2rem,8vmin,2.5rem)] ml-0.5 group-hover:drop-shadow-[0_0_10px_rgba(0,242,255,0.8)]" />
                }
              </button>

              <button
                type="button"
                className="nav-btn p-[min(1.5vw,0.5rem)]"
                aria-label="Next persona"
                onClick={() => setPersonaIndex((i) => (i + 1) % PERSONAS.length)}
              >
                <ChevronRight className="w-[clamp(1.5rem,6vmin,2rem)] h-[clamp(1.5rem,6vmin,2rem)]" />
              </button>
            </div>

            {/* Right: status label */}
            <div className="w-[min(18vw,6rem)] min-w-[3.5rem] text-right">
              <span className="text-[10px] tracking-widest uppercase text-white/30 leading-tight">
                {micLabel[recordingState]}
              </span>
            </div>
          </div>

          {/* Transcript */}
          <div
            className="text-center space-y-1 transition-all duration-500"
            style={{ opacity: transcript ? 1 : 0, minHeight: '4rem' }}
          >
            {transcript && (
              <>
                <p className="text-[10px] text-white/40 uppercase tracking-[0.3em]">You said</p>
                <p className="text-sm text-white/70 leading-snug">{transcript}</p>
                <p className="text-[10px] uppercase tracking-[0.3em] mt-2" style={{ color: selectedPersona.color }}>
                  Aria says
                </p>
                <p className="text-sm leading-snug" style={{ color: selectedPersona.color }}>{transcript}</p>
              </>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="text-center text-xs text-red-400 tracking-wide animate-pulse">
              {error}
            </p>
          )}

        </div>
      </section>
    </div>
  );
}
