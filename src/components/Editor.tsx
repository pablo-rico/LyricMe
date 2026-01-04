import { useEffect, useState, useRef } from 'react';
import { Save } from 'lucide-react';
import { db } from '../lib/db'; // Importamos nuestra DB de Dexie
import type { Song } from '../types';

interface EditorProps {
  song: Song | null;
  onSave: () => void;
  onLineChange?: (line: number) => void;
}

export function Editor({ song, onSave, onLineChange }: EditorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sincronizar estado local cuando cambia la canción seleccionada
  useEffect(() => {
    if (song) {
      setTitle(song.title);
      setContent(song.content);
    }
  }, [song]);

  const handleCursorMove = () => {
    if (!textareaRef.current || !onLineChange) return;
    const textarea = textareaRef.current;
    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = textarea.value.substring(0, cursorPosition);
    const currentLine = textBeforeCursor.split('\n').length - 1;
    onLineChange(currentLine);
  };

  async function handleSave() {
    if (!song || !song.id) return;

    setIsSaving(true);
    try {
      // Usamos db.songs.update de Dexie
      await db.songs.update(song.id, {
        title,
        content,
        updated_at: Date.now() // Timestamp local en milisegundos
      });

      setLastSaved(new Date());
      onSave(); // Avisar al padre para refrescar la lista si es necesario
    } catch (error) {
      console.error('Error saving to Dexie:', error);
    } finally {
      setIsSaving(false);
    }
  }

  if (!song) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 text-gray-500">
        Selecciona una canción para empezar a editar
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="border-b border-slate-200 p-4 flex items-center justify-between">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-lg font-semibold outline-none flex-1 mr-4 text-slate-900"
          placeholder="Título de la canción"
        />
        <div className="flex items-center gap-3">
          {lastSaved && (
            <span className="text-xs text-slate-500">
              Local: {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded transition-colors hover:bg-blue-700 disabled:bg-blue-400 text-sm font-medium"
          >
            <Save size={16} />
            {isSaving ? 'Guardando...' : 'Guardar Local'}
          </button>
        </div>
      </div>

      <div className="flex-1 p-6">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setTimeout(handleCursorMove, 0); 
          }}
          onSelect={handleCursorMove}
          onKeyUp={handleCursorMove}
          className="w-full h-full outline-none resize-none font-mono text-sm leading-relaxed text-slate-700"
          placeholder="Escribe las letras de tu canción aquí..."
        />
      </div>
    </div>
  );
}