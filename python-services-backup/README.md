# Copyright Detection Service

This service provides comprehensive copyright detection using:
- **Dejavu**: Audio fingerprinting for audio copyright detection
- **ThreatExchange PDQ**: Image hashing for photo copyright detection
- **ThreatExchange vPDQ**: Video hashing for video copyright detection

## Setup Instructions

### 1. FFmpeg Configuration

FFmpeg 9.0.1 is already included in the project at `../ffmpeg/bin/`. The audio fingerprinting service automatically configures the FFmpeg path. No external installation is required.

### 2. Install Python Dependencies

```bash
cd python-services
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Create a `.env` file in the `python-services` directory:

```env
DB_HOST=your-supabase-host
DB_USER=your-supabase-user
DB_PASSWORD=your-supabase-password
DB_NAME=your-database-name
DB_PORT=5432
FINGERPRINT_LIMIT=-1
```

### 4. Run Database Migrations

Apply the migrations to create the necessary tables:

```bash
# Apply the migration in Supabase
supabase db push
```

This will create:
- Audio fingerprinting tables (`audio_fingerprints_songs`, `audio_fingerprints`)
- PDQ image hashing tables (`pdq_image_hashes`)
- vPDQ video hashing tables (`vpdq_video_hashes`)

### 5. Start the FastAPI Server

```bash
python fastapi_server.py
```

The server will start on `http://localhost:8000`

### 6. Test the Setup

```bash
# Test audio fingerprinting with a video file
python test_video_upload.py /path/to/test-video.mp4

# Test PDQ image hashing
python threatexchange_worker.py pdq /path/to/test-image.jpg

# Test vPDQ video hashing
python threatexchange_worker.py vpdq /path/to/test-video.mp4
```

## API Endpoints

### Audio Fingerprinting (Dejavu)

#### POST /fingerprint
Fingerprint an audio or video file for copyright detection.

**Request:**
- `file`: Audio or video file (MP3, MP4, WebM, etc.)
- `song_name`: Name of the song/audio
- `owner_id`: Owner's user ID
- `video_id` (optional): Associated video ID

**Response:**
```json
{
  "success": true,
  "song_id": 1,
  "song_name": "My Song",
  "num_hashes": 5000,
  "fingerprint_time": 2.5
}
```

#### POST /recognize
Recognize an audio or video file against the fingerprint database.

**Request:**
- `file`: Audio or video file to recognize

**Response:**
```json
{
  "success": true,
  "matched": true,
  "song_id": 1,
  "song_name": "My Song",
  "confidence": 0.95,
  "offset_seconds": 5.2,
  "match_time": 0.8
}
```

### Image Hashing (PDQ)

#### POST /pdq/hash
Compute PDQ hash for an image file.

**Request:**
- `file`: Image file (JPEG, PNG, etc.)

**Response:**
```json
{
  "success": true,
  "pdq_hash": "f8f8f0cee0f4a84f06370a22038f63f0b36e2ed596621e1d33e6b39c4e9c9b22",
  "quality_score": 0.85,
  "hash_length": 64
}
```

#### POST /pdq/compare
Compare two PDQ hashes for similarity.

**Request:**
- `hash1`: First PDQ hash
- `hash2`: Second PDQ hash
- `threshold`: Hamming distance threshold (default 31)

**Response:**
```json
{
  "success": true,
  "hamming_distance": 15,
  "threshold": 31,
  "is_match": true,
  "similarity": 0.97,
  "similarity_percentage": 97.0
}
```

### Video Hashing (vPDQ)

#### POST /vpdq/hash
Compute vPDQ hash for a video file.

**Request:**
- `file`: Video file (MP4, WebM, etc.)

**Response:**
```json
{
  "success": true,
  "vpdq_hash": "...",
  "frame_count": 150,
  "quality_score": 0.92
}
```

### General Endpoints

#### GET /stats
Get audio fingerprint database statistics.

**Response:**
```json
{
  "success": true,
  "num_songs": 10,
  "num_fingerprints": 50000
}
```

#### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "audio_worker_initialized": true,
  "threat_worker_initialized": true
}
```

#### DELETE /fingerprints/{song_id}
Delete audio fingerprints for a specific song.

## Usage

### From Frontend - Audio Fingerprinting

```typescript
import { audioFingerprintService } from '@/lib/audioFingerprint';

// Fingerprint audio/video for copyright detection
const result = await audioFingerprintService.fingerprintAudio(
  audioFile,
  'Song Name',
  'user-id',
  'video-id' // optional
);

// Recognize audio/video against database
const recognition = await audioFingerprintService.recognizeAudio(audioFile);

// Get database statistics
const stats = await audioFingerprintService.getStats();

// Check server health
const health = await audioFingerprintService.healthCheck();
```

### From Frontend - Image/Video Hashing

```typescript
import { threatExchangeService } from '@/lib/threatExchange';

// Compute PDQ hash for image
const pdqResult = await threatExchangeService.computePDQHash(imageFile);

// Compute vPDQ hash for video
const vpdqResult = await threatExchangeService.computeVPDQHash(videoFile);

// Compare two PDQ hashes
const comparison = await threatExchangeService.comparePDQHashes(hash1, hash2, 31);

// Check server health
const health = await threatExchangeService.healthCheck();
```

## Architecture

- **Dejavu Library**: Audio fingerprinting algorithm (Python)
- **ThreatExchange PDQ**: Image hashing algorithm (256-bit hashes)
- **ThreatExchange vPDQ**: Video hashing algorithm (frame-based)
- **FastAPI Server**: REST API for file uploads and matching
- **FFmpeg**: Audio extraction from video files
- **PostgreSQL Database**: Stores fingerprints, hashes, and metadata
- **TypeScript Services**: Frontend integration layer

## Database Tables

### Audio Fingerprinting
- `audio_fingerprints_songs`: Stores registered audio content
- `audio_fingerprints`: Stores audio fingerprint hashes

### Image Hashing
- `pdq_image_hashes`: Stores PDQ image hashes for copyright detection

### Video Hashing
- `vpdq_video_hashes`: Stores vPDQ video hashes for copyright detection

## Features

### Audio Fingerprinting
- **Automatic Audio Extraction**: FFmpeg extracts audio from video files
- **Mono 44.1kHz Conversion**: Optimal format for fingerprinting
- **Real-time Matching**: Fast recognition against database
- **Confidence Scoring**: Returns match confidence percentage
- **Offset Detection**: Identifies time offset of matches

### Image Hashing (PDQ)
- **256-bit Hashes**: Robust image signatures
- **Quality Scoring**: Hash quality assessment
- **Hamming Distance**: Similarity comparison
- **Rotation/Scale Tolerance**: Resistant to transformations

### Video Hashing (vPDQ)
- **Frame-based Hashing**: Hashes video frames
- **Similarity Matching**: Compares frame sequences
- **Quality Metrics**: Video quality assessment
- **Efficient Storage**: Compact hash representation

## Performance

### Audio Fingerprinting
- **Fingerprinting**: ~3x real-time speed
- **Recognition**: 1-2 seconds for 95%+ accuracy
- **Storage**: ~377 MB for 5.4 million fingerprints (45 songs)

### Image Hashing (PDQ)
- **Hashing**: <100ms per image
- **Matching**: <10ms for 100k hashes
- **Storage**: 64 bytes per hash

### Video Hashing (vPDQ)
- **Hashing**: ~1x real-time speed
- **Matching**: <50ms for 10k videos
- **Storage**: ~256KB per video

## Notes

- **Dejavu**: Excels at exact signal recognition with noise tolerance, not suitable for voice recognition
- **PDQ**: Resistant to rotation, scaling, and compression artifacts
- **vPDQ**: Works well with frame-based video similarity detection
- Supports MP3, MP4, WebM, WAV, JPEG, PNG, and other formats
- Automatic audio extraction from video files
- Confidence based on hash overlap percentage
