import React, { useState,  useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  LinearProgress,
  Alert,
  IconButton,
  Chip,
  Stack,
  Paper,
  CircularProgress,
} from '@mui/material';
import { 
  PlayArrow, 
  Download, 
  Refresh, 
  MusicNote,
  AutoAwesome,
  CloudDownload 
} from '@mui/icons-material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { generateMusic, getJobStatus, downloadFile } from '../services/api.ts';

interface GenerationState {
  jobId: string | null;
  status: 'idle' | 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  outputFileId: string | null;
  error: string | null;
}

const MusicGenerator: React.FC = () => {
  const [songs, setSongs] = useState<[string, string, string]>(['', '', '']);
  const [generationState, setGenerationState] = useState<GenerationState>({
    jobId: null,
    status: 'idle',
    progress: 0,
    outputFileId: null,
    error: null,
  });

  const generateMutation = useMutation({
    mutationFn: generateMusic,
    onSuccess: (data: any) => {
      setGenerationState({
        jobId: data.jobId,
        status: 'pending',
        progress: 0,
        outputFileId: null,
        error: null,
      });
    },
    onError: (error: any) => {
      setGenerationState(prev => ({
        ...prev,
        status: 'failed',
        error: error.response?.data?.error || 'Failed to start generation',
      }));
    },
  });

  const { data: jobStatus } = useQuery({
    queryKey: ['jobStatus', generationState.jobId],
    queryFn: () => getJobStatus(generationState.jobId!),
    enabled: !!generationState.jobId && 
             generationState.status !== 'completed' && 
             generationState.status !== 'failed',
    refetchInterval: 2000,
  });

  // Update state when jobStatus changes
  useEffect(() => {
    if (jobStatus) {
      setGenerationState(prev => ({
        ...prev,
        status: jobStatus.status,
        progress: jobStatus.progress,
        outputFileId: jobStatus.outputFileId || null,
        error: jobStatus.error || null,
      }));
    }
  }, [jobStatus]);

  const handleSongChange = (index: number, value: string) => {
    const newSongs = [...songs] as [string, string, string];
    newSongs[index] = value;
    setSongs(newSongs);
  };

  const handleGenerate = () => {
    if (songs.every(song => song.trim())) {
      generateMutation.mutate({ 
        songs: songs.map(s => s.trim()) as [string, string, string] 
      });
    }
  };

  const handleDownload = async () => {
    if (generationState.outputFileId) {
      try {
        await downloadFile(generationState.outputFileId);
      } catch (error) {
        console.error('Download failed:', error);
      }
    }
  };

  const handleReset = () => {
    setGenerationState({
      jobId: null,
      status: 'idle',
      progress: 0,
      outputFileId: null,
      error: null,
    });
    setSongs(['', '', '']);
  };

  const isGenerating = generationState.status === 'pending' || generationState.status === 'processing';
  const canGenerate = songs.every(song => song.trim()) && !isGenerating;

  const getStatusColor = () => {
    switch (generationState.status) {
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'processing': return 'warning';
      default: return 'primary';
    }
  };

  const getProgressText = () => {
    switch (generationState.status) {
      case 'pending': return 'Initializing...';
      case 'processing': 
        if (generationState.progress < 30) return 'Searching for MIDI files...';
        if (generationState.progress < 70) return 'AI generating music...';
        if (generationState.progress < 90) return 'Synthesizing audio...';
        return 'Finalizing...';
      case 'completed': return 'Generation complete!';
      case 'failed': return 'Generation failed';
      default: return '';
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box textAlign="center" mb={4}>
        <Typography variant="h4" gutterBottom sx={{ mb: 2 }}>
          AI Music Generator
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
          Blend three songs into a unique AI-generated masterpiece
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 3 }}>
          <Chip icon={<MusicNote />} label="MIDI Processing" size="small" />
          <Chip icon={<AutoAwesome />} label="AI Generation" size="small" />
          <Chip icon={<CloudDownload />} label="MP3 Output" size="small" />
        </Box>
      </Box>

      {/* Main Card */}
      <Card elevation={0} sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>
          {/* Song Input Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1, 
              mb: 3 
            }}>
              🎵 Song Selection
            </Typography>
            <Stack spacing={3}>
              {songs.map((song, index) => (
                <Paper 
                  key={index} 
                  elevation={0} 
                  sx={{ 
                    p: 2, 
                    background: 'rgba(156, 39, 176, 0.05)',
                    border: '1px solid rgba(156, 39, 176, 0.1)',
                    borderRadius: 2,
                  }}
                >
                  <TextField
                    fullWidth
                    label={`Song ${index + 1}`}
                    placeholder={
                      index === 0 ? 'e.g., Bohemian Rhapsody - Queen' :
                      index === 1 ? 'e.g., Stairway to Heaven - Led Zeppelin' :
                      'e.g., Hotel California - Eagles'
                    }
                    value={song}
                    onChange={(e) => handleSongChange(index, e.target.value)}
                    disabled={isGenerating}
                    variant="outlined"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': {
                          borderColor: 'rgba(156, 39, 176, 0.2)',
                        },
                        '&:hover fieldset': {
                          borderColor: 'rgba(156, 39, 176, 0.4)',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#9c27b0',
                        },
                      },
                    }}
                  />
                </Paper>
              ))}
            </Stack>
          </Box>

          {/* Status Section */}
          {generationState.status !== 'idle' && (
            <Box sx={{ mb: 4 }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                mb: 2 
              }}>
                <Typography variant="h6">Generation Status</Typography>
                <Chip 
                  label={generationState.status.toUpperCase()} 
                  color={getStatusColor()}
                  size="small"
                />
              </Box>
              
              {isGenerating && (
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={generationState.progress} 
                      sx={{ 
                        flexGrow: 1,
                        height: 8,
                        borderRadius: 4,
                        background: 'rgba(156, 39, 176, 0.1)',
                        '& .MuiLinearProgress-bar': {
                          background: 'linear-gradient(90deg, #9c27b0, #f50057)',
                          borderRadius: 4,
                        }
                      }}
                    />
                    <Typography variant="body2" color="text.secondary" minWidth="40px">
                      {generationState.progress}%
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {getProgressText()}
                  </Typography>
                </Box>
              )}

              {generationState.error && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                  {generationState.error}
                </Alert>
              )}

              {generationState.status === 'completed' && (
                <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
                  🎉 Your music has been generated successfully! Click download to save your creation.
                </Alert>
              )}
            </Box>
          )}

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              onClick={handleGenerate}
              disabled={!canGenerate}
              startIcon={isGenerating ? <CircularProgress size={20} /> : <PlayArrow />}
              sx={{ 
                minWidth: 180,
                height: 48,
                fontSize: '1.1rem',
              }}
            >
              {isGenerating ? 'Generating...' : 'Generate Music'}
            </Button>

            {generationState.status === 'completed' && generationState.outputFileId && (
              <Button
                variant="outlined"
                size="large"
                onClick={handleDownload}
                startIcon={<Download />}
                sx={{ 
                  minWidth: 160,
                  height: 48,
                  borderColor: '#9c27b0',
                  color: '#9c27b0',
                  '&:hover': {
                    borderColor: '#7b1fa2',
                    background: 'rgba(156, 39, 176, 0.1)',
                  }
                }}
              >
                Download MP3
              </Button>
            )}

            {generationState.status !== 'idle' && (
              <IconButton 
                onClick={handleReset} 
                color="secondary"
                sx={{ 
                  width: 48,
                  height: 48,
                  border: '1px solid rgba(245, 0, 87, 0.3)',
                  '&:hover': {
                    background: 'rgba(245, 0, 87, 0.1)',
                  }
                }}
              >
                <Refresh />
              </IconButton>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Info Section */}
      <Box mt={4} textAlign="center">
        <Typography variant="body2" color="text.secondary">
          The AI will search for MIDI files matching your songs, blend their musical characteristics, 
          and generate a unique composition synthesized as an MP3 file.
        </Typography>
      </Box>
    </Box>
  );
};

export default MusicGenerator; 