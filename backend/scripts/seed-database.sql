-- Sample songs for the Orpheus Machine
-- This script populates the database with some popular songs and their S3 MIDI file URLs

INSERT INTO songs (midi_s3_key, token_s3_key, artist, title) VALUES
-- Classic Rock
('s3://bucket/midi1.mid', 's3://bucket/token1', 'Artist', 'Title'),
('s3://bucket/midi1.mid', 's3://bucket/token1', 'Artist', 'Title'),
('s3://bucket/midi1.mid', 's3://bucket/token1', 'Artist', 'Title'),
('s3://bucket/midi1.mid', 's3://bucket/token1', 'Artist', 'Title'),
('s3://bucket/midi1.mid', 's3://bucket/token1', 'Artist', 'Title'),

-- Pop Classics
('s3://bucket/midi1.mid', 's3://bucket/token1', 'Artist', 'Title'),
('s3://bucket/midi1.mid', 's3://bucket/token1', 'Artist', 'Title'),
('s3://bucket/midi1.mid', 's3://bucket/token1', 'Artist', 'Title'),
('s3://bucket/midi1.mid', 's3://bucket/token1', 'Artist', 'Title'),
('s3://bucket/midi1.mid', 's3://bucket/token1', 'Artist', 'Title'),

-- Jazz Standards
('s3://bucket/midi1.mid', 's3://bucket/token1', 'Artist', 'Title'),
('s3://bucket/midi1.mid', 's3://bucket/token1', 'Artist', 'Title'),
('s3://bucket/midi1.mid', 's3://bucket/token1', 'Artist', 'Title'),
('s3://bucket/midi1.mid', 's3://bucket/token1', 'Artist', 'Title'),
('s3://bucket/midi1.mid', 's3://bucket/token1', 'Artist', 'Title'),

-- Classical
('s3://bucket/midi1.mid', 's3://bucket/token1', 'Artist', 'Title'),
('s3://bucket/midi1.mid', 's3://bucket/token1', 'Artist', 'Title'),
('s3://bucket/midi1.mid', 's3://bucket/token1', 'Artist', 'Title'),
('s3://bucket/midi1.mid', 's3://bucket/token1', 'Artist', 'Title'),
('s3://bucket/midi1.mid', 's3://bucket/token1', 'Artist', 'Title'),

-- Electronic/Synth
('s3://bucket/midi1.mid', 's3://bucket/token1', 'Artist', 'Title'),
('s3://bucket/midi1.mid', 's3://bucket/token1', 'Artist', 'Title'),
('s3://bucket/midi1.mid', 's3://bucket/token1', 'Artist', 'Title'),
('s3://bucket/midi1.mid', 's3://bucket/token1', 'Artist', 'Title'),
('s3://bucket/midi1.mid', 's3://bucket/token1', 'Artist', 'Title'),

-- Hip Hop Classics
('s3://bucket/midi1.mid', 's3://bucket/token1', 'Artist', 'Title'),
('s3://bucket/midi1.mid', 's3://bucket/token1', 'Artist', 'Title'),
('s3://bucket/midi1.mid', 's3://bucket/token1', 'Artist', 'Title'),
('s3://bucket/midi1.mid', 's3://bucket/token1', 'Artist', 'Title'),
('s3://bucket/midi1.mid', 's3://bucket/token1', 'Artist', 'Title'),

-- Alternative/Indie
('s3://bucket/midi1.mid', 's3://bucket/token1', 'Artist', 'Title'),
('s3://bucket/midi1.mid', 's3://bucket/token1', 'Artist', 'Title'),
('s3://bucket/midi1.mid', 's3://bucket/token1', 'Artist', 'Title'),
('s3://bucket/midi1.mid', 's3://bucket/token1', 'Artist', 'Title'),
('s3://bucket/midi1.mid', 's3://bucket/token1', 'Artist', 'Title'),

-- R&B/Soul
('s3://bucket/midi1.mid', 's3://bucket/token1', 'Artist', 'Title'),
('s3://bucket/midi1.mid', 's3://bucket/token1', 'Artist', 'Title'),
('s3://bucket/midi1.mid', 's3://bucket/token1', 'Artist', 'Title'),
('s3://bucket/midi1.mid', 's3://bucket/token1', 'Artist', 'Title'),
('s3://bucket/midi1.mid', 's3://bucket/token1', 'Artist', 'Title'),

-- Modern Pop
('s3://bucket/midi1.mid', 's3://bucket/token1', 'Artist', 'Title'),
('s3://bucket/midi1.mid', 's3://bucket/token1', 'Artist', 'Title'),
('s3://bucket/midi1.mid', 's3://bucket/token1', 'Artist', 'Title'),
('s3://bucket/midi1.mid', 's3://bucket/token1', 'Artist', 'Title'),
('s3://bucket/midi1.mid', 's3://bucket/token1', 'Artist', 'Title');

-- Update the updated_at timestamp for all records
UPDATE songs SET updated_at = CURRENT_TIMESTAMP; 