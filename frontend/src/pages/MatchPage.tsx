import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { Upload, Mic, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';

const TUBE_COUNT = 15;
const SPIKE_COUNT = 120;
const SPIKE_RADIUS = 25.5;
const FFT_SIZE = 256;
const SPIKES_MAX_LENGTH = 8;

interface TubeConfig {
  left: number;
  duration: number;
  delay: number;
  rotation: number;
}

interface SpikeData {
  angle: number;
  x1: number;
  y1: number;
}

export default function MatchPage() {
  const tubeContainerRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const spikesRef = useRef<Array<{ element: SVGLineElement | null; angle: number; x1: number; y1: number }>>([]);
  const tubeElementsRef = useRef<(HTMLDivElement | null)[]>([]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | MediaStreamAudioSourceNode | null>(null);
  const frequencyDataRef = useRef<Uint8Array | null>(null);
  const timeDomainDataRef = useRef<Uint8Array | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [totalTime, setTotalTime] = useState('--:--');
  const currentTimeRef = useRef<HTMLSpanElement>(null);
  const progressRef = useRef(0);
  const rafRef = useRef<number>(0);

  const tubeConfigs = useMemo<TubeConfig[]>(() => {
    return Array.from({ length: TUBE_COUNT }, () => ({
      left: Math.random() * 100,
      duration: 15 + Math.random() * 25,
      delay: Math.random() * -40,
      rotation: -20 + Math.random() * 40,
    }));
  }, []);

  const spikeData = useMemo<SpikeData[]>(() => {
    return Array.from({ length: SPIKE_COUNT }, (_, i) => {
      const angle = (i / SPIKE_COUNT) * Math.PI * 2;
      return {
        angle,
        x1: 50 + Math.cos(angle) * SPIKE_RADIUS,
        y1: 50 + Math.sin(angle) * SPIKE_RADIUS,
      };
    });
  }, []);

  const ensureAudioContext = useCallback(() => {
    if (audioContextRef.current) return audioContextRef.current;
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = 0.7;
    analyserRef.current = analyser;
    frequencyDataRef.current = new Uint8Array(analyser.frequencyBinCount);
    timeDomainDataRef.current = new Uint8Array(analyser.fftSize);
    audioContextRef.current = ctx;
    return ctx;
  }, []);

  useEffect(() => {
    const core = coreRef.current;
    const progressBar = progressBarRef.current;
    const tubeElements = tubeElementsRef.current;
    const spikes = spikesRef.current;
    const analyser = analyserRef.current;
    const frequencyData = frequencyDataRef.current;
    const timeDomainData = timeDomainDataRef.current;
    const audio = audioRef.current;

    function animate() {
      const hasAnalyser = analyser && frequencyData && timeDomainData;

      if (isPlaying && hasAnalyser && core && progressBar) {
        analyser.getByteFrequencyData(frequencyData as unknown as Uint8Array);
        analyser.getByteTimeDomainData(timeDomainData as unknown as Uint8Array);

        const binCount = frequencyData.length;
        const timeLen = timeDomainData.length;
        let sumSquares = 0;
        for (let i = 0; i < timeLen; i++) {
          const n = (timeDomainData[i] - 128) / 128;
          sumSquares += n * n;
        }
        const rms = Math.sqrt(sumSquares / timeLen);
        const volume = Math.min(1, 0.3 + rms * 2);

        core.style.transform = `scale(${1 + volume * 0.25})`;
        core.style.borderColor = `rgba(0, 242, 255, ${0.15 + volume * 0.25})`;
        core.style.boxShadow = `0 0 ${60 + 40 * volume}px rgba(0, 242, 255, ${0.05 + 0.1 * volume})`;

        spikes.forEach((s, i) => {
          if (!s.element) return;
          const binIndex = Math.floor((i / SPIKE_COUNT) * binCount);
          const value = frequencyData[binIndex] ?? 0;
          const len = 1 + (value / 255) * SPIKES_MAX_LENGTH;
          const x2 = s.x1 + Math.cos(s.angle) * len;
          const y2 = s.y1 + Math.sin(s.angle) * len;
          s.element.setAttribute('x2', String(x2));
          s.element.setAttribute('y2', String(y2));
          s.element.style.opacity = String(0.25 + (value / 255) * 0.5);
        });

        const time = Date.now() * 0.001;
        tubeElements.forEach((tube, i) => {
          if (!tube) return;
          const drift = Math.sin(time + i) * 30;
          tube.style.filter = `blur(1px) drop-shadow(0 0 10px hsl(${180 + drift}, 100%, 50%))`;
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

  useEffect(() => {
    if (!isPlaying && coreRef.current) {
      coreRef.current.style.transform = 'scale(1)';
      coreRef.current.style.borderColor = 'rgba(0, 242, 255, 0.2)';
      coreRef.current.style.boxShadow =
        '0 0 60px rgba(0, 242, 255, 0.1), inset 0 0 30px rgba(0, 242, 255, 0.05)';
    }
    if (!isPlaying) {
      spikesRef.current.forEach((s) => {
        if (!s.element) return;
        s.element.setAttribute('x2', String(s.x1));
        s.element.setAttribute('y2', String(s.y1));
        s.element.style.opacity = '0.3';
      });
    }
  }, [isPlaying]);

  const handlePlayToggle = useCallback(() => {
    const audio = audioRef.current;
    const isFileMode = audio?.src && !micActive;

    if (isFileMode && audio) {
      if (audio.paused) {
        const ctx = ensureAudioContext();
        if (ctx.state === 'suspended') ctx.resume();
        if (!sourceRef.current) {
          const source = ctx.createMediaElementSource(audio);
          source.connect(analyserRef.current!);
          analyserRef.current!.connect(ctx.destination);
          sourceRef.current = source;
        }
        audio.play().catch(console.error);
        setIsPlaying(true);
      } else {
        audio.pause();
        setIsPlaying(false);
      }
      return;
    }

    if (micActive) {
      setIsPlaying((p) => !p);
    }
  }, [micActive, ensureAudioContext]);

  const handleUpload = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file || !audioRef.current) return;
      const url = URL.createObjectURL(file);
      const audio = audioRef.current;
      audio.src = url;
      audio.load();
      audio.onloadedmetadata = () => {
        const d = audio.duration;
        const m = Math.floor(d / 60);
        const s = Math.floor(d % 60);
        setTotalTime(`${m}:${s.toString().padStart(2, '0')}`);
      };
      setIsPlaying(false);
    };
    input.click();
  }, []);

  const handleMic = useCallback(async () => {
    if (micActive) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      sourceRef.current = null;
      setMicActive(false);
      setIsPlaying(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = ensureAudioContext();
      if (ctx.state === 'suspended') ctx.resume();
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyserRef.current!);
      sourceRef.current = source;
      setMicActive(true);
      setIsPlaying(true);
    } catch (e) {
      console.error('Microphone access failed:', e);
    }
  }, [micActive, ensureAudioContext]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => setIsPlaying(false);
    const onPause = () => setIsPlaying(false);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('pause', onPause);
    return () => {
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('pause', onPause);
    };
  }, []);

  return (
    <div className="match-page h-screen bg-[#050505] relative flex flex-col items-center overflow-hidden text-white">
      <audio ref={audioRef} className="hidden" />
      {/* Ambient Tubes */}
      <div
        ref={tubeContainerRef}
        className="tube-container absolute w-full h-full perspective-[1000px] overflow-hidden z-0"
      >
        {tubeConfigs.map((cfg, i) => (
          <div
            key={i}
            ref={(el) => {
              if (el) tubeElementsRef.current[i] = el;
            }}
            className="tube"
            style={{
              left: `${cfg.left}%`,
              animationDuration: `${cfg.duration}s`,
              animationDelay: `${cfg.delay}s`,
              transform: `rotate(${cfg.rotation}deg) rotateX(45deg)`,
            }}
          />
        ))}
      </div>
      <div className="grain" aria-hidden />

      {/* Main Visualizer */}
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
                  x1={s.x1}
                  y1={s.y1}
                  x2={s.x1}
                  y2={s.y1}
                  stroke="var(--neon-primary)"
                  strokeWidth="0.3"
                  strokeLinecap="round"
                  style={{ opacity: 0.3, transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)' }}
                />
              ))}
            </g>
          </svg>

          <div ref={coreRef} id="visualizerCore" className="visualizer-core" />
        </div>
      </main>

      {/* Controls */}
      <section className="w-full max-w-2xl z-40 shrink-0 pb-[min(4vh,2rem)] px-[min(5vw,2.5rem)] pt-2">
        <div className="space-y-[min(4vh,2rem)] sm:space-y-8">
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

          <div className="flex items-center justify-between gap-2">
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
                className={`nav-btn flex items-center justify-center p-[min(1.5vw,0.5rem)] ${micActive ? 'text-red-500 opacity-100' : ''}`}
                aria-label="Microphone"
              >
                <Mic className="w-[clamp(1rem,4vmin,1.25rem)] h-[clamp(1rem,4vmin,1.25rem)]" />
              </button>
            </div>

            <div className="flex items-center gap-[min(6vw,3rem)] sm:gap-12">
              <button type="button" className="nav-btn p-[min(1.5vw,0.5rem)]" aria-label="Previous">
                <ChevronLeft className="w-[clamp(1.5rem,6vmin,2rem)] h-[clamp(1.5rem,6vmin,2rem)]" />
              </button>
              <button
                type="button"
                id="btn-play-toggle"
                onClick={handlePlayToggle}
                className="w-[min(18vw,6rem)] h-[min(18vw,6rem)] min-w-[3.5rem] min-h-[3.5rem] rounded-full glass-panel flex items-center justify-center text-cyan-400 hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(0,242,255,0.1)] group bg-white/5 backdrop-blur-[40px] border border-white/5"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-[clamp(2rem,8vmin,2.5rem)] h-[clamp(2rem,8vmin,2.5rem)] group-hover:drop-shadow-[0_0_10px_rgba(0,242,255,0.8)]" />
                ) : (
                  <Play className="w-[clamp(2rem,8vmin,2.5rem)] h-[clamp(2rem,8vmin,2.5rem)] ml-0.5 group-hover:drop-shadow-[0_0_10px_rgba(0,242,255,0.8)]" />
                )}
              </button>
              <button type="button" className="nav-btn p-[min(1.5vw,0.5rem)]" aria-label="Next">
                <ChevronRight className="w-[clamp(1.5rem,6vmin,2rem)] h-[clamp(1.5rem,6vmin,2rem)]" />
              </button>
            </div>

            <div className="w-[min(18vw,6rem)] min-w-[3.5rem]" aria-hidden />
          </div>
        </div>
      </section>
    </div>
  );
}
