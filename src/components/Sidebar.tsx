import { useState } from 'react';
import { Plus, FileText, Trash2, Eye, Edit } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks'; // Hook para reactividad automática
import { db } from '../lib/db';
import type { Song } from '../types';

interface SidebarProps {
  selectedSongId: number | null; // Cambiado a number para coincidir con Dexie
  onSelectSong: (songId: number) => void;
  onSongsChange: () => void;
  onChangeViewMode: (mode: 'edit' | 'perform') => void;
}

export function Sidebar({ selectedSongId, onSelectSong, onSongsChange, onChangeViewMode }: SidebarProps) {
  const [viewMode, setViewMode] = useState<'edit' | 'perform'>('edit');

  // useLiveQuery observa la base de datos y actualiza 'songs' automáticamente
  // Equivale al SELECT * de SQL pero en tiempo real
  const songs = useLiveQuery(
    () => db.songs.orderBy('updated_at').reverse().toArray(),
    []
  );

  const loading = songs === undefined;

  async function createNewSong() {
    try {
      const newId = await db.songs.add({
        title: 'Nueva Canción',
        content: '',
        created_at: Date.now(),
        updated_at: Date.now()
      });

      if (newId) {
        onSelectSong(newId as number);
        onSongsChange();
      }
    } catch (error) {
      console.error('Error al crear canción local:', error);
    }
  }

  async function deleteSong(songId: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('¿Eliminar esta canción y sus sincronizaciones?')) return;

    try {
      // Usamos una transacción para asegurar que se borre todo o nada
      await db.transaction('rw', [db.songs, db.lyric_syncs], async () => {
        // Borramos las sincronizaciones asociadas (Simulando ON DELETE CASCADE)
        await db.lyric_syncs.where('song_id').equals(songId).delete();
        // Borramos la canción
        await db.songs.delete(songId);
      });

      if (selectedSongId === songId) {
        // Seleccionamos la primera canción disponible si borramos la activa
        const firstSong = await db.songs.toCollection().first();
        onSelectSong(firstSong?.id || 0);
      }
      onSongsChange();
    } catch (error) {
      console.error('Error al eliminar:', error);
    }
  }

  if (loading) {
    return (
      <div className="w-60 bg-white border-r border-slate-200 p-4 flex items-center justify-center">
        <div className="text-xs text-slate-400">Cargando base de datos local...</div>
      </div>
    );
  }

  return (
    <div className="w-60 bg-white border-r border-slate-200 flex flex-col h-screen">
      <div className="p-4 text-lg font-bold text-slate-900 flex items-center gap-2">
        <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-sm">LM</span>
        LyricMe
      </div>

      <div className="flex justify-center items-center gap-1 bg-slate-100 p-1 mx-2 rounded-lg">
        <button
          onClick={() => { setViewMode('edit'); onChangeViewMode('edit'); }}
          className={`flex-1 flex items-center justify-center gap-2 px-2 py-1.5 rounded-md transition-all text-xs font-medium ${
            viewMode === 'edit' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Edit size={14} />
          Editar
        </button>
        <button
          onClick={() => { setViewMode('perform'); onChangeViewMode('perform'); }}
          className={`flex-1 flex items-center justify-center gap-2 px-2 py-1.5 rounded-md transition-all text-xs font-medium ${
            viewMode === 'perform' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Eye size={14} />
          Presentar
        </button>
      </div>

      <div className="p-4 border-b border-slate-200 mt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mis Letras</h2>
          <button
            onClick={createNewSong}
            className="p-1 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors text-slate-400"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {songs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs italic">
            No tienes canciones guardadas en este navegador.
          </div>
        ) : (
          <div className="p-2 space-y-0.5">
            {songs.map((song: Song) => (
              <div
                key={song.id}
                onClick={() => onSelectSong(song.id!)}
                className={`group flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all ${
                  selectedSongId === song.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <FileText size={16} className={selectedSongId === song.id ? 'text-blue-500' : 'text-slate-400'} />
                  <span className="text-sm font-medium truncate">{song.title}</span>
                </div>
                <button
                  onClick={(e) => deleteSong(song.id!, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 hover:text-red-600 rounded-md transition-all text-slate-300"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}