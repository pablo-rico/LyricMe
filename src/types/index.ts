export interface Song {
  id?: number;          // Opcional porque al crear una nueva Dexie lo genera
  title: string;
  content: string;
  audio_url?: string;   // Mantenemos esto por compatibilidad o URLs externas
  audioFile?: Blob;     // El archivo real guardado en el navegador
  created_at: number;   // Timestamp en milisegundos (Date.now())
  updated_at: number;
  bpm?: number;
}

export interface LyricSync {
  id?: number;
  song_id: number;      // Relación con el ID de la canción
  line_number: number;
  timestamp: number;    // El tiempo en segundos (ej: 12.45)
  created_at: number;
}