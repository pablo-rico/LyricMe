import { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../lib/db';
import { Zap, ZapOff, Eye, EyeOff } from 'lucide-react'; // Añadimos Eye para visibilidad
import type { Song, LyricSync } from '../types';

interface LyricsDisplayProps {
  song: Song | null;
  currentTime: number;
  syncsVersion: number;
}

export function LyricsDisplay({ song, currentTime, syncsVersion }: LyricsDisplayProps) {
  const [manualSyncs, setManualSyncs] = useState<LyricSync[]>([]);
  const [isBpmEnabled, setIsBpmEnabled] = useState(true);
  const [highVisibility, setHighVisibility] = useState(false); // Estado para visibilidad total
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (song) loadSyncs();
  }, [song, syncsVersion]);

  async function loadSyncs() {
    if (!song?.id) return;
    const data = await db.lyric_syncs
      .where('song_id')
      .equals(song.id)
      .sortBy('line_number');
    setManualSyncs(data);
  }

  const computedSyncs = useMemo(() => {
    if (!song) return [];
    const lines = song.content.split('\n');
    
    // Calculamos la duración de 1 intervalo (según barLength)
    const secondsPerInterval = (isBpmEnabled && song.bpm) ? (60 / song.bpm) * (song.barLength ?? 8) : 0;
    
    const syncMap = new Map(manualSyncs.map(s => [s.line_number, s.timestamp]));
    
    let currentAnchorTime = -1;
    let currentAnchorLine = -1;

    return lines.map((_, index) => {
      // Si esta línea tiene una marca manual, actualizamos el "Ancla"
      if (syncMap.has(index)) {
        currentAnchorTime = syncMap.get(index)!;
        currentAnchorLine = index;
        return { timestamp: currentAnchorTime, is_auto: false };
      }

      // Si no tiene marca, pero tenemos un ancla previa y el BPM activo
      if (secondsPerInterval > 0 && currentAnchorTime !== -1) {
        const linesSinceLastAnchor = index - currentAnchorLine;
        
        return { 
          // Referencia SIEMPRE relativa a la ULTIMA marca encontrada
          timestamp: currentAnchorTime + (linesSinceLastAnchor * secondsPerInterval),
          is_auto: true 
        };
      }

      // Si aún no hemos encontrado la primera marca manual
      return { timestamp: 999999, is_auto: false };
    });
  }, [song?.content, song?.bpm, song?.barLength, manualSyncs, isBpmEnabled]);

  const currentLineIndex = useMemo(() => {
    let activeIndex = -1;
    for (let i = computedSyncs.length - 1; i >= 0; i--) {
      if (currentTime >= computedSyncs[i].timestamp) {
        activeIndex = i;
        break;
      }
    }
    return activeIndex;
  }, [currentTime, computedSyncs]);

  useEffect(() => {
    if (currentLineIndex >= 0) {
      lineRefs.current[currentLineIndex]?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  }, [currentLineIndex]);

  if (!song) return null;
  const lines = song.content.split('\n');

  return (
    <div className="relative flex-1 bg-[#0a0c10] overflow-y-auto scroll-smooth">
      
      {/* GRUPO DE BOTONES FLOTANTES */}
      <div className="fixed bottom-24 right-8 z-50 flex flex-col gap-4">
        
        {/* BOTÓN 1: Alta Visibilidad */}
        <button
          onClick={() => setHighVisibility(!highVisibility)}
          className={`p-4 rounded-full shadow-2xl transition-all duration-500 ease-in-out flex items-center group h-14 ${
            highVisibility 
              ? 'bg-emerald-600 text-white hover:bg-emerald-500' 
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          <div className="flex-shrink-0">
            {highVisibility ? <Eye size={22} /> : <EyeOff size={22} />}
          </div>
          <span className="max-w-0 overflow-hidden transition-all duration-500 ease-in-out group-hover:max-w-[200px] whitespace-nowrap">
            <span className="pl-3 text-xs font-black uppercase tracking-[0.15em]">
              {highVisibility ? "Visibilidad ON" : "Modo Enfoque"}
            </span>
          </span>
        </button>

        {/* BOTÓN 2: Toggle BPM */}
        <button
          onClick={() => setIsBpmEnabled(!isBpmEnabled)}
          className={`p-4 rounded-full shadow-2xl transition-all duration-500 ease-in-out flex items-center group h-14 ${
            isBpmEnabled 
              ? 'bg-blue-600 text-white hover:bg-blue-500' 
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          <div className="flex-shrink-0">
            {isBpmEnabled ? <Zap size={22} fill="currentColor" /> : <ZapOff size={22} />}
          </div>
          <span className="max-w-0 overflow-hidden transition-all duration-500 ease-in-out group-hover:max-w-[200px] whitespace-nowrap">
            <span className="pl-3 text-xs font-black uppercase tracking-[0.15em]">
              {isBpmEnabled ? "Smart Sync ON" : "Manual Mode"}
            </span>
          </span>
        </button>
      </div>

      {/* CONTENIDO DE LA LETRA */}
      <div className="max-w-4xl mx-auto py-60 px-12">
        {lines.map((line, index) => {
          const isActive = index === currentLineIndex;
          const isTag = line.trim().startsWith('[') && line.trim().endsWith(']');
          const isCalculated = computedSyncs[index]?.is_auto;

          if (isTag) {
            return (
              <div 
                key={index} 
                className="mt-16 mb-6 text-blue-500/80 font-black tracking-[0.2em] uppercase text-xs border-l-2 border-blue-500/30 pl-4 py-1"
              >
                {line.slice(1, -1)}
              </div>
            );
          }

          return (
            <div
              key={index}
              ref={(el) => (lineRefs.current[index] = el)}
              className={`
                transition-all duration-700 ease-out py-6 px-8 rounded-2xl mb-4 text-4xl font-bold tracking-tight
                ${isActive 
                  ? 'text-white bg-white/5 shadow-[0_0_40px_-15px_rgba(59,130,246,0.5)] opacity-100 scale-100 translate-x-4' 
                  : highVisibility 
                    ? 'text-white opacity-60 scale-95 translate-x-0' // Modo Blanco Visible
                    : 'text-slate-700 opacity-20 scale-95 translate-x-0' // Modo Enfoque Oscuro
                }
              `}
            >
              <div className="flex items-center gap-4">
                <span>{line || '...'}</span>
                {isActive && isCalculated && (
                  <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-1 rounded uppercase tracking-tighter animate-pulse">
                    Auto
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}