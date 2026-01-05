import { useState } from 'react';
import { db } from './lib/db';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { AudioPlayer } from './components/AudioPlayer';
import { SyncPanel } from './components/SyncPanel';
import { LyricsDisplay } from './components/LyricsDisplay';
import { useLiveQuery } from 'dexie-react-hooks';

type ViewMode = 'edit' | 'perform';

function App() {
  const [selectedSongId, setSelectedSongId] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [syncsVersion, setSyncsVersion] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [activeLine, setActiveLine] = useState(0);

  

  /**
   * REACTIVIDAD CORE: 
   * useLiveQuery observa la tabla 'songs'. Si cualquier componente
   * (como AudioPlayer o Editor) hace un db.songs.update, este objeto
   * se actualiza automáticamente provocando un re-render de toda la app.
   */
  const currentSong = useLiveQuery(
    async () => {
      if (!selectedSongId) return null;
      return await db.songs.get(selectedSongId);
    },
    [selectedSongId]
  );

  /**
   * Ya no necesitamos loadSong() ni handleSongSave() manuales para 
   * actualizar los datos, la DB se encarga de notificar los cambios.
   */

  function handleSyncsChange() {
    setSyncsVersion(v => v + 1);
  }

  // Mantenemos esta función por si la Sidebar necesita realizar alguna acción extra
  function handleSongsChange() {
    // La reactividad de useLiveQuery se encarga del resto
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
              song={currentSong || null} 
              onSave={() => {}} // No requiere carga manual ahora
              onLineChange={(line) => setActiveLine(line)} 
            />
            <SyncPanel
              song={currentSong || null}
              currentTime={currentTime}
              onSyncsChange={handleSyncsChange}
              selectedLineFromEditor={activeLine}
            />
          </>
        ) : (
          <LyricsDisplay
            song={currentSong || null}
            currentTime={currentTime}
            syncsVersion={syncsVersion}
          />
        )}
      </div>

      <AudioPlayer
        song={currentSong || null}
        onTimeUpdate={setCurrentTime}
        onAudioLoaded={() => {}}
      />
    </div>
  );
}

export default App;