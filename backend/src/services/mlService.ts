import axios, { AxiosResponse } from 'axios';
import { logger } from '../utils/logger';

export interface MLGenerationRequest {
  midi_files: string[]; // Base64 encoded MIDI files
  options?: {
    temperature?: number;
    creativity?: number;
    length_seconds?: number;
  };
}

export interface MLGenerationResponse {
  generated_midi: string; // Base64 encoded generated MIDI
  status: 'success' | 'error';
  message?: string;
}

export class MLService {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;

  constructor() {
    this.baseUrl = process.env.ML_MODEL_URL || 'http://localhost:8000';
    this.apiKey = process.env.ML_MODEL_API_KEY || '';
    this.timeout = parseInt(process.env.ML_TIMEOUT || '300000'); // 5 minutes default
  }

  async generateMusic(midiFiles: Buffer[]): Promise<Buffer> {
    try {
      logger.info(`Sending ${midiFiles.length} MIDI files to ML model`);

      // Convert buffers to base64
      const base64Files = midiFiles.map(buffer => buffer.toString('base64'));

      const request: MLGenerationRequest = {
        midi_files: base64Files,
        options: {
          temperature: 0.8,
          creativity: 0.7,
          length_seconds: 120 // 2 minutes default
        }
      };

      const response: AxiosResponse<MLGenerationResponse> = await axios.post(
        `${this.baseUrl}/generate`,
        request,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
          },
          timeout: this.timeout
        }
      );

      if (response.data.status === 'error') {
        throw new Error(response.data.message || 'ML model returned error');
      }

      // Convert base64 back to buffer
      const generatedMidi = Buffer.from(response.data.generated_midi, 'base64');
      
      logger.info('Successfully generated music with ML model', {
        inputFiles: midiFiles.length,
        outputSize: generatedMidi.length
      });

      return generatedMidi;

    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('ML model API error:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
        
        if (error.code === 'ECONNREFUSED') {
          throw new Error('ML model service is not available');
        }
        
        if (error.response?.status === 413) {
          throw new Error('MIDI files too large for ML model');
        }
        
        if (error.response?.status === 429) {
          throw new Error('ML model service is busy, please try again later');
        }
        
        throw new Error(`ML model error: ${error.response?.data?.message || error.message}`);
      }

      logger.error('Unexpected error in ML service:', error);
      throw new Error('Failed to generate music with ML model');
    }
  }

  async convertMidiToMp3(midiBuffer: Buffer): Promise<Buffer> {
    try {
      logger.info('Converting MIDI to MP3', { midiSize: midiBuffer.length });

      const base64Midi = midiBuffer.toString('base64');

      const response: AxiosResponse<{ mp3_data: string; status: string; message?: string }> = await axios.post(
        `${this.baseUrl}/convert-to-mp3`,
        {
          midi_data: base64Midi,
          options: {
            quality: 'high',
            sample_rate: 44100,
            bit_rate: 320
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
          },
          timeout: this.timeout
        }
      );

      if (response.data.status === 'error') {
        throw new Error(response.data.message || 'MIDI to MP3 conversion failed');
      }

      const mp3Buffer = Buffer.from(response.data.mp3_data, 'base64');
      
      logger.info('Successfully converted MIDI to MP3', {
        inputSize: midiBuffer.length,
        outputSize: mp3Buffer.length
      });

      return mp3Buffer;

    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('MIDI to MP3 conversion API error:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
        
        throw new Error(`MIDI conversion error: ${error.response?.data?.message || error.message}`);
      }

      logger.error('Unexpected error in MIDI to MP3 conversion:', error);
      throw new Error('Failed to convert MIDI to MP3');
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/health`, {
        timeout: 5000
      });
      
      return response.status === 200;
    } catch (error) {
      logger.error('ML service health check failed:', error);
      return false;
    }
  }

  async getModelInfo(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/info`, {
        headers: {
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
        },
        timeout: 10000
      });
      
      return response.data;
    } catch (error) {
      logger.error('Failed to get ML model info:', error);
      return null;
    }
  }
} 