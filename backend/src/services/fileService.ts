import fs from 'fs';
import path from 'path';
import { Response } from 'express';
import { logger } from '../utils/logger';

export class FileService {
  private outputDir: string;
  private tempDir: string;

  constructor() {
    this.outputDir = path.join(process.cwd(), process.env.OUTPUT_DIR || './output');
    this.tempDir = path.join(process.cwd(), process.env.TEMP_DIR || './temp');
    
    // Ensure directories exist
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    [this.outputDir, this.tempDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.info(`Created directory: ${dir}`);
      }
    });
  }

  async saveGeneratedFile(fileId: string, buffer: Buffer): Promise<string> {
    try {
      const filename = `orpheus_${fileId}.mp3`;
      const filePath = path.join(this.outputDir, filename);
      
      await fs.promises.writeFile(filePath, buffer);
      
      logger.info(`Saved generated file: ${filename}`, {
        fileId,
        path: filePath,
        size: buffer.length
      });
      
      return filePath;

    } catch (error) {
      logger.error(`Failed to save generated file ${fileId}:`, error);
      throw new Error(`Failed to save generated file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getFileForDownload(fileId: string): Promise<{ filePath: string; filename: string }> {
    try {
      const filename = `orpheus_${fileId}.mp3`;
      const filePath = path.join(this.outputDir, filename);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${fileId}`);
      }
      
      // Check file stats
      const stats = await fs.promises.stat(filePath);
      
      if (!stats.isFile()) {
        throw new Error(`Invalid file: ${fileId}`);
      }
      
      logger.info(`File requested for download: ${filename}`, {
        fileId,
        size: stats.size,
        modified: stats.mtime
      });
      
      return { filePath, filename };

    } catch (error) {
      logger.error(`Failed to get file for download ${fileId}:`, error);
      throw new Error(`File not found or inaccessible: ${fileId}`);
    }
  }

  async streamFile(filePath: string, response: Response): Promise<void> {
    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(filePath);
      
      stream.on('error', (error) => {
        logger.error(`Error streaming file ${filePath}:`, error);
        reject(new Error(`Failed to stream file: ${error.message}`));
      });
      
      stream.on('end', () => {
        logger.info(`File streamed successfully: ${filePath}`);
        resolve();
      });
      
      stream.pipe(response);
    });
  }

  async deleteFile(fileId: string): Promise<void> {
    try {
      const filename = `orpheus_${fileId}.mp3`;
      const filePath = path.join(this.outputDir, filename);
      
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        logger.info(`Deleted file: ${filename}`);
      } else {
        logger.warn(`File not found for deletion: ${filename}`);
      }

    } catch (error) {
      logger.error(`Failed to delete file ${fileId}:`, error);
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async cleanupOldFiles(olderThanHours: number = 24): Promise<number> {
    try {
      const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
      const files = await fs.promises.readdir(this.outputDir);
      
      let deletedCount = 0;
      
      for (const filename of files) {
        if (!filename.startsWith('orpheus_') || !filename.endsWith('.mp3')) {
          continue;
        }
        
        const filePath = path.join(this.outputDir, filename);
        
        try {
          const stats = await fs.promises.stat(filePath);
          
          if (stats.mtime.getTime() < cutoffTime) {
            await fs.promises.unlink(filePath);
            deletedCount++;
            logger.info(`Cleaned up old file: ${filename}`);
          }
        } catch (error) {
          logger.warn(`Error checking file for cleanup: ${filename}`, error);
        }
      }
      
      logger.info(`Cleanup completed: ${deletedCount} files deleted`);
      return deletedCount;

    } catch (error) {
      logger.error('Failed to cleanup old files:', error);
      throw new Error(`Failed to cleanup files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async saveTempFile(filename: string, buffer: Buffer): Promise<string> {
    try {
      const filePath = path.join(this.tempDir, filename);
      await fs.promises.writeFile(filePath, buffer);
      
      logger.info(`Saved temp file: ${filename}`, {
        path: filePath,
        size: buffer.length
      });
      
      return filePath;

    } catch (error) {
      logger.error(`Failed to save temp file ${filename}:`, error);
      throw new Error(`Failed to save temp file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteTempFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        logger.info(`Deleted temp file: ${path.basename(filePath)}`);
      }
    } catch (error) {
      logger.error(`Failed to delete temp file ${filePath}:`, error);
    }
  }

  async getFileStats(): Promise<{ totalFiles: number; totalSize: number; oldestFile?: Date }> {
    try {
      const files = await fs.promises.readdir(this.outputDir);
      const orpheusFiles = files.filter(f => f.startsWith('orpheus_') && f.endsWith('.mp3'));
      
      let totalSize = 0;
      let oldestFile: Date | undefined;
      
      for (const filename of orpheusFiles) {
        const filePath = path.join(this.outputDir, filename);
        const stats = await fs.promises.stat(filePath);
        
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

    } catch (error) {
      logger.error('Failed to get file stats:', error);
      return { totalFiles: 0, totalSize: 0 };
    }
  }
} 