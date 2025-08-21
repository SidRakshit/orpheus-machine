"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = exports.database = void 0;
const pg_1 = require("pg");
const logger_1 = require("../utils/logger");
class Database {
    constructor() {
        this.pool = new pg_1.Pool({
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
            logger_1.logger.error('Unexpected error on idle client', err);
        });
    }
    async initialize() {
        try {
            await this.createTables();
            logger_1.logger.info('Database tables initialized successfully');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize database:', error);
            throw error;
        }
    }
    async createTables() {
        const client = await this.pool.connect();
        try {
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
            await client.query(`
        CREATE INDEX IF NOT EXISTS idx_songs_title_artist 
        ON songs USING btree (LOWER(title), LOWER(artist));
      `);
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
            await client.query(`
        CREATE INDEX IF NOT EXISTS idx_jobs_created_at 
        ON jobs USING btree (created_at DESC);
      `);
        }
        finally {
            client.release();
        }
    }
    async findSongsByTitles(songTitles) {
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
        }
        finally {
            client.release();
        }
    }
    async searchSongs(query, limit = 10) {
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
        }
        finally {
            client.release();
        }
    }
    async getAllSongs() {
        const client = await this.pool.connect();
        try {
            const result = await client.query('SELECT * FROM songs ORDER BY title, artist');
            return result.rows;
        }
        finally {
            client.release();
        }
    }
    async createJob(jobId, songs) {
        const client = await this.pool.connect();
        try {
            await client.query('INSERT INTO jobs (job_id, songs) VALUES ($1, $2)', [jobId, songs]);
        }
        finally {
            client.release();
        }
    }
    async updateJobStatus(jobId, status, progress = 0, errorMessage, outputFileId) {
        const client = await this.pool.connect();
        try {
            const completedAt = status === 'completed' ? new Date() : null;
            await client.query(`
        UPDATE jobs 
        SET status = $1, progress = $2, error_message = $3, output_file_id = $4, completed_at = $5
        WHERE job_id = $6
      `, [status, progress, errorMessage, outputFileId, completedAt, jobId]);
        }
        finally {
            client.release();
        }
    }
    async getJob(jobId) {
        const client = await this.pool.connect();
        try {
            const result = await client.query('SELECT * FROM jobs WHERE job_id = $1', [jobId]);
            return result.rows[0] || null;
        }
        finally {
            client.release();
        }
    }
    async listJobs(limit = 10, offset = 0) {
        const client = await this.pool.connect();
        try {
            const result = await client.query('SELECT * FROM jobs ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
            return result.rows;
        }
        finally {
            client.release();
        }
    }
    async deleteOldJobs(olderThanHours = 168) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(`
        DELETE FROM jobs 
        WHERE created_at < NOW() - INTERVAL '${olderThanHours} hours'
        AND status IN ('completed', 'failed')
      `);
            return result.rowCount || 0;
        }
        finally {
            client.release();
        }
    }
    async close() {
        await this.pool.end();
        logger_1.logger.info('Database connection pool closed');
    }
    extractBaseTitle(title) {
        return title.replace(/\.\d+$/, '').trim();
    }
    async findAllVersionsOfSong(baseTitle) {
        const client = await this.pool.connect();
        try {
            const query = `
        SELECT * FROM songs 
        WHERE REGEXP_REPLACE(LOWER(title), '\\.\\d+$', '') = LOWER($1)
        ORDER BY title;
      `;
            const result = await client.query(query, [baseTitle]);
            return result.rows;
        }
        finally {
            client.release();
        }
    }
    async searchSongsForFrontend(query, limit = 10) {
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
            return result.rows.map(row => ({
                ...row,
                title: row.base_title || row.title
            }));
        }
        finally {
            client.release();
        }
    }
    async findSongsByTitlesWithAllVersions(songTitles) {
        const client = await this.pool.connect();
        try {
            const allSongs = [];
            for (const songTitle of songTitles) {
                const exactResult = await client.query('SELECT * FROM songs WHERE LOWER(title) = LOWER($1)', [songTitle]);
                if (exactResult.rows.length > 0) {
                    allSongs.push(...exactResult.rows);
                }
                else {
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
            const uniqueSongs = allSongs.filter((song, index, arr) => arr.findIndex(s => s.id === song.id) === index);
            return uniqueSongs;
        }
        finally {
            client.release();
        }
    }
    async bulkInsertSongs(songsData) {
        let insertedCount = 0;
        const batchSize = 100;
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
                    }
                    catch (error) {
                        if (error.code === '23505') {
                            logger_1.logger.warn(`Skipping duplicate song: ${song.title} - ${song.artist}`);
                        }
                        else {
                            logger_1.logger.error(`Error inserting song ${song.title} - ${song.artist}:`, error);
                            await client.query('ROLLBACK');
                            await client.query('BEGIN');
                        }
                    }
                }
                await client.query('COMMIT');
                if (i % 1000 === 0) {
                    logger_1.logger.info(`Processed ${Math.min(i + batchSize, songsData.length)} / ${songsData.length} songs...`);
                }
            }
            catch (error) {
                await client.query('ROLLBACK');
                logger_1.logger.error(`Error during batch ${i}-${i + batchSize}:`, error);
            }
            finally {
                client.release();
            }
        }
        logger_1.logger.info(`Successfully inserted ${insertedCount} songs from CSV`);
        return insertedCount;
    }
}
exports.database = new Database();
const initializeDatabase = async () => {
    await exports.database.initialize();
};
exports.initializeDatabase = initializeDatabase;
//# sourceMappingURL=database.js.map