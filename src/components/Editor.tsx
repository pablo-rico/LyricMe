import { useEffect, useState, useRef, useCallback } from 'react';
import { Save, Check, Cloud } from 'lucide-react';
import { db } from '../lib/db';
import type { Song } from '../types';

interface EditorProps {
  song: Song | null;
  onSave: () => void;
  onLineChange?: (line: number) => void;
}

export function Editor({ song, onSave, onLineChange }: EditorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Función de guardado memorizada
  const handleSave = useCallback(async (currentTitle: string, currentContent: string) => {
    if (!song || !song.id) return;

    setSaveStatus('saving');
    try {
      await db.songs.update(song.id, {
        title: currentTitle,
        content: currentContent,
        updated_at: Date.now()
      });
      setSaveStatus('saved');
      onSave();
      
      // Volver al estado normal después de 2 segundos
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving to Dexie:', error);
      setSaveStatus('idle');
    }
  }, [song, onSave]);

  // 2. Efecto para Atajo Ctrl + S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault(); // Evita que el navegador intente guardar la página
        handleSave(title, content);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [title, content, handleSave]);

  // 3. Efecto para Auto-save (Debounce)
  useEffect(() => {
    // Si los valores son iguales a los de la canción cargada, no disparamos el autosave
    if (!song || (title === song.title && content === song.content)) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(() => {
      handleSave(title, content);
    }, 1500); // Guarda después de 1.5 segundos de inactividad

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [title, content, song, handleSave]);

  // Sincronizar estado local al cambiar de canción
  useEffect(() => {
    if (song) {
      setTitle(song.title);
      setContent(song.content);
      setSaveStatus('idle');
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

  if (!song) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 text-gray-500 italic">
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
        
        <div className="flex items-center gap-4">
          {/* Indicador de estado visual */}
          <div className="flex items-center gap-2 text-xs font-medium transition-all duration-300">
            {saveStatus === 'saving' && (
              <span className="text-blue-500 flex items-center gap-1 animate-pulse">
                <Cloud size={14} /> Guardando...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-emerald-500 flex items-center gap-1">
                <Check size={14} /> Guardado
              </span>
            )}
            {saveStatus === 'idle' && song.updated_at && (
              <span className="text-slate-400">
                Auto-save activo
              </span>
            )}
          </div>

          <button
            onClick={() => handleSave(title, content)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-colors text-sm font-medium"
          >
            <Save size={16} />
            <span className="hidden sm:inline">Ctrl+S</span>
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
          className="w-full h-full outline-none resize-none font-mono text-base leading-relaxed text-slate-700"
          placeholder="Escribe las letras aquí..."
        />
      </div>
    </div>
  );
}