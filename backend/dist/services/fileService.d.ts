import { Response } from 'express';
export declare class FileService {
    private outputDir;
    private tempDir;
    constructor();
    private ensureDirectories;
    saveGeneratedFile(fileId: string, buffer: Buffer): Promise<string>;
    getFileForDownload(fileId: string): Promise<{
        filePath: string;
        filename: string;
    }>;
    streamFile(filePath: string, response: Response): Promise<void>;
    deleteFile(fileId: string): Promise<void>;
    cleanupOldFiles(olderThanHours?: number): Promise<number>;
    saveTempFile(filename: string, buffer: Buffer): Promise<string>;
    deleteTempFile(filePath: string): Promise<void>;
    getFileStats(): Promise<{
        totalFiles: number;
        totalSize: number;
        oldestFile?: Date;
    }>;
}
