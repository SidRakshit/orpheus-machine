export interface MLGenerationRequest {
    midi_files: string[];
    options?: {
        temperature?: number;
        creativity?: number;
        length_seconds?: number;
    };
}
export interface MLGenerationResponse {
    generated_midi: string;
    status: 'success' | 'error';
    message?: string;
}
export declare class MLService {
    private baseUrl;
    private apiKey;
    private timeout;
    constructor();
    generateMusic(midiFiles: Buffer[]): Promise<Buffer>;
    convertMidiToMp3(midiBuffer: Buffer): Promise<Buffer>;
    healthCheck(): Promise<boolean>;
    getModelInfo(): Promise<any>;
}
