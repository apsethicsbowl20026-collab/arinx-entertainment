-- Media without R2: videos can live in D1 as fixed-size chunks, or be
-- published from an external source (YouTube, Vimeo, Internet Archive,
-- direct video URL).
ALTER TABLE videos ADD COLUMN source_url TEXT NOT NULL DEFAULT '';
ALTER TABLE videos ADD COLUMN embed_type TEXT NOT NULL DEFAULT '';
ALTER TABLE videos ADD COLUMN provider TEXT NOT NULL DEFAULT '';
ALTER TABLE videos ADD COLUMN duration_sec INTEGER NOT NULL DEFAULT 0;
ALTER TABLE videos ADD COLUMN thumb_url TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS media_chunks (
  video_id TEXT NOT NULL,
  idx INTEGER NOT NULL,
  bytes BLOB NOT NULL,
  PRIMARY KEY (video_id, idx)
);
CREATE INDEX IF NOT EXISTS media_chunks_video ON media_chunks(video_id, idx);

CREATE TABLE IF NOT EXISTS video_thumbs (
  video_id TEXT PRIMARY KEY,
  content_type TEXT NOT NULL,
  bytes BLOB NOT NULL
);
