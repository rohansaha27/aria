import { useState, useMemo } from 'react';
import { TubesBackground } from '@/components/TubesBackground';
import { Mic, Sparkles } from 'lucide-react';

const DEFAULT_GLOW = '#f967fb';

export default function App() {
  const [tubeColors, setTubeColors] = useState<string[]>([DEFAULT_GLOW]);
  const glowColor = tubeColors[0] ?? DEFAULT_GLOW;

  const glowStyle = useMemo(() => {
    const r = parseInt(glowColor.slice(1, 3), 16);
    const g = parseInt(glowColor.slice(3, 5), 16);
    const b = parseInt(glowColor.slice(5, 7), 16);
    const shadow = `0 0 20px ${glowColor}, 0 0 40px rgba(${r},${g},${b},0.5), 0 0 60px rgba(${r},${g},${b},0.3)`;
    return {
      boxShadow: shadow,
      textShadow: `0 0 10px ${glowColor}, 0 0 20px rgba(${r},${g},${b},0.6)`,
    };
  }, [glowColor]);

  return (
    <div className="w-full min-h-screen font-sans">
      <TubesBackground enableClickInteraction={true} onTubeColorsChange={setTubeColors}>
        <div className="flex flex-col items-center justify-center w-full min-h-screen gap-5 text-center px-4">
          <div className="space-y-3 pointer-events-auto cursor-default">
            <h1 className="text-6xl md:text-8xl font-bold tracking-tighter text-white drop-shadow-[0_0_24px_rgba(0,0,0,0.9)] select-none">
              aria
            </h1>
            <p className="text-lg md:text-xl text-white/80 max-w-md mx-auto drop-shadow-md">
              Your voice reimagined — accents, emotions, ages, and languages with 3D audio.
            </p>
          </div>

          <div className="mt-0 flex flex-col items-center pointer-events-auto">
            <button
              type="button"
              style={glowStyle}
              className="px-8 py-3.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border rounded-full text-white text-sm font-medium uppercase tracking-widest transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-transparent transition-[box-shadow,text-shadow] duration-500 border-white/20 hover:border-white/40"
            >
              Begin
            </button>
          </div>

          <div className="absolute bottom-8 flex flex-col items-center gap-2 text-white/40 text-xs uppercase tracking-widest pointer-events-none">
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4" />
              <span>ListenHacks ’26</span>
              <Sparkles className="w-4 h-4" />
            </div>
            <span>Click to randomize colors</span>
          </div>
        </div>
      </TubesBackground>
    </div>
  );
}
