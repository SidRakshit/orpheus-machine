import { Router, Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';
import { MusicService } from '../services/musicService';
import { JobManager } from '../services/jobManager';
import { FileService } from '../services/fileService';
import { database, Song } from '../services/database';

const router = Router();
const musicService = new MusicService();
const jobManager = new JobManager();
const fileService = new FileService();

// Validation schemas
const generateMusicSchema = Joi.object({
  songs: Joi.array()
    .items(Joi.string().trim().min(1).max(200))
    .length(3)
    .required()
    .messages({
      'array.length': 'Exactly 3 songs are required',
      'string.empty': 'Song names cannot be empty',
      'string.max': 'Song names must be less than 200 characters'
    })
});

// POST /api/generate - Start music generation
router.post('/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const { error, value } = generateMusicSchema.validate(req.body);
    if (error) {
      throw createError(error.details?.[0]?.message || 'Validation error', 400);
    }

    const { songs } = value;
    const jobId = uuidv4();

    logger.info(`Starting music generation job ${jobId}`, { songs });

    // Create job record
    await jobManager.createJob(jobId, songs);

    // Start background processing
    musicService.generateMusic(jobId, songs).catch(error => {
      logger.error(`Background generation failed for job ${jobId}:`, error);
      jobManager.updateJobStatus(jobId, 'failed', 0, error.message);
    });

    res.status(202).json({
      jobId,
      status: 'pending',
      message: 'Music generation started successfully'
    });

  } catch (error) {
    next(error);
  }
});

// GET /api/status/:jobId - Get job status
router.get('/status/:jobId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { jobId } = req.params;

    if (!jobId || typeof jobId !== 'string') {
      throw createError('Invalid job ID', 400);
    }

    const jobStatus = await jobManager.getJobStatus(jobId);
    
    if (!jobStatus) {
      throw createError('Job not found', 404);
    }

    res.json(jobStatus);

  } catch (error) {
    next(error);
  }
});

// GET /api/search - Search songs for autocomplete
router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!query || query.trim().length < 1) {
      return res.json({ songs: [] });
    }

    if (query.trim().length < 2) {
      return res.json({ songs: [] });
    }

    logger.info(`Searching songs with query: "${query}"`);

    const songs = await database.searchSongs(query.trim(), limit);
    
    // Format songs for autocomplete (title - artist)
    const formattedSongs = songs.map((song: Song) => ({
      id: song.id,
      label: `${song.title} - ${song.artist}`,
      title: song.title,
      artist: song.artist
    }));

    res.json({
      songs: formattedSongs,
      total: formattedSongs.length
    });

  } catch (error) {
    logger.error('Song search failed:', error);
    next(error);
  }
});

// GET /api/download/:fileId - Download generated file
router.get('/download/:fileId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileId } = req.params;

    if (!fileId || typeof fileId !== 'string') {
      throw createError('Invalid file ID', 400);
    }

    logger.info(`Download requested for file ${fileId}`);

    const { filePath, filename } = await fileService.getFileForDownload(fileId);

    // Set appropriate headers
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');

    // Stream the file
    await fileService.streamFile(filePath, res);

    logger.info(`File ${fileId} downloaded successfully`);

  } catch (error) {
    next(error);
  }
});

// GET /api/jobs - List recent jobs (optional debugging endpoint)
router.get('/jobs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    const jobs = await jobManager.listJobs(limit, offset);
    
    res.json({
      jobs,
      pagination: {
        limit,
        offset,
        total: jobs.length
      }
    });

  } catch (error) {
    next(error);
  }
});

// DELETE /api/jobs/:jobId - Cancel job (optional)
router.delete('/jobs/:jobId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { jobId } = req.params;

    if (!jobId || typeof jobId !== 'string') {
      throw createError('Invalid job ID', 400);
    }

    await jobManager.cancelJob(jobId);
    
    res.json({
      message: 'Job cancelled successfully',
      jobId
    });

  } catch (error) {
    next(error);
  }
});

export default router; 