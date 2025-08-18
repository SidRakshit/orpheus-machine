import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { database, initializeDatabase } from '../src/services/database';
import { logger } from '../src/utils/logger';

interface CSVRow {
  midi_s3_key: string;
  token_s3_key: string;
  artist: string;
  title: string;
}

async function importCSV(csvFilePath: string): Promise<void> {
  try {
    // Initialize database connection
    await initializeDatabase();
    logger.info('Database initialized for CSV import');

    const songsData: Array<{
      midi_s3_key: string;
      token_s3_key?: string;
      artist: string;
      title: string;
    }> = [];

    // Check if file exists
    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`CSV file not found: ${csvFilePath}`);
    }

    logger.info(`Reading CSV file: ${csvFilePath}`);

    // Parse CSV file
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv({
          // Map CSV columns to our expected format
          // Assumes CSV order: midi_s3_key, token_s3_key, artist, title
          headers: ['midi_s3_key', 'token_s3_key', 'artist', 'title']
        }))
        .on('data', (row: CSVRow) => {
          // Clean and validate the data
          const midi_s3_key = row.midi_s3_key?.trim();
          const token_s3_key = row.token_s3_key?.trim();
          const artist = row.artist?.trim();
          const title = row.title?.trim();

          // Skip rows with missing required fields
          if (!midi_s3_key || !artist || !title) {
            logger.warn('Skipping row with missing required fields:', { midi_s3_key, artist, title });
            return;
          }

          const cleanedRow: {
            midi_s3_key: string;
            token_s3_key?: string;
            artist: string;
            title: string;
          } = {
            midi_s3_key,
            artist,
            title
          };

          // Only add token_s3_key if it has a value
          if (token_s3_key && token_s3_key.length > 0) {
            cleanedRow.token_s3_key = token_s3_key;
          }

          songsData.push(cleanedRow);
        })
        .on('end', () => {
          logger.info(`Parsed ${songsData.length} songs from CSV`);
          resolve();
        })
        .on('error', (error) => {
          logger.error('Error parsing CSV:', error);
          reject(error);
        });
    });

    if (songsData.length === 0) {
      logger.warn('No valid songs found in CSV file');
      return;
    }

    // Import songs to database
    logger.info('Starting bulk insert to database...');
    const insertedCount = await database.bulkInsertSongs(songsData);
    
    logger.info(`CSV import completed successfully! Inserted ${insertedCount} out of ${songsData.length} songs`);
    
  } catch (error) {
    logger.error('CSV import failed:', error);
    throw error;
  } finally {
    // Close database connection
    await database.close();
  }
}

// Command line usage
if (require.main === module) {
  const csvFilePath = process.argv[2];
  
  if (!csvFilePath) {
    console.error('Usage: npm run import-csv <path-to-csv-file>');
    console.error('Example: npm run import-csv ./data/songs.csv');
    process.exit(1);
  }

  importCSV(csvFilePath)
    .then(() => {
      console.log('CSV import completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('CSV import failed:', error.message);
      process.exit(1);
    });
}

export { importCSV }; 