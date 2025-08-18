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
          title VARCHAR(255) NOT NULL,
          artist VARCHAR(255) NOT NULL,
          s3_url TEXT NOT NULL,
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
}
exports.database = new Database();
const initializeDatabase = async () => {
    await exports.database.initialize();
};
exports.initializeDatabase = initializeDatabase;
//# sourceMappingURL=database.js.map