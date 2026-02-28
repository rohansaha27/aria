import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/utils/cn';

const randomColors = (count: number): string[] => {
  return Array.from({ length: count }, () =>
    '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')
  );
};

export interface TubesBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  enableClickInteraction?: boolean;
}

export function TubesBackground({
  children,
  className,
  enableClickInteraction = true,
}: TubesBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [, setIsLoaded] = useState(false);
  const tubesRef = useRef<{
    tubes: { setColors: (c: string[]) => void; setLightsColors: (c: string[]) => void };
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    let cleanup: (() => void) | undefined;

    const initTubes = async () => {
      if (!canvasRef.current) return;

      try {
        const module = await import(
          // @ts-expect-error - CDN URL not in TS module resolution
          'https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js'
        );
        const TubesCursor = (module as { default: (el: HTMLCanvasElement, opts: object) => unknown }).default;

        if (!mounted) return;

        const app = TubesCursor(canvasRef.current, {
          tubes: {
            colors: ['#f967fb', '#53bc28', '#6958d5'],
            lights: {
              intensity: 200,
              colors: ['#83f36e', '#fe8a2e', '#ff008a', '#60aed5'],
            },
          },
        }) as { tubes: { setColors: (c: string[]) => void; setLightsColors: (c: string[]) => void } };

        tubesRef.current = app;
        setIsLoaded(true);

        const handleResize = () => {
          // Library may handle resize; placeholder for custom logic
        };

        window.addEventListener('resize', handleResize);

        cleanup = () => {
          window.removeEventListener('resize', handleResize);
        };
      } catch (error) {
        console.error('Failed to load TubesCursor:', error);
      }
    };

    initTubes();

    return () => {
      mounted = false;
      cleanup?.();
    };
  }, []);

  const handleClick = () => {
    if (!enableClickInteraction || !tubesRef.current) return;
    const colors = randomColors(3);
    const lightsColors = randomColors(4);
    tubesRef.current.tubes.setColors(colors);
    tubesRef.current.tubes.setLightsColors(lightsColors);
  };

  return (
    <div
      className={cn(
        'relative w-full h-full min-h-[400px] overflow-hidden bg-[var(--background)]',
        className
      )}
      onClick={handleClick}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block"
        style={{ touchAction: 'none' }}
      />
      <div className="relative z-10 w-full h-full pointer-events-none">{children}</div>
    </div>
  );
}

export default TubesBackground;
