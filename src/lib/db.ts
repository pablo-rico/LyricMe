import Dexie, { type Table } from 'dexie';

// Interfaces que replican tus tablas SQL
export interface Song {
  id?: number;
  title: string;
  content: string;
  audio_url?: string;
  audioFile?: Blob;
  bpm?: number;
  created_at: number;
  updated_at: number;
}

export interface LyricSync {
  id?: number;
  song_id: number;
  line_number: number;
  timestamp: number;
  created_at: number;
}

export class AppDatabase extends Dexie {
  songs!: Table<Song>;
  lyric_syncs!: Table<LyricSync>;

  constructor() {
    super('LyricsAppDB');

    this.version(1).stores({
      // El primer campo es la Primary Key. 
      // Los campos siguientes son los INDEXADOS (para búsquedas rápidas)
      songs: '++id, title, updated_at', 
      
      // Indexamos song_id y timestamp para replicar tus índices SQL
      lyric_syncs: '++id, song_id, [song_id+timestamp], line_number'
    });
  }
}

export const db = new AppDatabase();