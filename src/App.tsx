import { useState, useEffect } from 'react';
import { db } from './lib/db';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { AudioPlayer } from './components/AudioPlayer';
import { SyncPanel } from './components/SyncPanel';
import { LyricsDisplay } from './components/LyricsDisplay';
import type { Song } from './types';

type ViewMode = 'edit' | 'perform';

function App() {
  // Cambiamos el tipo a number para ser compatibles con Dexie
  const [selectedSongId, setSelectedSongId] = useState<number | null>(null);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [syncsVersion, setSyncsVersion] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [activeLine, setActiveLine] = useState(0);

  // Efecto para cargar la canción desde Dexie cuando cambia el ID seleccionado
  useEffect(() => {
    if (selectedSongId) {
      loadSong(selectedSongId);
    } else {
      setCurrentSong(null);
    }
  }, [selectedSongId]);

  async function loadSong(songId: number) {
    try {
      // Búsqueda directa en la base de datos local
      const song = await db.songs.get(songId);
      if (song) {
        setCurrentSong(song);
      }
    } catch (error) {
      console.error('Error cargando canción desde Dexie:', error);
    }
  }

  // Se dispara cuando el Editor guarda cambios (título o letra)
  function handleSongSave() {
    if (selectedSongId) {
      loadSong(selectedSongId);
    }
  }

  // Incrementa la versión para que LyricsDisplay sepa que debe refrescar los syncs
  function handleSyncsChange() {
    setSyncsVersion(v => v + 1);
  }

  // Se dispara desde la Sidebar (creación o eliminación)
  function handleSongsChange() {
    if (selectedSongId) {
      loadSong(selectedSongId);
    }
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          selectedSongId={selectedSongId}
          onSelectSong={setSelectedSongId}
          onSongsChange={handleSongsChange}
          onChangeViewMode={setViewMode}
        />

        {viewMode === 'edit' ? (
          <>
            <Editor 
              song={currentSong} 
              onSave={handleSongSave} 
              onLineChange={(line) => setActiveLine(line)} 
            />
            <SyncPanel
              song={currentSong}
              currentTime={currentTime}
              onSyncsChange={handleSyncsChange}
              selectedLineFromEditor={activeLine}
            />
          </>
        ) : (
          <LyricsDisplay
            song={currentSong}
            currentTime={currentTime}
            syncsVersion={syncsVersion}
          />
        )}
      </div>

      <AudioPlayer
        song={currentSong}
        onTimeUpdate={setCurrentTime}
        onAudioLoaded={() => {}}
      />
    </div>
  );
}

export default App;