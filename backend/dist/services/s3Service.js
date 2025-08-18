"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3Service = void 0;
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const logger_1 = require("../utils/logger");
class S3Service {
    constructor() {
        aws_sdk_1.default.config.update({
            ...(process.env.AWS_ACCESS_KEY_ID && { accessKeyId: process.env.AWS_ACCESS_KEY_ID }),
            ...(process.env.AWS_SECRET_ACCESS_KEY && { secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY }),
            region: process.env.AWS_REGION || 'us-east-1'
        });
        this.s3 = new aws_sdk_1.default.S3({
            apiVersion: '2006-03-01',
            httpOptions: {
                timeout: 60000
            }
        });
        this.bucket = process.env.S3_BUCKET || 'orpheus-music-files';
    }
    async downloadFile(s3Url) {
        try {
            logger_1.logger.info(`Downloading file from S3: ${s3Url}`);
            const { bucket, key } = this.parseS3Url(s3Url);
            const params = {
                Bucket: bucket,
                Key: key
            };
            const result = await this.s3.getObject(params).promise();
            if (!result.Body) {
                throw new Error('No data received from S3');
            }
            const buffer = result.Body;
            logger_1.logger.info(`Successfully downloaded file from S3`, {
                url: s3Url,
                size: buffer.length,
                contentType: result.ContentType
            });
            return buffer;
        }
        catch (error) {
            if (error instanceof Error) {
                if (error.name === 'NoSuchKey') {
                    throw new Error(`File not found in S3: ${s3Url}`);
                }
                if (error.name === 'AccessDenied') {
                    throw new Error(`Access denied for S3 file: ${s3Url}`);
                }
                if (error.name === 'NoSuchBucket') {
                    throw new Error(`S3 bucket not found: ${this.bucket}`);
                }
            }
            logger_1.logger.error(`Failed to download file from S3: ${s3Url}`, error);
            throw new Error(`Failed to download file from S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async uploadFile(key, buffer, contentType) {
        try {
            logger_1.logger.info(`Uploading file to S3: ${key}`);
            const params = {
                Bucket: this.bucket,
                Key: key,
                Body: buffer,
                ContentType: contentType || 'application/octet-stream'
            };
            const result = await this.s3.upload(params).promise();
            logger_1.logger.info(`Successfully uploaded file to S3`, {
                key,
                location: result.Location,
                size: buffer.length
            });
            return result.Location;
        }
        catch (error) {
            logger_1.logger.error(`Failed to upload file to S3: ${key}`, error);
            throw new Error(`Failed to upload file to S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async deleteFile(s3Url) {
        try {
            logger_1.logger.info(`Deleting file from S3: ${s3Url}`);
            const { bucket, key } = this.parseS3Url(s3Url);
            const params = {
                Bucket: bucket,
                Key: key
            };
            await this.s3.deleteObject(params).promise();
            logger_1.logger.info(`Successfully deleted file from S3: ${s3Url}`);
        }
        catch (error) {
            logger_1.logger.error(`Failed to delete file from S3: ${s3Url}`, error);
            throw new Error(`Failed to delete file from S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async fileExists(s3Url) {
        try {
            const { bucket, key } = this.parseS3Url(s3Url);
            const params = {
                Bucket: bucket,
                Key: key
            };
            await this.s3.headObject(params).promise();
            return true;
        }
        catch (error) {
            if (error instanceof Error && error.name === 'NotFound') {
                return false;
            }
            logger_1.logger.error(`Error checking if file exists in S3: ${s3Url}`, error);
            throw error;
        }
    }
    parseS3Url(s3Url) {
        if (s3Url.startsWith('s3://')) {
            const urlWithoutProtocol = s3Url.substring(5);
            const [bucket, ...keyParts] = urlWithoutProtocol.split('/');
            if (!bucket)
                throw new Error(`Invalid S3 URL format: ${s3Url}`);
            return { bucket, key: keyParts.join('/') };
        }
        if (s3Url.startsWith('https://')) {
            const url = new URL(s3Url);
            const pathSegments = url.pathname.substring(1).split('/');
            if (url.hostname.includes('.s3.')) {
                const bucket = url.hostname.split('.')[0];
                if (!bucket)
                    throw new Error(`Invalid S3 URL format: ${s3Url}`);
                const key = pathSegments.join('/');
                return { bucket, key };
            }
            else if (url.hostname.startsWith('s3.')) {
                const [bucket, ...keyParts] = pathSegments;
                if (!bucket)
                    throw new Error(`Invalid S3 URL format: ${s3Url}`);
                return { bucket, key: keyParts.join('/') };
            }
        }
        throw new Error(`Invalid S3 URL format: ${s3Url}`);
    }
    async healthCheck() {
        try {
            const params = {
                Bucket: this.bucket,
                MaxKeys: 1
            };
            await this.s3.listObjectsV2(params).promise();
            return true;
        }
        catch (error) {
            logger_1.logger.error('S3 health check failed:', error);
            return false;
        }
    }
}
exports.S3Service = S3Service;
//# sourceMappingURL=s3Service.js.map