/*
  # Create Songs and Lyrics Sync System

  ## Overview
  This migration creates a system for managing song documents with markdown lyrics
  and audio synchronization timestamps.

  ## New Tables
  
  ### `songs`
  Stores song documents with lyrics and audio files
  - `id` (uuid, primary key) - Unique identifier for each song
  - `title` (text) - Song title
  - `content` (text) - Markdown content with lyrics
  - `audio_url` (text, nullable) - URL/path to audio file
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `lyric_syncs`
  Stores timestamp synchronization for specific lyrics lines
  - `id` (uuid, primary key) - Unique identifier
  - `song_id` (uuid, foreign key) - References songs table
  - `line_number` (integer) - Line number in the lyrics
  - `timestamp` (real) - Time in seconds when this line should be highlighted
  - `created_at` (timestamptz) - Creation timestamp

  ## Security
  - Enable RLS on both tables
  - Public access for now (can be restricted later with auth)
  - Policies allow all operations for demonstration purposes

  ## Indexes
  - Index on song_id for faster sync lookups
  - Index on timestamp for efficient time-based queries
*/

-- Create songs table
CREATE TABLE IF NOT EXISTS songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Untitled',
  content text DEFAULT '',
  audio_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create lyric syncs table
CREATE TABLE IF NOT EXISTS lyric_syncs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id uuid NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  line_number integer NOT NULL,
  timestamp real NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_lyric_syncs_song_id ON lyric_syncs(song_id);
CREATE INDEX IF NOT EXISTS idx_lyric_syncs_timestamp ON lyric_syncs(song_id, timestamp);

-- Enable RLS
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lyric_syncs ENABLE ROW LEVEL SECURITY;

-- Create policies for songs table
CREATE POLICY "Allow public read access to songs"
  ON songs FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to songs"
  ON songs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to songs"
  ON songs FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to songs"
  ON songs FOR DELETE
  USING (true);

-- Create policies for lyric_syncs table
CREATE POLICY "Allow public read access to lyric_syncs"
  ON lyric_syncs FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to lyric_syncs"
  ON lyric_syncs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to lyric_syncs"
  ON lyric_syncs FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to lyric_syncs"
  ON lyric_syncs FOR DELETE
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_songs_updated_at
  BEFORE UPDATE ON songs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();