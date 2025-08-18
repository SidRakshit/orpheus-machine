import { Job } from './database';
export interface JobStatusResponse {
    jobId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    songs: string[];
    createdAt: string;
    completedAt?: string;
    outputFileId?: string;
    error?: string;
}
export declare class JobManager {
    createJob(jobId: string, songs: string[]): Promise<void>;
    updateJobStatus(jobId: string, status: Job['status'], progress?: number, errorMessage?: string, outputFileId?: string): Promise<void>;
    getJobStatus(jobId: string): Promise<JobStatusResponse | null>;
    listJobs(limit?: number, offset?: number): Promise<JobStatusResponse[]>;
    cancelJob(jobId: string): Promise<void>;
    cleanupOldJobs(olderThanHours?: number): Promise<number>;
    private formatJobResponse;
}
