export declare class S3Service {
    private s3;
    private bucket;
    constructor();
    downloadFile(s3Url: string): Promise<Buffer>;
    uploadFile(key: string, buffer: Buffer, contentType?: string): Promise<string>;
    deleteFile(s3Url: string): Promise<void>;
    fileExists(s3Url: string): Promise<boolean>;
    private parseS3Url;
    healthCheck(): Promise<boolean>;
}
