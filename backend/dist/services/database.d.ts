export interface Song {
    id: string;
    title: string;
    artist: string;
    s3_url: string;
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
declare class Database {
    private pool;
    constructor();
    initialize(): Promise<void>;
    private createTables;
    findSongsByTitles(songTitles: string[]): Promise<Song[]>;
    searchSongs(query: string, limit?: number): Promise<Song[]>;
    createJob(jobId: string, songs: string[]): Promise<void>;
    updateJobStatus(jobId: string, status: Job['status'], progress?: number, errorMessage?: string, outputFileId?: string): Promise<void>;
    getJob(jobId: string): Promise<Job | null>;
    listJobs(limit?: number, offset?: number): Promise<Job[]>;
    deleteOldJobs(olderThanHours?: number): Promise<number>;
    close(): Promise<void>;
}
export declare const database: Database;
export declare const initializeDatabase: () => Promise<void>;
export {};
