import { database, Song } from './database';
import { JobManager } from './jobManager';
import { MLService } from './mlService';
import { S3Service } from './s3Service';
import { FileService } from './fileService';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class MusicService {
  private jobManager: JobManager;
  private mlService: MLService;
  private s3Service: S3Service;
  private fileService: FileService;

  constructor() {
    this.jobManager = new JobManager();
    this.mlService = new MLService();
    this.s3Service = new S3Service();
    this.fileService = new FileService();
  }

  async generateMusic(jobId: string, songTitles: string[]): Promise<void> {
    try {
      logger.info(`Starting music generation for job ${jobId}`, { songTitles });

      // Step 1: Update status to processing
      await this.jobManager.updateJobStatus(jobId, 'processing', 10);

      // Step 2: Search for MIDI files in database (20% progress)
      logger.info(`Searching for MIDI files for job ${jobId}`);
      const songs = await this.findSongFiles(songTitles);
      await this.jobManager.updateJobStatus(jobId, 'processing', 30);

      if (songs.length === 0) {
        throw new Error('No MIDI files found for the provided songs');
      }

      if (songs.length < 3) {
        logger.warn(`Only found ${songs.length}/3 songs for job ${jobId}`, {
          foundSongs: songs.map(s => ({ title: s.title, artist: s.artist }))
        });
      }

      // Step 3: Download MIDI files from S3 (40% progress)
      logger.info(`Downloading MIDI files for job ${jobId}`);
      const midiFiles = await this.downloadMidiFiles(songs);
      await this.jobManager.updateJobStatus(jobId, 'processing', 50);

      // Step 4: Send to ML model for processing (70% progress)
      logger.info(`Sending files to ML model for job ${jobId}`);
      const generatedMidiBuffer = await this.mlService.generateMusic(midiFiles);
      await this.jobManager.updateJobStatus(jobId, 'processing', 80);

      // Step 5: Convert MIDI to MP3 (90% progress)
      logger.info(`Converting MIDI to MP3 for job ${jobId}`);
      const mp3Buffer = await this.mlService.convertMidiToMp3(generatedMidiBuffer);
      await this.jobManager.updateJobStatus(jobId, 'processing', 95);

      // Step 6: Save output file and update job status (100% progress)
      const outputFileId = uuidv4();
      const outputPath = await this.fileService.saveGeneratedFile(outputFileId, mp3Buffer);
      
      await this.jobManager.updateJobStatus(jobId, 'completed', 100, undefined, outputFileId);
      
      logger.info(`Music generation completed for job ${jobId}`, {
        outputFileId,
        outputPath,
        foundSongs: songs.length
      });

    } catch (error) {
      logger.error(`Music generation failed for job ${jobId}:`, error);
      await this.jobManager.updateJobStatus(
        jobId, 
        'failed', 
        0, 
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
      throw error;
    }
  }

  private async findSongFiles(songTitles: string[]): Promise<Song[]> {
    try {
      logger.info(`Searching for songs (including all versions): ${songTitles.join(', ')}`);
      
      // Use the new method that finds ALL versions of each song
      const allVersions = await database.findSongsByTitlesWithAllVersions(songTitles);
      
      logger.info(`Found ${allVersions.length} total song files (including versions)`, {
        songs: allVersions.map(s => ({ title: s.title, artist: s.artist }))
      });
      
      if (allVersions.length === 0) {
        // Fallback to fuzzy search if no exact matches
        let allSongs: Song[] = [];
        
        for (const songTitle of songTitles) {
          logger.info(`Fuzzy searching for: ${songTitle}`);
          const searchResults = await database.searchSongs(songTitle, 5);
          
          if (searchResults.length > 0) {
            // For each search result, try to get all versions
            for (const result of searchResults) {
              const baseTitle = this.extractBaseTitle(result.title);
              const versions = await database.findAllVersionsOfSong(baseTitle);
              allSongs.push(...versions);
            }
          }
        }
        
        // Remove duplicates
        const uniqueSongs = allSongs.filter((song, index, arr) => 
          arr.findIndex(s => s.id === song.id) === index
        );
        
        return uniqueSongs;
      }
      
      return allVersions;

    } catch (error) {
      logger.error('Failed to find song files:', error);
      throw new Error('Failed to search for MIDI files in database');
    }
  }

  private async downloadMidiFiles(songs: Song[]): Promise<Buffer[]> {
    try {
      const downloadPromises = songs.map(async (song) => {
        logger.info(`Downloading MIDI file for: ${song.title} - ${song.artist}`);
        return await this.s3Service.downloadFile(song.midi_s3_key);
      });

      const midiFiles = await Promise.all(downloadPromises);
      logger.info(`Successfully downloaded ${midiFiles.length} MIDI files`);
      
      return midiFiles;

    } catch (error) {
      logger.error('Failed to download MIDI files:', error);
      throw new Error('Failed to download MIDI files from S3');
    }
  }

  async searchSongs(query: string, limit: number = 10): Promise<Song[]> {
    try {
      return await database.searchSongsForFrontend(query, limit);
    } catch (error) {
      logger.error(`Failed to search songs for query: ${query}`, error);
      throw error;
    }
  }

  async getSongById(songId: string): Promise<Song | null> {
    try {
      const songs = await database.findSongsByTitles([songId]);
      return songs[0] || null;
    } catch (error) {
      logger.error(`Failed to get song by ID: ${songId}`, error);
      throw error;
    }
  }

  // Add this method to extract base title from versioned titles
  private extractBaseTitle(title: string): string {
    return title.replace(/\.\d+$/, '').trim();
  }
} 