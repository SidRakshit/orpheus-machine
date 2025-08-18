import { Song } from './database';
export declare class MusicService {
    private jobManager;
    private mlService;
    private s3Service;
    private fileService;
    constructor();
    generateMusic(jobId: string, songTitles: string[]): Promise<void>;
    private findSongFiles;
    private downloadMidiFiles;
    searchSongs(query: string, limit?: number): Promise<Song[]>;
    getSongById(songId: string): Promise<Song | null>;
}
