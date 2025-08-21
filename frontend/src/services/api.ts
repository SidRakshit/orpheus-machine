import axios from 'axios';

const API_BASE_URL = (window as any).env?.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export interface GenerationRequest {
  songs: [string, string, string];
}

export interface GenerationResponse {
  jobId: string;
  status: string;
  message: string;
}

export interface JobStatusResponse {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  songs: [string, string, string];
  createdAt: string;
  completedAt?: string;
  outputFileId?: string;
  error?: string;
}

export interface SongSuggestion {
  id: string;
  label: string;
  title: string;
  artist: string;
}

export interface SearchResponse {
  songs: SongSuggestion[];
  total: number;
}

export const generateMusic = async (request: GenerationRequest): Promise<GenerationResponse> => {
  const response = await api.post('/generate', request);
  return response.data;
};

export const getJobStatus = async (jobId: string): Promise<JobStatusResponse> => {
  const response = await api.get(`/status/${jobId}`);
  return response.data;
};

export const downloadFile = async (fileId: string): Promise<void> => {
  const response = await api.get(`/download/${fileId}`, {
    responseType: 'blob',
  });

  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `orpheus_generated_${fileId.slice(0, 8)}.mp3`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const searchSongs = async (query: string, limit: number = 20): Promise<SearchResponse> => {
  if (!query || query.trim().length < 2) {
    return { songs: [], total: 0 };
  }
  
  const response = await api.get('/search', {
    params: { q: query.trim(), limit }
  });
  return response.data;
};

export const getAllSongs = async (): Promise<SearchResponse> => {
  const response = await api.get('/songs');
  return response.data;
}; 