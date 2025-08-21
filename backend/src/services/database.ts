import { Pool, PoolClient } from 'pg';
import { logger } from '../utils/logger';

export interface Song {
  id: string;
  midi_s3_key: string;
  token_s3_key?: string;  // Optional since it might be null
  artist: string;
  title: string;
  created_at: Date;
  updated_at: Date;
}

export interface Job {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  songs: string[];
  created_at: Date;
  completed_at?: Date;
  output_file_id?: string;
  error_message?: string;
}

class Database {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected error on idle client', err);
    });
  }

  async initialize(): Promise<void> {
    try {
      await this.createTables();
      logger.info('Database tables initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    const client = await this.pool.connect();
    try {
      // Create songs table
      await client.query(`
        CREATE TABLE IF NOT EXISTS songs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          midi_s3_key TEXT NOT NULL,
          token_s3_key TEXT,
          artist VARCHAR(255) NOT NULL,
          title VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create index for faster song searches
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_songs_title_artist 
        ON songs USING btree (LOWER(title), LOWER(artist));
      `);

      // Create jobs table
      await client.query(`
        CREATE TABLE IF NOT EXISTS jobs (
          job_id UUID PRIMARY KEY,
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          progress INTEGER DEFAULT 0,
          songs TEXT[] NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          completed_at TIMESTAMP WITH TIME ZONE,
          output_file_id VARCHAR(255),
          error_message TEXT,
          CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
          CONSTRAINT valid_progress CHECK (progress >= 0 AND progress <= 100)
        );
      `);

      // Create index for job lookups
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_jobs_created_at 
        ON jobs USING btree (created_at DESC);
      `);

    } finally {
      client.release();
    }
  }

  async findSongsByTitles(songTitles: string[]): Promise<Song[]> {
    const client = await this.pool.connect();
    try {
      const placeholders = songTitles.map((_, index) => `$${index + 1}`).join(', ');
      const query = `
        SELECT * FROM songs 
        WHERE LOWER(title) = ANY(ARRAY[${placeholders}]::text[])
        OR LOWER(CONCAT(title, ' - ', artist)) = ANY(ARRAY[${placeholders}]::text[])
        ORDER BY title;
      `;
      
      const lowerCaseTitles = songTitles.map(title => title.toLowerCase());
      const result = await client.query(query, lowerCaseTitles);
      
      return result.rows;
    } finally {
      client.release();
    }
  }

  async searchSongs(query: string, limit: number = 10): Promise<Song[]> {
    const client = await this.pool.connect();
    try {
      const searchQuery = `
        SELECT * FROM songs 
        WHERE LOWER(title) LIKE LOWER($1) 
           OR LOWER(artist) LIKE LOWER($1)
           OR LOWER(CONCAT(title, ' - ', artist)) LIKE LOWER($1)
        ORDER BY 
          CASE 
            WHEN LOWER(title) = LOWER($2) THEN 1
            WHEN LOWER(CONCAT(title, ' - ', artist)) = LOWER($2) THEN 2
            WHEN LOWER(title) LIKE LOWER($1) THEN 3
            ELSE 4
          END,
          title
        LIMIT $3;
      `;
      
      const searchTerm = `%${query}%`;
      const result = await client.query(searchQuery, [searchTerm, query, limit]);
      
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getAllSongs(): Promise<Song[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT * FROM songs ORDER BY title, artist');
      return result.rows;
    } finally {
      client.release();
    }
  }

  async createJob(jobId: string, songs: string[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        'INSERT INTO jobs (job_id, songs) VALUES ($1, $2)',
        [jobId, songs]
      );
    } finally {
      client.release();
    }
  }

  async updateJobStatus(
    jobId: string, 
    status: Job['status'], 
    progress: number = 0, 
    errorMessage?: string,
    outputFileId?: string
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      const completedAt = status === 'completed' ? new Date() : null;
      
      await client.query(`
        UPDATE jobs 
        SET status = $1, progress = $2, error_message = $3, output_file_id = $4, completed_at = $5
        WHERE job_id = $6
      `, [status, progress, errorMessage, outputFileId, completedAt, jobId]);
    } finally {
      client.release();
    }
  }

  async getJob(jobId: string): Promise<Job | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT * FROM jobs WHERE job_id = $1', [jobId]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async listJobs(limit: number = 10, offset: number = 0): Promise<Job[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM jobs ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }

  async deleteOldJobs(olderThanHours: number = 168): Promise<number> { // 7 days default
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        DELETE FROM jobs 
        WHERE created_at < NOW() - INTERVAL '${olderThanHours} hours'
        AND status IN ('completed', 'failed')
      `);
      return result.rowCount || 0;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
    logger.info('Database connection pool closed');
  }

  // Helper function to extract base title from versioned titles
  private extractBaseTitle(title: string): string {
    // Remove version numbers like .1, .2, .3, etc.
    return title.replace(/\.\d+$/, '').trim();
  }

  // Find all versions of a song by its base title
  async findAllVersionsOfSong(baseTitle: string): Promise<Song[]> {
    const client = await this.pool.connect();
    try {
      // First, try to find songs that match the base title exactly when versions are stripped
      const query = `
        SELECT * FROM songs 
        WHERE REGEXP_REPLACE(LOWER(title), '\\.\\d+$', '') = LOWER($1)
        ORDER BY title;
      `;
      
      const result = await client.query(query, [baseTitle]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // Enhanced search that returns deduplicated base titles for frontend display
  async searchSongsForFrontend(query: string, limit: number = 10): Promise<Song[]> {
    const client = await this.pool.connect();
    try {
      const searchQuery = `
        SELECT DISTINCT ON (REGEXP_REPLACE(LOWER(title), '\\.\\d+$', '')) 
          id, title, artist, midi_s3_key, created_at, updated_at,
          REGEXP_REPLACE(title, '\\.\\d+$', '') as base_title
        FROM songs 
        WHERE 
          LOWER(REGEXP_REPLACE(title, '\\.\\d+$', '')) LIKE LOWER($1)
          OR LOWER(title) LIKE LOWER($1) 
          OR LOWER(artist) LIKE LOWER($1)
          OR LOWER(CONCAT(title, ' - ', artist)) LIKE LOWER($1)
        ORDER BY 
          REGEXP_REPLACE(LOWER(title), '\\.\\d+$', ''),
          CASE 
            WHEN LOWER(REGEXP_REPLACE(title, '\\.\\d+$', '')) = LOWER($2) THEN 1
            WHEN LOWER(title) = LOWER($2) THEN 2
            WHEN LOWER(CONCAT(title, ' - ', artist)) = LOWER($2) THEN 3
            ELSE 4
          END,
          title
        LIMIT $3;
      `;
      
      const searchTerm = `%${query}%`;
      const result = await client.query(searchQuery, [searchTerm, query, limit]);
      
      // Return songs with base titles for frontend display
      return result.rows.map(row => ({
        ...row,
        title: row.base_title || row.title // Use base title for display
      }));
    } finally {
      client.release();
    }
  }

  // Enhanced version of findSongsByTitles that finds ALL versions
  async findSongsByTitlesWithAllVersions(songTitles: string[]): Promise<Song[]> {
    const client = await this.pool.connect();
    try {
      const allSongs: Song[] = [];
      
      for (const songTitle of songTitles) {
        // First try exact match
        const exactResult = await client.query(
          'SELECT * FROM songs WHERE LOWER(title) = LOWER($1)',
          [songTitle]
        );
        
        if (exactResult.rows.length > 0) {
          allSongs.push(...exactResult.rows);
        } else {
          // Try to find all versions by base title
          const versionsResult = await client.query(`
            SELECT * FROM songs 
            WHERE REGEXP_REPLACE(LOWER(title), '\\.\\d+$', '') = LOWER($1)
            ORDER BY title;
          `, [songTitle]);
          
          if (versionsResult.rows.length > 0) {
            allSongs.push(...versionsResult.rows);
          }
        }
      }
      
      // Remove duplicates
      const uniqueSongs = allSongs.filter((song, index, arr) => 
        arr.findIndex(s => s.id === song.id) === index
      );
      
      return uniqueSongs;
    } finally {
      client.release();
    }
  }

  // Bulk insert songs from CSV data
  async bulkInsertSongs(songsData: Array<{
    midi_s3_key: string;
    token_s3_key?: string;
    artist: string;
    title: string;
  }>): Promise<number> {
    let insertedCount = 0;
    const batchSize = 100; // Process in smaller batches
    
    for (let i = 0; i < songsData.length; i += batchSize) {
      const batch = songsData.slice(i, i + batchSize);
      const client = await this.pool.connect();
      
      try {
        await client.query('BEGIN');
        
        for (const song of batch) {
          try {
            await client.query(`
              INSERT INTO songs (title, artist, midi_s3_key, token_s3_key)
              VALUES ($1, $2, $3, $4)
            `, [song.title, song.artist, song.midi_s3_key, song.token_s3_key || null]);
            
            insertedCount++;
          } catch (error: any) {
            // Log duplicate or other errors but continue with the rest
            if (error.code === '23505') { // Unique violation
              logger.warn(`Skipping duplicate song: ${song.title} - ${song.artist}`);
            } else {
              logger.error(`Error inserting song ${song.title} - ${song.artist}:`, error);
              // For other errors, we need to rollback this batch and continue
              await client.query('ROLLBACK');
              await client.query('BEGIN'); // Start a new transaction for remaining songs in batch
            }
          }
        }
        
        await client.query('COMMIT');
        
        // Log progress every 1000 songs
        if (i % 1000 === 0) {
          logger.info(`Processed ${Math.min(i + batchSize, songsData.length)} / ${songsData.length} songs...`);
        }
        
      } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`Error during batch ${i}-${i + batchSize}:`, error);
        // Continue with next batch instead of failing entirely
      } finally {
        client.release();
      }
    }
    
    logger.info(`Successfully inserted ${insertedCount} songs from CSV`);
    return insertedCount;
  }
}

// Singleton instance
export const database = new Database();

export const initializeDatabase = async (): Promise<void> => {
  await database.initialize();
}; 