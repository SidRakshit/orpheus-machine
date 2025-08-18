import AWS from 'aws-sdk';
import { logger } from '../utils/logger';

export class S3Service {
  private s3: AWS.S3;
  private bucket: string;

  constructor() {
    // Configure AWS SDK
    AWS.config.update({
      ...(process.env.AWS_ACCESS_KEY_ID && { accessKeyId: process.env.AWS_ACCESS_KEY_ID }),
      ...(process.env.AWS_SECRET_ACCESS_KEY && { secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY }),
      region: process.env.AWS_REGION || 'us-east-1'
    });

    this.s3 = new AWS.S3({
      apiVersion: '2006-03-01',
      httpOptions: {
        timeout: 60000 // 60 seconds
      }
    });

    this.bucket = process.env.S3_BUCKET || 'orpheus-music-files';
  }

  async downloadFile(s3Url: string): Promise<Buffer> {
    try {
      logger.info(`Downloading file from S3: ${s3Url}`);

      // Parse S3 URL to extract bucket and key
      const { bucket, key } = this.parseS3Url(s3Url);

      const params: AWS.S3.GetObjectRequest = {
        Bucket: bucket,
        Key: key
      };

      const result = await this.s3.getObject(params).promise();
      
      if (!result.Body) {
        throw new Error('No data received from S3');
      }

      const buffer = result.Body as Buffer;
      
      logger.info(`Successfully downloaded file from S3`, {
        url: s3Url,
        size: buffer.length,
        contentType: result.ContentType
      });

      return buffer;

    } catch (error) {
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

      logger.error(`Failed to download file from S3: ${s3Url}`, error);
      throw new Error(`Failed to download file from S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async uploadFile(key: string, buffer: Buffer, contentType?: string): Promise<string> {
    try {
      logger.info(`Uploading file to S3: ${key}`);

      const params: AWS.S3.PutObjectRequest = {
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType || 'application/octet-stream'
      };

      const result = await this.s3.upload(params).promise();
      
      logger.info(`Successfully uploaded file to S3`, {
        key,
        location: result.Location,
        size: buffer.length
      });

      return result.Location;

    } catch (error) {
      logger.error(`Failed to upload file to S3: ${key}`, error);
      throw new Error(`Failed to upload file to S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteFile(s3Url: string): Promise<void> {
    try {
      logger.info(`Deleting file from S3: ${s3Url}`);

      const { bucket, key } = this.parseS3Url(s3Url);

      const params: AWS.S3.DeleteObjectRequest = {
        Bucket: bucket,
        Key: key
      };

      await this.s3.deleteObject(params).promise();
      
      logger.info(`Successfully deleted file from S3: ${s3Url}`);

    } catch (error) {
      logger.error(`Failed to delete file from S3: ${s3Url}`, error);
      throw new Error(`Failed to delete file from S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async fileExists(s3Url: string): Promise<boolean> {
    try {
      const { bucket, key } = this.parseS3Url(s3Url);

      const params: AWS.S3.HeadObjectRequest = {
        Bucket: bucket,
        Key: key
      };

      await this.s3.headObject(params).promise();
      return true;

    } catch (error) {
      if (error instanceof Error && error.name === 'NotFound') {
        return false;
      }
      
      logger.error(`Error checking if file exists in S3: ${s3Url}`, error);
      throw error;
    }
  }

  private parseS3Url(s3Url: string): { bucket: string; key: string } {
    // Handle different S3 URL formats:
    // https://bucket.s3.region.amazonaws.com/key
    // https://s3.region.amazonaws.com/bucket/key
    // s3://bucket/key

    if (s3Url.startsWith('s3://')) {
      const urlWithoutProtocol = s3Url.substring(5);
      const [bucket, ...keyParts] = urlWithoutProtocol.split('/');
      if (!bucket) throw new Error(`Invalid S3 URL format: ${s3Url}`);
      return { bucket, key: keyParts.join('/') };
    }

    if (s3Url.startsWith('https://')) {
      const url = new URL(s3Url);
      const pathSegments = url.pathname.substring(1).split('/');
      
      if (url.hostname.includes('.s3.')) {
        // Format: https://bucket.s3.region.amazonaws.com/key
        const bucket = url.hostname.split('.')[0];
        if (!bucket) throw new Error(`Invalid S3 URL format: ${s3Url}`);
        const key = pathSegments.join('/');
        return { bucket, key };
      } else if (url.hostname.startsWith('s3.')) {
        // Format: https://s3.region.amazonaws.com/bucket/key
        const [bucket, ...keyParts] = pathSegments;
        if (!bucket) throw new Error(`Invalid S3 URL format: ${s3Url}`);
        return { bucket, key: keyParts.join('/') };
      }
    }

    throw new Error(`Invalid S3 URL format: ${s3Url}`);
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Try to list objects in the bucket (limit to 1)
      const params: AWS.S3.ListObjectsV2Request = {
        Bucket: this.bucket,
        MaxKeys: 1
      };

      await this.s3.listObjectsV2(params).promise();
      return true;

    } catch (error) {
      logger.error('S3 health check failed:', error);
      return false;
    }
  }
} 