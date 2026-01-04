import { useState, useEffect } from 'react';
import { Clock, Trash2, Plus } from 'lucide-react';
import { db } from '../lib/db'; // Importamos la DB local
import type { Song, LyricSync } from '../types';

interface SyncPanelProps {
  song: Song | null;
  currentTime: number;
  onSyncsChange: () => void;
  selectedLineFromEditor?: number;
}

export function SyncPanel({ song, currentTime, onSyncsChange, selectedLineFromEditor }: SyncPanelProps) {
  const [syncs, setSyncs] = useState<LyricSync[]>([]);
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    if (song) {
      loadSyncs();
      // Mantenemos todas las líneas para consistencia 1:1 con el editor
      const allLines = song.content.split('\n');
      setLines(allLines);
    } else {
      setSyncs([]);
      setLines([]);
    }
  }, [song]);

  async function loadSyncs() {
    if (!song?.id) return;

    try {
      // Consulta Dexie ordenada por número de línea
      const data = await db.lyric_syncs
        .where('song_id')
        .equals(song.id)
        .sortBy('line_number');

      setSyncs(data);
    } catch (error) {
      console.error('Error al cargar syncs de Dexie:', error);
    }
  }

  async function addSync() {
    // Validamos que tengamos una canción y una línea seleccionada
    if (!song?.id || selectedLineFromEditor === undefined || selectedLineFromEditor < 0) return;

    try {
      // Buscamos si ya existe un sync para esta línea específica
      const existingSync = await db.lyric_syncs
        .where({ song_id: song.id, line_number: selectedLineFromEditor })
        .first();

      if (existingSync?.id) {
        // Si existe, actualizamos el tiempo
        await db.lyric_syncs.update(existingSync.id, { 
          timestamp: currentTime 
        });
      } else {
        // Si no existe, creamos uno nuevo
        await db.lyric_syncs.add({
          song_id: song.id,
          line_number: selectedLineFromEditor,
          timestamp: currentTime,
          created_at: Date.now()
        });
      }

      await loadSyncs();
      onSyncsChange();
    } catch (error) {
      console.error('Error al guardar sync local:', error);
    }
  }

  async function deleteSync(syncId: number) {
    try {
      await db.lyric_syncs.delete(syncId);
      await loadSyncs();
      onSyncsChange();
    } catch (error) {
      console.error('Error al borrar sync local:', error);
    }
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }

  if (!song) {
    return (
      <div className="w-72 bg-slate-50 border-l border-slate-200 p-4 flex items-center justify-center text-slate-500 text-sm">
        Selecciona una canción
      </div>
    );
  }

  return (
    <div className="w-72 bg-slate-50 border-l border-slate-200 flex flex-col h-full">
      <div className="p-4 border-b border-slate-200">
        <h3 className="text-sm font-semibold mb-3 text-slate-900 uppercase tracking-tight">Sincronización</h3>

        <div className="bg-white p-3 rounded-lg border border-slate-200 mb-4 shadow-sm">
          <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Tiempo actual</div>
          <div className="text-2xl font-mono font-bold text-blue-600">
            {formatTime(currentTime)}
          </div>
        </div>

        <div className="mb-4">
          <label className="text-xs font-medium text-slate-500 mb-1.5 block">
            Línea enfocada
          </label>
          <div className="w-full bg-slate-100 border border-slate-200 rounded-md px-3 py-2 text-xs text-slate-700 min-h-[32px] flex items-center italic">
            {selectedLineFromEditor !== undefined && lines[selectedLineFromEditor] !== undefined ? (
              <span className="not-italic font-medium text-slate-900 truncate">
                {selectedLineFromEditor + 1}. {lines[selectedLineFromEditor].trim() || <span className="text-slate-400">(Línea vacía)</span>}
              </span>
            ) : (
              "Haz clic en el editor"
            )}
          </div>
        </div>

        <button
          onClick={addSync}
          disabled={selectedLineFromEditor === undefined}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all text-sm font-semibold shadow-md active:scale-95 disabled:opacity-50 disabled:active:scale-100"
        >
          <Plus size={18} />
          Marcar Tiempo
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <h4 className="text-[10px] font-bold text-slate-400 mb-3 uppercase tracking-widest">
          Marcas Guardadas ({syncs.length})
        </h4>

        {syncs.length === 0 ? (
          <div className="text-xs text-slate-400 text-center py-12 border-2 border-dashed border-slate-200 rounded-lg">
            No hay sincronizaciones
          </div>
        ) : (
          <div className="space-y-2">
            {syncs.map((sync) => (
              <div
                key={sync.id}
                className="bg-white p-3 rounded-lg border border-slate-200 group hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Clock size={12} className="text-blue-500 flex-shrink-0" />
                      <span className="text-xs font-mono font-bold text-blue-600">
                        {formatTime(sync.timestamp)}
                      </span>
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 mb-1">
                      LÍNEA {sync.line_number + 1}
                    </div>
                    <div className="text-xs text-slate-700 truncate font-medium">
                      {lines[sync.line_number] || <span className="italic text-slate-300">Salto de línea</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => sync.id && deleteSync(sync.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 rounded-md transition-all"
                  >
                    <Trash2 size={14} className="text-slate-300 hover:text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}