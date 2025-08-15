import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Container, AppBar, Toolbar, Typography, Box } from '@mui/material';
import MusicGenerator from './components/MusicGenerator.tsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#9c27b0',
    },
    secondary: {
      main: '#f50057',
    },
    background: {
      default: '#0a0a0a',
      paper: '#1a1a1a',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b0b0b0',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
      background: 'linear-gradient(45deg, #9c27b0 30%, #f50057 90%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(145deg, #1a1a1a 0%, #2a2a2a 100%)',
          border: '1px solid rgba(156, 39, 176, 0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontSize: '1rem',
          fontWeight: 600,
        },
        contained: {
          background: 'linear-gradient(45deg, #9c27b0 30%, #f50057 90%)',
          '&:hover': {
            background: 'linear-gradient(45deg, #7b1fa2 30%, #c51162 90%)',
          },
        },
      },
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ 
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
        }}>
          <AppBar position="static" sx={{ 
            background: 'rgba(26, 26, 26, 0.95)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(156, 39, 176, 0.2)',
          }}>
            <Toolbar>
              <Typography variant="h6" component="div" sx={{ 
                flexGrow: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                fontSize: '1.5rem',
                fontWeight: 700,
              }}>
                🎵 Orpheus Machine
              </Typography>
              <Typography variant="body2" color="text.secondary">
                AI Music Generator
              </Typography>
            </Toolbar>
          </AppBar>
          
          <Container maxWidth="md" sx={{ mt: 4, pb: 4 }}>
            <MusicGenerator />
          </Container>
        </Box>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App; 