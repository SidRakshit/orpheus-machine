# Orpheus Machine - Frontend

A beautiful React frontend for the Orpheus Machine AI music generator.

## Features

- 🎵 **Song Input Interface** - Clean, intuitive form for entering three song names
- 🎨 **Beautiful Dark Theme** - Modern Material-UI dark theme with gradient accents
- 📊 **Real-time Progress Tracking** - Live updates during music generation process
- 💾 **One-click Downloads** - Direct MP3 download when generation completes
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices
- ⚡ **Fast Performance** - Built with React 19 and optimized for speed

## Technology Stack

- **React 19** with TypeScript
- **Material-UI v5** for beautiful components
- **TanStack Query** for efficient API state management
- **Axios** for HTTP requests
- **Inter Font** for modern typography

## Getting Started

### Prerequisites
- Node.js 18 or higher
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000)

### Environment Variables

Create a `.env` file in the root directory:

```env
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_NAME=Orpheus Machine
REACT_APP_VERSION=1.0.0
```

## Usage

1. **Enter Songs**: Input three song names in the provided fields
2. **Generate**: Click "Generate Music" to start the AI process
3. **Monitor Progress**: Watch real-time progress updates
4. **Download**: Once complete, download your unique MP3 creation

## API Integration

The frontend communicates with the backend through these endpoints:

- `POST /api/generate` - Start music generation
- `GET /api/status/:jobId` - Check generation status
- `GET /api/download/:fileId` - Download generated file

## Development

### Available Scripts

- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App

### Project Structure

```
src/
├── components/          # React components
│   └── MusicGenerator.tsx
├── services/           # API service layer
│   └── api.ts
├── App.tsx            # Main app component
└── index.tsx          # Entry point
```

## Styling

The app uses a custom Material-UI theme with:
- **Primary Color**: Purple (#9c27b0)
- **Secondary Color**: Pink (#f50057)
- **Dark Mode**: Custom dark theme with gradients
- **Typography**: Inter font family

## Build for Production

```bash
npm run build
```

Builds the app for production to the `build` folder with optimized bundles.

## License

Part of the Orpheus Machine project.
