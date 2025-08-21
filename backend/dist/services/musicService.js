"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MusicService = void 0;
const database_1 = require("./database");
const jobManager_1 = require("./jobManager");
const mlService_1 = require("./mlService");
const s3Service_1 = require("./s3Service");
const fileService_1 = require("./fileService");
const logger_1 = require("../utils/logger");
const uuid_1 = require("uuid");
class MusicService {
    constructor() {
        this.jobManager = new jobManager_1.JobManager();
        this.mlService = new mlService_1.MLService();
        this.s3Service = new s3Service_1.S3Service();
        this.fileService = new fileService_1.FileService();
    }
    async generateMusic(jobId, songTitles) {
        try {
            logger_1.logger.info(`Starting music generation for job ${jobId}`, { songTitles });
            await this.jobManager.updateJobStatus(jobId, 'processing', 10);
            logger_1.logger.info(`Searching for MIDI files for job ${jobId}`);
            const songs = await this.findSongFiles(songTitles);
            await this.jobManager.updateJobStatus(jobId, 'processing', 30);
            if (songs.length === 0) {
                throw new Error('No MIDI files found for the provided songs');
            }
            if (songs.length < 3) {
                logger_1.logger.warn(`Only found ${songs.length}/3 songs for job ${jobId}`, {
                    foundSongs: songs.map(s => ({ title: s.title, artist: s.artist }))
                });
            }
            logger_1.logger.info(`Downloading MIDI files for job ${jobId}`);
            const midiFiles = await this.downloadMidiFiles(songs);
            await this.jobManager.updateJobStatus(jobId, 'processing', 50);
            logger_1.logger.info(`Sending files to ML model for job ${jobId}`);
            const generatedMidiBuffer = await this.mlService.generateMusic(midiFiles);
            await this.jobManager.updateJobStatus(jobId, 'processing', 80);
            logger_1.logger.info(`Converting MIDI to MP3 for job ${jobId}`);
            const mp3Buffer = await this.mlService.convertMidiToMp3(generatedMidiBuffer);
            await this.jobManager.updateJobStatus(jobId, 'processing', 95);
            const outputFileId = (0, uuid_1.v4)();
            const outputPath = await this.fileService.saveGeneratedFile(outputFileId, mp3Buffer);
            await this.jobManager.updateJobStatus(jobId, 'completed', 100, undefined, outputFileId);
            logger_1.logger.info(`Music generation completed for job ${jobId}`, {
                outputFileId,
                outputPath,
                foundSongs: songs.length
            });
        }
        catch (error) {
            logger_1.logger.error(`Music generation failed for job ${jobId}:`, error);
            await this.jobManager.updateJobStatus(jobId, 'failed', 0, error instanceof Error ? error.message : 'Unknown error occurred');
            throw error;
        }
    }
    async findSongFiles(songTitles) {
        try {
            logger_1.logger.info(`Searching for songs (including all versions): ${songTitles.join(', ')}`);
            const allVersions = await database_1.database.findSongsByTitlesWithAllVersions(songTitles);
            logger_1.logger.info(`Found ${allVersions.length} total song files (including versions)`, {
                songs: allVersions.map(s => ({ title: s.title, artist: s.artist }))
            });
            if (allVersions.length === 0) {
                let allSongs = [];
                for (const songTitle of songTitles) {
                    logger_1.logger.info(`Fuzzy searching for: ${songTitle}`);
                    const searchResults = await database_1.database.searchSongs(songTitle, 5);
                    if (searchResults.length > 0) {
                        for (const result of searchResults) {
                            const baseTitle = this.extractBaseTitle(result.title);
                            const versions = await database_1.database.findAllVersionsOfSong(baseTitle);
                            allSongs.push(...versions);
                        }
                    }
                }
                const uniqueSongs = allSongs.filter((song, index, arr) => arr.findIndex(s => s.id === song.id) === index);
                return uniqueSongs;
            }
            return allVersions;
        }
        catch (error) {
            logger_1.logger.error('Failed to find song files:', error);
            throw new Error('Failed to search for MIDI files in database');
        }
    }
    async downloadMidiFiles(songs) {
        try {
            const downloadPromises = songs.map(async (song) => {
                logger_1.logger.info(`Downloading MIDI file for: ${song.title} - ${song.artist}`);
                return await this.s3Service.downloadFile(song.midi_s3_key);
            });
            const midiFiles = await Promise.all(downloadPromises);
            logger_1.logger.info(`Successfully downloaded ${midiFiles.length} MIDI files`);
            return midiFiles;
        }
        catch (error) {
            logger_1.logger.error('Failed to download MIDI files:', error);
            throw new Error('Failed to download MIDI files from S3');
        }
    }
    async searchSongs(query, limit = 10) {
        try {
            return await database_1.database.searchSongsForFrontend(query, limit);
        }
        catch (error) {
            logger_1.logger.error(`Failed to search songs for query: ${query}`, error);
            throw error;
        }
    }
    async getSongById(songId) {
        try {
            const songs = await database_1.database.findSongsByTitles([songId]);
            return songs[0] || null;
        }
        catch (error) {
            logger_1.logger.error(`Failed to get song by ID: ${songId}`, error);
            throw error;
        }
    }
    extractBaseTitle(title) {
        return title.replace(/\.\d+$/, '').trim();
    }
}
exports.MusicService = MusicService;
//# sourceMappingURL=musicService.js.map