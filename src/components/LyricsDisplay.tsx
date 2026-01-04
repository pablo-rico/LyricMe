import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/db';
import type { Song, LyricSync } from '../types';

interface LyricsDisplayProps {
  song: Song | null;
  currentTime: number;
  syncsVersion: number;
}

export function LyricsDisplay({ song, currentTime, syncsVersion }: LyricsDisplayProps) {
  const [syncs, setSyncs] = useState<LyricSync[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(-1);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (song) loadSyncs();
  }, [song, syncsVersion]);

  async function loadSyncs() {
    if (!song?.id) return;
    const data = await db.lyric_syncs.where('song_id').equals(song.id).sortBy('timestamp');
    setSyncs(data);
  }

  useEffect(() => {
    if (syncs.length === 0) {
      setCurrentLineIndex(-1);
      return;
    }
    let activeLineNumber = -1;
    for (let i = syncs.length - 1; i >= 0; i--) {
      if (currentTime >= syncs[i].timestamp) {
        activeLineNumber = syncs[i].line_number;
        break;
      }
    }
    setCurrentLineIndex(activeLineNumber);
  }, [currentTime, syncs]);

  useEffect(() => {
    if (currentLineIndex >= 0 && lineRefs.current[currentLineIndex]) {
      lineRefs.current[currentLineIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentLineIndex]);

  if (!song) return <div className="flex-1 flex items-center justify-center text-slate-400">Selecciona una canción</div>;

  // Lógica de procesamiento de líneas y secciones
  const lines = song.content.split('\n');
  
  return (
    <div className="flex-1 bg-slate-50 overflow-y-auto scroll-smooth">
      <div className="max-w-2xl mx-auto py-24 px-8">
        <div className="flex flex-col gap-2">
          {lines.map((line, index) => {
            const isTag = line.trim().startsWith('[') && line.trim().endsWith(']');
            const isActive = index === currentLineIndex;
            
            // Si es una etiqueta tipo [Estribillo], la renderizamos especial
            if (isTag) {
              return (
                <div 
                  key={index}
                  className="mt-8 mb-2 text-xs font-bold uppercase tracking-widest text-blue-500 border-b border-blue-100 pb-1"
                >
                  {line.trim().slice(1, -1)}
                </div>
              );
            }

            // Buscamos si esta línea pertenece a una sección para darle un fondo sutil
            // (Opcional: puedes envolver grupos en un <div> real, pero esto es más simple y efectivo)
            let isInSection = false;
            for (let i = index; i >= 0; i--) {
              if (lines[i].trim().startsWith('[') && lines[i].trim().endsWith(']')) {
                isInSection = true;
                break;
              }
            }

            return (
              <div
                key={index}
                ref={(el) => (lineRefs.current[index] = el)}
                className={`
                  transition-all duration-300 py-3 px-4 rounded-lg text-xl
                  ${isActive ? 'bg-blue-600 text-white shadow-lg scale-105 z-10' : 'text-slate-700'}
                  ${!line.trim() ? 'h-4 opacity-0' : 'opacity-100'}
                `}
              >
                {line}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}