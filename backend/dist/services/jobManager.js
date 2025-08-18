"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobManager = void 0;
const database_1 = require("./database");
const redis_1 = require("./redis");
const logger_1 = require("../utils/logger");
class JobManager {
    async createJob(jobId, songs) {
        try {
            await database_1.database.createJob(jobId, songs);
            const jobData = {
                jobId,
                status: 'pending',
                progress: 0,
                songs,
                createdAt: new Date().toISOString()
            };
            await redis_1.redis.setJob(jobId, jobData);
            logger_1.logger.info(`Job ${jobId} created successfully`);
        }
        catch (error) {
            logger_1.logger.error(`Failed to create job ${jobId}:`, error);
            throw error;
        }
    }
    async updateJobStatus(jobId, status, progress = 0, errorMessage, outputFileId) {
        try {
            await database_1.database.updateJobStatus(jobId, status, progress, errorMessage, outputFileId);
            const cachedJob = await redis_1.redis.getJob(jobId);
            if (cachedJob) {
                const updatedJob = {
                    ...cachedJob,
                    status,
                    progress,
                    error: errorMessage,
                    outputFileId,
                    ...(status === 'completed' && { completedAt: new Date().toISOString() })
                };
                await redis_1.redis.setJob(jobId, updatedJob);
            }
            logger_1.logger.info(`Job ${jobId} status updated to ${status} (${progress}%)`);
        }
        catch (error) {
            logger_1.logger.error(`Failed to update job ${jobId} status:`, error);
            throw error;
        }
    }
    async getJobStatus(jobId) {
        try {
            let cachedJob = await redis_1.redis.getJob(jobId);
            if (cachedJob) {
                return this.formatJobResponse(cachedJob);
            }
            const dbJob = await database_1.database.getJob(jobId);
            if (!dbJob) {
                return null;
            }
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
            await redis_1.redis.setJob(jobId, jobData);
            return this.formatJobResponse(jobData);
        }
        catch (error) {
            logger_1.logger.error(`Failed to get job status for ${jobId}:`, error);
            throw error;
        }
    }
    async listJobs(limit = 10, offset = 0) {
        try {
            const jobs = await database_1.database.listJobs(limit, offset);
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
        }
        catch (error) {
            logger_1.logger.error('Failed to list jobs:', error);
            throw error;
        }
    }
    async cancelJob(jobId) {
        try {
            const job = await database_1.database.getJob(jobId);
            if (!job) {
                throw new Error('Job not found');
            }
            if (job.status === 'completed' || job.status === 'failed') {
                throw new Error('Cannot cancel completed or failed job');
            }
            await this.updateJobStatus(jobId, 'failed', job.progress, 'Job cancelled by user');
            logger_1.logger.info(`Job ${jobId} cancelled successfully`);
        }
        catch (error) {
            logger_1.logger.error(`Failed to cancel job ${jobId}:`, error);
            throw error;
        }
    }
    async cleanupOldJobs(olderThanHours = 168) {
        try {
            const deletedCount = await database_1.database.deleteOldJobs(olderThanHours);
            logger_1.logger.info(`Cleaned up ${deletedCount} old jobs`);
            return deletedCount;
        }
        catch (error) {
            logger_1.logger.error('Failed to cleanup old jobs:', error);
            throw error;
        }
    }
    formatJobResponse(jobData) {
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
exports.JobManager = JobManager;
//# sourceMappingURL=jobManager.js.map