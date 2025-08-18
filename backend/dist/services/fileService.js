"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../utils/logger");
class FileService {
    constructor() {
        this.outputDir = path_1.default.join(process.cwd(), process.env.OUTPUT_DIR || './output');
        this.tempDir = path_1.default.join(process.cwd(), process.env.TEMP_DIR || './temp');
        this.ensureDirectories();
    }
    ensureDirectories() {
        [this.outputDir, this.tempDir].forEach(dir => {
            if (!fs_1.default.existsSync(dir)) {
                fs_1.default.mkdirSync(dir, { recursive: true });
                logger_1.logger.info(`Created directory: ${dir}`);
            }
        });
    }
    async saveGeneratedFile(fileId, buffer) {
        try {
            const filename = `orpheus_${fileId}.mp3`;
            const filePath = path_1.default.join(this.outputDir, filename);
            await fs_1.default.promises.writeFile(filePath, buffer);
            logger_1.logger.info(`Saved generated file: ${filename}`, {
                fileId,
                path: filePath,
                size: buffer.length
            });
            return filePath;
        }
        catch (error) {
            logger_1.logger.error(`Failed to save generated file ${fileId}:`, error);
            throw new Error(`Failed to save generated file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getFileForDownload(fileId) {
        try {
            const filename = `orpheus_${fileId}.mp3`;
            const filePath = path_1.default.join(this.outputDir, filename);
            if (!fs_1.default.existsSync(filePath)) {
                throw new Error(`File not found: ${fileId}`);
            }
            const stats = await fs_1.default.promises.stat(filePath);
            if (!stats.isFile()) {
                throw new Error(`Invalid file: ${fileId}`);
            }
            logger_1.logger.info(`File requested for download: ${filename}`, {
                fileId,
                size: stats.size,
                modified: stats.mtime
            });
            return { filePath, filename };
        }
        catch (error) {
            logger_1.logger.error(`Failed to get file for download ${fileId}:`, error);
            throw new Error(`File not found or inaccessible: ${fileId}`);
        }
    }
    async streamFile(filePath, response) {
        return new Promise((resolve, reject) => {
            const stream = fs_1.default.createReadStream(filePath);
            stream.on('error', (error) => {
                logger_1.logger.error(`Error streaming file ${filePath}:`, error);
                reject(new Error(`Failed to stream file: ${error.message}`));
            });
            stream.on('end', () => {
                logger_1.logger.info(`File streamed successfully: ${filePath}`);
                resolve();
            });
            stream.pipe(response);
        });
    }
    async deleteFile(fileId) {
        try {
            const filename = `orpheus_${fileId}.mp3`;
            const filePath = path_1.default.join(this.outputDir, filename);
            if (fs_1.default.existsSync(filePath)) {
                await fs_1.default.promises.unlink(filePath);
                logger_1.logger.info(`Deleted file: ${filename}`);
            }
            else {
                logger_1.logger.warn(`File not found for deletion: ${filename}`);
            }
        }
        catch (error) {
            logger_1.logger.error(`Failed to delete file ${fileId}:`, error);
            throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async cleanupOldFiles(olderThanHours = 24) {
        try {
            const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
            const files = await fs_1.default.promises.readdir(this.outputDir);
            let deletedCount = 0;
            for (const filename of files) {
                if (!filename.startsWith('orpheus_') || !filename.endsWith('.mp3')) {
                    continue;
                }
                const filePath = path_1.default.join(this.outputDir, filename);
                try {
                    const stats = await fs_1.default.promises.stat(filePath);
                    if (stats.mtime.getTime() < cutoffTime) {
                        await fs_1.default.promises.unlink(filePath);
                        deletedCount++;
                        logger_1.logger.info(`Cleaned up old file: ${filename}`);
                    }
                }
                catch (error) {
                    logger_1.logger.warn(`Error checking file for cleanup: ${filename}`, error);
                }
            }
            logger_1.logger.info(`Cleanup completed: ${deletedCount} files deleted`);
            return deletedCount;
        }
        catch (error) {
            logger_1.logger.error('Failed to cleanup old files:', error);
            throw new Error(`Failed to cleanup files: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async saveTempFile(filename, buffer) {
        try {
            const filePath = path_1.default.join(this.tempDir, filename);
            await fs_1.default.promises.writeFile(filePath, buffer);
            logger_1.logger.info(`Saved temp file: ${filename}`, {
                path: filePath,
                size: buffer.length
            });
            return filePath;
        }
        catch (error) {
            logger_1.logger.error(`Failed to save temp file ${filename}:`, error);
            throw new Error(`Failed to save temp file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async deleteTempFile(filePath) {
        try {
            if (fs_1.default.existsSync(filePath)) {
                await fs_1.default.promises.unlink(filePath);
                logger_1.logger.info(`Deleted temp file: ${path_1.default.basename(filePath)}`);
            }
        }
        catch (error) {
            logger_1.logger.error(`Failed to delete temp file ${filePath}:`, error);
        }
    }
    async getFileStats() {
        try {
            const files = await fs_1.default.promises.readdir(this.outputDir);
            const orpheusFiles = files.filter(f => f.startsWith('orpheus_') && f.endsWith('.mp3'));
            let totalSize = 0;
            let oldestFile;
            for (const filename of orpheusFiles) {
                const filePath = path_1.default.join(this.outputDir, filename);
                const stats = await fs_1.default.promises.stat(filePath);
                totalSize += stats.size;
                if (!oldestFile || stats.mtime < oldestFile) {
                    oldestFile = stats.mtime;
                }
            }
            return {
                totalFiles: orpheusFiles.length,
                totalSize,
                ...(oldestFile && { oldestFile })
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to get file stats:', error);
            return { totalFiles: 0, totalSize: 0 };
        }
    }
}
exports.FileService = FileService;
//# sourceMappingURL=fileService.js.map