# Orpheus Machine Backend

AI-powered music generation service that blends three songs into unique compositions.

## 🎵 Features

- **Song Database Lookup**: Fast PostgreSQL-based song search with S3 MIDI file storage
- **AI Music Generation**: Integration with ML models for creative music synthesis
- **Async Job Processing**: Background processing with real-time status updates
- **File Management**: Automated cleanup and efficient file handling
- **Production Ready**: Comprehensive logging, error handling, and monitoring

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- Redis 6+
- AWS S3 access

### Installation

1. **Clone and setup**:
```bash
cd backend
npm install
```

2. **Configure environment**:
```bash
cp env.example .env
# Edit .env with your settings
```

3. **Setup database**:
```bash
# Create PostgreSQL database
createdb orpheus_music

# Tables will be created automatically on first run
```

4. **Start development server**:
```bash
npm run dev
```

## 📦 Architecture

### Core Components

```
src/
├── server.ts              # Express app and initialization
├── middleware/            # Error handling and validation
├── routes/               # API endpoints
├── services/             # Business logic
│   ├── musicService.ts   # Main orchestration
│   ├── database.ts       # PostgreSQL operations
│   ├── mlService.ts      # AI model integration
│   ├── s3Service.ts      # AWS S3 operations
│   ├── fileService.ts    # Local file management
│   ├── jobManager.ts     # Job status tracking
│   └── redis.ts          # Caching and sessions
└── utils/                # Logging and utilities
```

### API Endpoints

#### Music Generation
```bash
# Start generation
POST /api/generate
{
  "songs": ["Song 1", "Song 2", "Song 3"]
}

# Check status
GET /api/status/:jobId

# Download result
GET /api/download/:fileId
```

#### Health & Monitoring
```bash
GET /api/health              # Basic health check
GET /api/health/detailed     # Service status
GET /api/health/ready        # Kubernetes readiness
GET /api/health/live         # Kubernetes liveness
```

## 🔧 Configuration

### Environment Variables

```bash
# Server
PORT=3001
NODE_ENV=development

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:pass@localhost:5432/orpheus_music

# Redis (Caching)
REDIS_HOST=localhost
REDIS_PORT=6379

# AWS S3 (MIDI Files)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
S3_BUCKET=orpheus-music-files

# ML Model
ML_MODEL_URL=http://localhost:8000
ML_MODEL_API_KEY=your_api_key
```

### Database Schema

The service automatically creates these tables:

**songs**: MIDI file metadata and S3 URLs
```sql
CREATE TABLE songs (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  artist VARCHAR(255) NOT NULL,
  s3_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**jobs**: Generation job tracking
```sql
CREATE TABLE jobs (
  job_id UUID PRIMARY KEY,
  status VARCHAR(20) DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  songs TEXT[] NOT NULL,
  output_file_id VARCHAR(255),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🤖 ML Model Integration

The backend expects your ML service to provide these endpoints:

```bash
# Generate music from MIDI files
POST /generate
{
  "midi_files": ["base64_midi_1", "base64_midi_2", "base64_midi_3"],
  "options": {
    "temperature": 0.8,
    "creativity": 0.7,
    "length_seconds": 120
  }
}

# Convert MIDI to MP3
POST /convert-to-mp3
{
  "midi_data": "base64_midi",
  "options": {
    "quality": "high",
    "sample_rate": 44100
  }
}
```

## 📊 Monitoring

### Logging
- Structured JSON logs with Winston
- Automatic log rotation
- Error tracking and stack traces

### Health Checks
- Database connectivity
- Redis availability  
- ML model status
- S3 access

### Cleanup Tasks
- Automatic old job removal (7 days)
- Generated file cleanup (24 hours)
- Daily statistics logging

## 🔒 Security Features

- Helmet.js security headers
- Rate limiting (10 requests/15min)
- CORS configuration
- Input validation with Joi
- SQL injection protection

## 🚀 Deployment

### Docker Support

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3001
CMD ["node", "dist/server.js"]
```

### Build Commands

```bash
npm run build        # TypeScript compilation
npm run start        # Production server
npm run dev          # Development with hot reload
npm run lint         # Code linting
npm run test         # Run tests
```

## 📈 Performance

- **Caching**: Redis for job status and search results
- **Connection Pooling**: PostgreSQL with 20 max connections
- **Streaming**: Efficient file downloads
- **Background Jobs**: Non-blocking music generation

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection**:
   ```bash
   # Check PostgreSQL is running
   pg_ctl status
   
   # Test connection
   psql $DATABASE_URL -c "SELECT 1"
   ```

2. **Redis Connection**:
   ```bash
   # Check Redis
   redis-cli ping
   ```

3. **S3 Access**:
   ```bash
   # Test AWS credentials
   aws s3 ls s3://your-bucket/
   ```

4. **ML Model**:
   ```bash
   # Check model health
   curl http://localhost:8000/health
   ```

## 🔄 API Usage Examples

### Complete Generation Flow

```javascript
// 1. Start generation
const response = await fetch('/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    songs: ['Bohemian Rhapsody - Queen', 'Stairway to Heaven - Led Zeppelin', 'Hotel California - Eagles']
  })
});
const { jobId } = await response.json();

// 2. Poll for status
const checkStatus = async () => {
  const response = await fetch(`/api/status/${jobId}`);
  const status = await response.json();
  
  if (status.status === 'completed') {
    // 3. Download result
    window.location.href = `/api/download/${status.outputFileId}`;
  } else if (status.status === 'failed') {
    console.error('Generation failed:', status.error);
  } else {
    // Continue polling
    setTimeout(checkStatus, 2000);
  }
};

checkStatus();
```

## 📞 Support

For issues and questions:
- Check the logs: `tail -f logs/combined.log`
- Monitor health: `GET /api/health/detailed`
- Review job status: `GET /api/jobs` 