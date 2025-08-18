import { database, Job } from './database';
import { redis } from './redis';
import { logger } from '../utils/logger';

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

export class JobManager {
  async createJob(jobId: string, songs: string[]): Promise<void> {
    try {
      // Store in database
      await database.createJob(jobId, songs);
      
      // Cache in Redis for fast access
      const jobData = {
        jobId,
        status: 'pending',
        progress: 0,
        songs,
        createdAt: new Date().toISOString()
      };
      
      await redis.setJob(jobId, jobData);
      
      logger.info(`Job ${jobId} created successfully`);
    } catch (error) {
      logger.error(`Failed to create job ${jobId}:`, error);
      throw error;
    }
  }

  async updateJobStatus(
    jobId: string,
    status: Job['status'],
    progress: number = 0,
    errorMessage?: string,
    outputFileId?: string
  ): Promise<void> {
    try {
      // Update database
      await database.updateJobStatus(jobId, status, progress, errorMessage, outputFileId);
      
      // Update Redis cache
      const cachedJob = await redis.getJob(jobId);
      if (cachedJob) {
        const updatedJob = {
          ...cachedJob,
          status,
          progress,
          error: errorMessage,
          outputFileId,
          ...(status === 'completed' && { completedAt: new Date().toISOString() })
        };
        
        await redis.setJob(jobId, updatedJob);
      }
      
      logger.info(`Job ${jobId} status updated to ${status} (${progress}%)`);
    } catch (error) {
      logger.error(`Failed to update job ${jobId} status:`, error);
      throw error;
    }
  }

  async getJobStatus(jobId: string): Promise<JobStatusResponse | null> {
    try {
      // Try Redis cache first
      let cachedJob = await redis.getJob(jobId);
      
      if (cachedJob) {
        return this.formatJobResponse(cachedJob);
      }
      
      // Fall back to database
      const dbJob = await database.getJob(jobId);
      if (!dbJob) {
        return null;
      }
      
      // Update cache with database data
      const jobData = {
        jobId: dbJob.job_id,
        status: dbJob.status,
        progress: dbJob.progress,
        songs: dbJob.songs,
        createdAt: dbJob.created_at.toISOString(),
        completedAt: dbJob.completed_at?.toISOString(),
        outputFileId: dbJob.output_file_id,
        error: dbJob.error_message
      };
      
      await redis.setJob(jobId, jobData);
      
      return this.formatJobResponse(jobData);
    } catch (error) {
      logger.error(`Failed to get job status for ${jobId}:`, error);
      throw error;
    }
  }

  async listJobs(limit: number = 10, offset: number = 0): Promise<JobStatusResponse[]> {
    try {
      const jobs = await database.listJobs(limit, offset);
      return jobs.map(job => this.formatJobResponse({
        jobId: job.job_id,
        status: job.status,
        progress: job.progress,
        songs: job.songs,
        createdAt: job.created_at.toISOString(),
        completedAt: job.completed_at?.toISOString(),
        outputFileId: job.output_file_id,
        error: job.error_message
      }));
    } catch (error) {
      logger.error('Failed to list jobs:', error);
      throw error;
    }
  }

  async cancelJob(jobId: string): Promise<void> {
    try {
      const job = await database.getJob(jobId);
      if (!job) {
        throw new Error('Job not found');
      }
      
      if (job.status === 'completed' || job.status === 'failed') {
        throw new Error('Cannot cancel completed or failed job');
      }
      
      await this.updateJobStatus(jobId, 'failed', job.progress, 'Job cancelled by user');
      
      logger.info(`Job ${jobId} cancelled successfully`);
    } catch (error) {
      logger.error(`Failed to cancel job ${jobId}:`, error);
      throw error;
    }
  }

  async cleanupOldJobs(olderThanHours: number = 168): Promise<number> {
    try {
      const deletedCount = await database.deleteOldJobs(olderThanHours);
      logger.info(`Cleaned up ${deletedCount} old jobs`);
      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup old jobs:', error);
      throw error;
    }
  }

  private formatJobResponse(jobData: any): JobStatusResponse {
    return {
      jobId: jobData.jobId,
      status: jobData.status,
      progress: jobData.progress,
      songs: jobData.songs,
      createdAt: jobData.createdAt,
      completedAt: jobData.completedAt,
      outputFileId: jobData.outputFileId,
      error: jobData.error
    };
  }
} 