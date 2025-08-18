import cron from 'node-cron';
import { JobManager } from '../services/jobManager';
import { FileService } from '../services/fileService';
import { logger } from './logger';

const jobManager = new JobManager();
const fileService = new FileService();

export const scheduleCleanupTasks = (): void => {
  // Clean up old jobs every day at 2 AM
  cron.schedule('0 2 * * *', async () => {
    try {
      logger.info('Starting scheduled cleanup of old jobs');
      const deletedJobs = await jobManager.cleanupOldJobs(168); // 7 days
      logger.info(`Cleanup completed: ${deletedJobs} old jobs removed`);
    } catch (error) {
      logger.error('Failed to cleanup old jobs:', error);
    }
  });

  // Clean up old files every day at 3 AM  
  cron.schedule('0 3 * * *', async () => {
    try {
      logger.info('Starting scheduled cleanup of old files');
      const deletedFiles = await fileService.cleanupOldFiles(24); // 24 hours
      logger.info(`Cleanup completed: ${deletedFiles} old files removed`);
    } catch (error) {
      logger.error('Failed to cleanup old files:', error);
    }
  });

  // Log file statistics every day at 1 AM
  cron.schedule('0 1 * * *', async () => {
    try {
      const stats = await fileService.getFileStats();
      logger.info('Daily file statistics', {
        totalFiles: stats.totalFiles,
        totalSizeMB: Math.round(stats.totalSize / (1024 * 1024) * 100) / 100,
        oldestFile: stats.oldestFile
      });
    } catch (error) {
      logger.error('Failed to get file statistics:', error);
    }
  });

  logger.info('Cleanup tasks scheduled successfully');
}; 