import { TubesBackground } from '@/components/TubesBackground';
import { Mic, Sparkles } from 'lucide-react';

export default function App() {
  return (
    <div className="w-full min-h-screen font-sans">
      <TubesBackground enableClickInteraction={true}>
        <div className="flex flex-col items-center justify-center w-full min-h-screen gap-8 text-center px-4">
          <div className="space-y-3 pointer-events-auto cursor-default">
            <h1 className="text-6xl md:text-8xl font-bold tracking-tighter text-white drop-shadow-[0_0_24px_rgba(0,0,0,0.9)] select-none">
              aria
            </h1>
            <p className="text-lg md:text-xl text-white/80 max-w-md mx-auto drop-shadow-md">
              Your voice reimagined — accents, emotions, ages, and languages with 3D audio.
            </p>
          </div>

          <div className="mt-4 flex flex-col items-center gap-4 pointer-events-auto">
            <p className="text-white/70 text-sm max-w-sm drop-shadow-md">
              Move your cursor to interact with the tubes. Click anywhere to randomize the neon colors.
            </p>
            <div className="flex items-center gap-2 text-white/50 text-xs uppercase tracking-widest">
              <Mic className="w-4 h-4" />
              <span>ListenHacks ’26</span>
              <Sparkles className="w-4 h-4" />
            </div>
          </div>

          <div className="absolute bottom-8 flex flex-col items-center gap-2 text-white/40 text-xs uppercase tracking-widest pointer-events-none">
            <span>Click to randomize colors</span>
          </div>
        </div>
      </TubesBackground>
    </div>
  );
}
