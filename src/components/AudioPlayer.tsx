import { useRef, useState, useEffect } from 'react';
import { Play, Pause, Upload, SkipBack, SkipForward, Settings, ChevronUp } from 'lucide-react';
import { db } from '../lib/db';
import type { Song } from '../types';
import { analyzeBPM, getWaveformData } from '../lib/bpm';

interface AudioPlayerProps {
  song: Song | null;
  onTimeUpdate: (currentTime: number) => void;
  onAudioLoaded: () => void;
}

export function AudioPlayer({ song, onTimeUpdate, onAudioLoaded }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  // Estado para el menú desplegable
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    if (song?.audioFile) {
      objectUrl = URL.createObjectURL(song.audioFile);
      setAudioUrl(objectUrl);
      setIsPlaying(false);
      setCurrentTime(0);
    } else {
      setAudioUrl(null);
      setIsPlaying(false);
    }
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [song]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      onTimeUpdate(audio.currentTime);
    };
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      onAudioLoaded();
    };
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onTimeUpdate, onAudioLoaded]);

  // Función para cambiar barLength en tiempo real
  async function updateBarLength(length: number) {
    if (!song?.id) return;
    try {
      await db.songs.update(song.id, {
        barLength: length,
        updated_at: Date.now()
      });
      // No necesitamos estado local aquí si el padre (App.tsx) reacciona a los cambios de DB
      setShowConfig(false);
    } catch (error) {
      console.error('Error actualizando barLength:', error);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !song?.id) return;
    try {
      const detectedBPM = await analyzeBPM(file);
      const waveform = await getWaveformData(file);

      await db.songs.update(song.id, {
        audioFile: file,
        bpm: detectedBPM,
        waveform: waveform,
        barLength: 8, // Default al subir
        updated_at: Date.now(),
      });
      const objectUrl = URL.createObjectURL(file);
      setAudioUrl(objectUrl);
    } catch (error) {
      console.error('Error al procesar audio:', error);
    }
  }

  const togglePlayPause = () => {
    if (!audioRef.current || !audioUrl) return;
    isPlaying ? audioRef.current.pause() : audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const skipTime = (s: number) => {
    if (audioRef.current) audioRef.current.currentTime += s;
  };

  const formatTime = (s: number) => {
    if (isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (!song) return null;

  return (
    <div className="bg-white border-t border-slate-200 p-4 relative">
      <audio ref={audioRef} src={audioUrl || undefined} />

      {!audioUrl ? (
        <div className="flex items-center justify-center gap-3">
          <span className="text-sm text-slate-500 font-medium">Archivo local no seleccionado</span>
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium">
            <Upload size={16} /> Seleccionar Audio
          </button>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto flex items-center gap-6">
          {/* Controles Principales */}
          <div className="flex items-center gap-2">
            <button onClick={() => skipTime(-5)} className="p-2 text-slate-400 hover:text-slate-600"><SkipBack size={20} /></button>
            <button onClick={togglePlayPause} className="p-3 bg-blue-600 text-white rounded-full shadow-lg">
              {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
            </button>
            <button onClick={() => skipTime(5)} className="p-2 text-slate-400 hover:text-slate-600"><SkipForward size={20} /></button>
          </div>
          <div className="flex items-center gap-2">
            {formatTime(currentTime)}
          </div>
          
          <div className="flex-1 relative flex items-center h-12 w-full mx-4">
            {/* Visualización de Waveform de fondo */}
            <div className="absolute inset-0 flex items-center justify-between gap-[2px] px-1 pointer-events-none">
              {song.waveform?.map((peak, i) => {
                const progress = (currentTime / duration) * 100;
                const isPlayed = (i / song.waveform!.length) * 100 < progress;
                return (
                  <div
                    key={i}
                    className={`flex-1 rounded-full transition-colors duration-300 ${
                      isPlayed ? 'bg-blue-500' : 'bg-slate-200'
                    }`}
                    style={{ height: `${Math.max(15, peak * 100)}%` }}
                  />
                );
              })}
            </div>

            {/* Slider Transparente encima de la onda */}
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={(e) => audioRef.current && (audioRef.current.currentTime = parseFloat(e.target.value))}
              className="absolute inset-0 w-full h-full bg-transparent appearance-none cursor-pointer z-10 accent-transparent"
              style={{
                // Ocultamos la barra del sistema pero mantenemos el thumb si lo deseas
                WebkitAppearance: 'none'
              }}
            />
          </div>

          {/* Configuración y BPM */}
          <div className="flex items-center gap-4 border-l pl-6 border-slate-100 relative">
            <div className="text-right">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Tempo</div>
              <div className="text-sm font-black text-slate-700">{song.bpm || '--'} BPM</div>
            </div>

            <div className="relative">
              <button 
                onClick={() => setShowConfig(!showConfig)}
                className={`p-2 rounded-lg transition-colors ${showConfig ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50'}`}
              >
                <Settings size={20} />
              </button>

              {/* MENU DESPLEGABLE (Configuración de Bar Length) */}
              {showConfig && (
                <div className="absolute bottom-full right-0 mb-4 bg-white border border-slate-200 shadow-xl rounded-xl p-3 w-48 z-[100] animate-in fade-in slide-in-from-bottom-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 px-2">Longitud de Compás</div>
                  <div className="grid grid-cols-1 gap-1">
                    {[1, 2, 4, 8, 16].map((len) => (
                      <button
                        key={len}
                        onClick={() => updateBarLength(len)}
                        className={`text-left px-3 py-2 rounded-md text-xs font-medium transition-all ${
                          song.barLength === len 
                            ? 'bg-blue-600 text-white' 
                            : 'hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        {len} {len === 1 ? 'Bar' : 'Bars'}
                        {len === 8 && <span className="text-[9px] opacity-70 ml-2">(Default)</span>}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-500 hover:text-blue-600">
                      <Upload size={14} /> Reemplazar Audio
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
    </div>
  );
}