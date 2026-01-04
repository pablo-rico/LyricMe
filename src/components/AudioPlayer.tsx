import { useRef, useState, useEffect } from 'react';
import { Play, Pause, Upload, SkipBack, SkipForward } from 'lucide-react';
import { db } from '../lib/db'; // Tu nueva configuración de Dexie
import type { Song } from '../types';
import { analyzeBPM } from '../lib/bpm';



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

  useEffect(() => {
    let objectUrl: string | null = null;

    // CAMBIO CLAVE: Usar el archivo real (audioFile) que es un Blob
    if (song?.audioFile) {
      objectUrl = URL.createObjectURL(song.audioFile);
      setAudioUrl(objectUrl);
      
      // Resetear estado del reproductor al cambiar de canción
      setIsPlaying(false);
      setCurrentTime(0);
    } else {
      setAudioUrl(null);
      setIsPlaying(false);
    }

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [song]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const time = audio.currentTime;
      setCurrentTime(time);
      onTimeUpdate(time);
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

  function togglePlayPause() {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
    isPlaying ? audio.pause() : audio.play();
    setIsPlaying(!isPlaying);
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    if (!audio) return;
    const time = parseFloat(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  }

  function skipTime(seconds: number) {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(audioRef.current.currentTime + seconds, duration));
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !song?.id) return;

    try {
      // 1. Analizar BPM (esto puede tardar 1-2 segundos)
      const detectedBPM = await analyzeBPM(file);

      // 2. Guardar archivo y BPM en Dexie
      await db.songs.update(song.id, {
        audioFile: file,
        bpm: detectedBPM, // Guardamos el dato
        updated_at: Date.now()
      });

      // 3. Actualizar UI
      const objectUrl = URL.createObjectURL(file);
      setAudioUrl(objectUrl);
      
      // Podrías pasar el BPM hacia arriba si quieres mostrarlo
      console.log("BPM Detectado:", detectedBPM);
      
    } catch (error) {
      console.error('Error al procesar audio:', error);
    }
  }

  function formatTime(seconds: number): string {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  if (!song) return null;

  return (
    <div className="bg-white border-t border-slate-200 p-4">
      <audio ref={audioRef} src={audioUrl || undefined} />

      {!audioUrl ? (
        <div className="flex items-center justify-center gap-3">
          <span className="text-sm text-slate-500 font-medium">Archivo local no seleccionado</span>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-all text-sm font-medium shadow-sm"
          >
            <Upload size={16} />
            Seleccionar Audio
          </button>
          <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
        </div>
      ) : (
        <div className="space-y-3 max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <button onClick={() => skipTime(-5)} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors" title="Retroceder 5s">
                <SkipBack size={20} />
              </button>
              <button onClick={togglePlayPause} className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md transition-transform active:scale-95">
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
              </button>
              <button onClick={() => skipTime(5)} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors" title="Adelantar 5s">
                <SkipForward size={20} />
              </button>
            </div>

            <div className="flex-1 flex items-center gap-3">
              <span className="text-xs font-mono text-slate-500 w-10 text-right">{formatTime(currentTime)}</span>
              <input type="range" min="0" max={duration || 0} value={currentTime} onChange={handleSeek} className="flex-1 h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600 hover:accent-blue-700" />
              <span className="text-xs font-mono text-slate-500 w-10">{formatTime(duration)}</span>
            </div>

            <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors" title="Reemplazar archivo">
              <Upload size={18} />
            </button>
            <label>{song.bpm} BPM</label>
            <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
          </div>
        </div>
      )}
    </div>
  );
}