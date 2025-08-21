"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const joi_1 = __importDefault(require("joi"));
const uuid_1 = require("uuid");
const logger_1 = require("../utils/logger");
const errorHandler_1 = require("../middleware/errorHandler");
const musicService_1 = require("../services/musicService");
const jobManager_1 = require("../services/jobManager");
const fileService_1 = require("../services/fileService");
const database_1 = require("../services/database");
const router = (0, express_1.Router)();
const musicService = new musicService_1.MusicService();
const jobManager = new jobManager_1.JobManager();
const fileService = new fileService_1.FileService();
const generateMusicSchema = joi_1.default.object({
    songs: joi_1.default.array()
        .items(joi_1.default.string().trim().min(1).max(200))
        .length(3)
        .required()
        .messages({
        'array.length': 'Exactly 3 songs are required',
        'string.empty': 'Song names cannot be empty',
        'string.max': 'Song names must be less than 200 characters'
    })
});
router.post('/generate', async (req, res, next) => {
    try {
        const { error, value } = generateMusicSchema.validate(req.body);
        if (error) {
            throw (0, errorHandler_1.createError)(error.details?.[0]?.message || 'Validation error', 400);
        }
        const { songs } = value;
        const jobId = (0, uuid_1.v4)();
        logger_1.logger.info(`Starting music generation job ${jobId}`, { songs });
        await jobManager.createJob(jobId, songs);
        musicService.generateMusic(jobId, songs).catch(error => {
            logger_1.logger.error(`Background generation failed for job ${jobId}:`, error);
            jobManager.updateJobStatus(jobId, 'failed', 0, error.message);
        });
        res.status(202).json({
            jobId,
            status: 'pending',
            message: 'Music generation started successfully'
        });
    }
    catch (error) {
        next(error);
    }
});
router.get('/status/:jobId', async (req, res, next) => {
    try {
        const { jobId } = req.params;
        if (!jobId || typeof jobId !== 'string') {
            throw (0, errorHandler_1.createError)('Invalid job ID', 400);
        }
        const jobStatus = await jobManager.getJobStatus(jobId);
        if (!jobStatus) {
            throw (0, errorHandler_1.createError)('Job not found', 404);
        }
        res.json(jobStatus);
    }
    catch (error) {
        next(error);
    }
});
router.get('/search', async (req, res, next) => {
    try {
        const query = req.query.q;
        const limit = parseInt(req.query.limit) || 20;
        if (!query || query.trim().length < 1) {
            res.json({ songs: [] });
            return;
        }
        if (query.trim().length < 2) {
            res.json({ songs: [] });
            return;
        }
        logger_1.logger.info(`Searching songs with query: "${query}"`);
        const songs = await database_1.database.searchSongs(query.trim(), limit);
        const formattedSongs = songs.map((song) => ({
            id: song.id,
            label: `${song.title} - ${song.artist}`,
            title: song.title,
            artist: song.artist
        }));
        res.json({
            songs: formattedSongs,
            total: formattedSongs.length
        });
    }
    catch (error) {
        logger_1.logger.error('Song search failed:', error);
        next(error);
    }
});
router.get('/songs', async (req, res, next) => {
    try {
        logger_1.logger.info('Fetching all songs for autocomplete');
        const songs = await database_1.database.getAllSongs();
        const formattedSongs = songs
            .map((song) => ({
            id: song.id,
            label: `${song.title} - ${song.artist}`,
            title: song.title,
            artist: song.artist
        }))
            .sort((a, b) => a.label.localeCompare(b.label));
        res.json({
            songs: formattedSongs,
            total: formattedSongs.length
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch songs:', error);
        next(error);
    }
});
router.get('/download/:fileId', async (req, res, next) => {
    try {
        const { fileId } = req.params;
        if (!fileId || typeof fileId !== 'string') {
            throw (0, errorHandler_1.createError)('Invalid file ID', 400);
        }
        logger_1.logger.info(`Download requested for file ${fileId}`);
        const { filePath, filename } = await fileService.getFileForDownload(fileId);
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Cache-Control', 'no-cache');
        await fileService.streamFile(filePath, res);
        logger_1.logger.info(`File ${fileId} downloaded successfully`);
    }
    catch (error) {
        next(error);
    }
});
router.get('/jobs', async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;
        const jobs = await jobManager.listJobs(limit, offset);
        res.json({
            jobs,
            pagination: {
                limit,
                offset,
                total: jobs.length
            }
        });
    }
    catch (error) {
        next(error);
    }
});
router.delete('/jobs/:jobId', async (req, res, next) => {
    try {
        const { jobId } = req.params;
        if (!jobId || typeof jobId !== 'string') {
            throw (0, errorHandler_1.createError)('Invalid job ID', 400);
        }
        await jobManager.cancelJob(jobId);
        res.json({
            message: 'Job cancelled successfully',
            jobId
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=musicRoutes.js.map