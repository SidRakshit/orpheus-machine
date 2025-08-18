"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MLService = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../utils/logger");
class MLService {
    constructor() {
        this.baseUrl = process.env.ML_MODEL_URL || 'http://localhost:8000';
        this.apiKey = process.env.ML_MODEL_API_KEY || '';
        this.timeout = parseInt(process.env.ML_TIMEOUT || '300000');
    }
    async generateMusic(midiFiles) {
        try {
            logger_1.logger.info(`Sending ${midiFiles.length} MIDI files to ML model`);
            const base64Files = midiFiles.map(buffer => buffer.toString('base64'));
            const request = {
                midi_files: base64Files,
                options: {
                    temperature: 0.8,
                    creativity: 0.7,
                    length_seconds: 120
                }
            };
            const response = await axios_1.default.post(`${this.baseUrl}/generate`, request, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
                },
                timeout: this.timeout
            });
            if (response.data.status === 'error') {
                throw new Error(response.data.message || 'ML model returned error');
            }
            const generatedMidi = Buffer.from(response.data.generated_midi, 'base64');
            logger_1.logger.info('Successfully generated music with ML model', {
                inputFiles: midiFiles.length,
                outputSize: generatedMidi.length
            });
            return generatedMidi;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                logger_1.logger.error('ML model API error:', {
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
            logger_1.logger.error('Unexpected error in ML service:', error);
            throw new Error('Failed to generate music with ML model');
        }
    }
    async convertMidiToMp3(midiBuffer) {
        try {
            logger_1.logger.info('Converting MIDI to MP3', { midiSize: midiBuffer.length });
            const base64Midi = midiBuffer.toString('base64');
            const response = await axios_1.default.post(`${this.baseUrl}/convert-to-mp3`, {
                midi_data: base64Midi,
                options: {
                    quality: 'high',
                    sample_rate: 44100,
                    bit_rate: 320
                }
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
                },
                timeout: this.timeout
            });
            if (response.data.status === 'error') {
                throw new Error(response.data.message || 'MIDI to MP3 conversion failed');
            }
            const mp3Buffer = Buffer.from(response.data.mp3_data, 'base64');
            logger_1.logger.info('Successfully converted MIDI to MP3', {
                inputSize: midiBuffer.length,
                outputSize: mp3Buffer.length
            });
            return mp3Buffer;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                logger_1.logger.error('MIDI to MP3 conversion API error:', {
                    status: error.response?.status,
                    data: error.response?.data,
                    message: error.message
                });
                throw new Error(`MIDI conversion error: ${error.response?.data?.message || error.message}`);
            }
            logger_1.logger.error('Unexpected error in MIDI to MP3 conversion:', error);
            throw new Error('Failed to convert MIDI to MP3');
        }
    }
    async healthCheck() {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/health`, {
                timeout: 5000
            });
            return response.status === 200;
        }
        catch (error) {
            logger_1.logger.error('ML service health check failed:', error);
            return false;
        }
    }
    async getModelInfo() {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/info`, {
                headers: {
                    ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
                },
                timeout: 10000
            });
            return response.data;
        }
        catch (error) {
            logger_1.logger.error('Failed to get ML model info:', error);
            return null;
        }
    }
}
exports.MLService = MLService;
//# sourceMappingURL=mlService.js.map