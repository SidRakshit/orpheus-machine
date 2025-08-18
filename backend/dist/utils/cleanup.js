"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleCleanupTasks = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const jobManager_1 = require("../services/jobManager");
const fileService_1 = require("../services/fileService");
const logger_1 = require("./logger");
const jobManager = new jobManager_1.JobManager();
const fileService = new fileService_1.FileService();
const scheduleCleanupTasks = () => {
    node_cron_1.default.schedule('0 2 * * *', async () => {
        try {
            logger_1.logger.info('Starting scheduled cleanup of old jobs');
            const deletedJobs = await jobManager.cleanupOldJobs(168);
            logger_1.logger.info(`Cleanup completed: ${deletedJobs} old jobs removed`);
        }
        catch (error) {
            logger_1.logger.error('Failed to cleanup old jobs:', error);
        }
    });
    node_cron_1.default.schedule('0 3 * * *', async () => {
        try {
            logger_1.logger.info('Starting scheduled cleanup of old files');
            const deletedFiles = await fileService.cleanupOldFiles(24);
            logger_1.logger.info(`Cleanup completed: ${deletedFiles} old files removed`);
        }
        catch (error) {
            logger_1.logger.error('Failed to cleanup old files:', error);
        }
    });
    node_cron_1.default.schedule('0 1 * * *', async () => {
        try {
            const stats = await fileService.getFileStats();
            logger_1.logger.info('Daily file statistics', {
                totalFiles: stats.totalFiles,
                totalSizeMB: Math.round(stats.totalSize / (1024 * 1024) * 100) / 100,
                oldestFile: stats.oldestFile
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to get file statistics:', error);
        }
    });
    logger_1.logger.info('Cleanup tasks scheduled successfully');
};
exports.scheduleCleanupTasks = scheduleCleanupTasks;
//# sourceMappingURL=cleanup.js.map