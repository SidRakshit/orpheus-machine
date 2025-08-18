# CSV Import Guide

This guide explains how to import your CSV file with song data into the PostgreSQL database.

## CSV Format Requirements

Your CSV file should have **4 columns in this exact order**:

1. `midi_s3_key` - S3 URL/key for the MIDI file (required)
2. `token_s3_key` - S3 URL/key for the token file (optional, can be empty)
3. `artist` - Artist name (required)
4. `title` - Song title (required)

### Example CSV Format:
```csv
s3://bucket/midi/song1.mid,s3://bucket/tokens/song1.token,Artist Name,Song Title
s3://bucket/midi/song2.mid,,Another Artist,Another Song
s3://bucket/midi/song3.mid,s3://bucket/tokens/song3.token,Third Artist,Third Song
```

**Important Notes:**
- **No header row** - The script expects data to start from the first line
- **No quotes** around values unless they contain commas
- **Empty token_s3_key** is allowed (just leave it blank between commas)
- **Required fields**: midi_s3_key, artist, title

## How to Import

### Step 1: Install Dependencies
```bash
cd backend
npm install
```

### Step 2: Prepare Your CSV File
- Save your CSV file somewhere accessible (e.g., `./data/songs.csv`)
- Make sure it follows the format above
- Test with a small sample first

### Step 3: Set Up Environment
Make sure your `.env` file has the correct database connection:
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/orpheus_music
```

### Step 4: Run the Import
```bash
npm run import-csv path/to/your/songs.csv
```

Example:
```bash
npm run import-csv ./data/songs.csv
npm run import-csv /Users/username/Downloads/my-songs.csv
```

## What Happens During Import

1. **Database Connection**: Connects to PostgreSQL
2. **CSV Parsing**: Reads and validates each row
3. **Data Cleaning**: Trims whitespace and validates required fields
4. **Bulk Insert**: Inserts songs in a transaction
5. **Error Handling**: Skips duplicates and logs any issues
6. **Reporting**: Shows how many songs were successfully imported

## Error Handling

The script will:
- **Skip rows** with missing required fields (midi_s3_key, artist, or title)
- **Skip duplicates** if they already exist in the database
- **Continue processing** even if some rows fail
- **Log all issues** to help you identify problems

## Sample Files

- `sample-songs.csv` - Example of correct format
- Check the logs for detailed import results

## Troubleshooting

### Common Issues:

1. **"CSV file not found"**
   - Check the file path is correct
   - Use absolute paths if relative paths don't work

2. **"Database connection failed"**
   - Verify your DATABASE_URL in .env
   - Make sure PostgreSQL is running
   - Check database credentials

3. **"No valid songs found"**
   - Check CSV format matches requirements
   - Ensure required fields are not empty
   - Remove header row if present

4. **"Permission denied"**
   - Check file permissions
   - Make sure the CSV file is readable

### Getting Help

Check the console output and log files for detailed error messages:
- Console shows progress and summary
- Log files in `logs/` directory contain detailed information

## Database Schema

The songs are stored in this table structure:
```sql
CREATE TABLE songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  midi_s3_key TEXT NOT NULL,
  token_s3_key TEXT,
  artist VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
``` 