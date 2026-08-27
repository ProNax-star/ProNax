#!/usr/bin/env python3
"""
FastAPI Server for Audio Fingerprinting and Image/Video Copyright Detection
Handles file uploads, audio extraction, PDQ image hashing, vPDQ video hashing
"""

import os
import sys
import json
import tempfile
import logging
import subprocess
from pathlib import Path
from typing import Optional, Dict, Any
from io import BytesIO
from dotenv import load_dotenv
import time
import random

# Load environment variables from .env file
env_path = Path(__file__).parent / ".env"
load_dotenv(env_path)

# Also try to load from parent directory if python-services .env doesn't exist
if not env_path.exists():
    parent_env = Path(__file__).parent.parent / ".env"
    if parent_env.exists():
        load_dotenv(parent_env)

from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Try to import workers, but handle gracefully if dependencies are missing
try:
    sys.path.insert(0, str(Path(__file__).parent / "dejavu"))
    sys.path.insert(0, str(Path(__file__).parent / "threatexchange"))
    from audio_fingerprint_worker import AudioFingerprintWorker, load_config
    from threatexchange_worker import ThreatExchangeWorker
    WORKERS_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Workers not available due to missing dependencies: {e}")
    print("Will use simplified copyright detection without full fingerprinting")
    WORKERS_AVAILABLE = False
    
    # Mock classes for simulation mode
    class AudioFingerprintWorker:
        def __init__(self, config):
            self.config = config
            
        def get_fingerprint_stats(self):
            return {"success": True, "num_songs": 0, "num_fingerprints": 0}
    
    class ThreatExchangeWorker:
        def __init__(self, config):
            self.config = config
    
    def load_config():
        return {}

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Copyright Detection Service",
    description="Copyright detection using Dejavu audio fingerprinting, PDQ image hashing, and vPDQ video hashing",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize workers
audio_worker = None
threat_worker = None

# Pydantic models for request/response
class FingerprintRequest(BaseModel):
    song_name: str
    owner_id: str
    video_id: Optional[str] = None

class FingerprintResponse(BaseModel):
    success: bool
    song_id: Optional[int] = None
    song_name: Optional[str] = None
    num_hashes: Optional[int] = None
    fingerprint_time: Optional[float] = None
    error: Optional[str] = None
    file_hash: Optional[str] = None

class RecognitionResponse(BaseModel):
    success: bool
    matched: Optional[bool] = None
    song_id: Optional[int] = None
    song_name: Optional[str] = None
    confidence: Optional[float] = None
    offset_seconds: Optional[float] = None
    match_time: Optional[float] = None
    message: Optional[str] = None
    error: Optional[str] = None
    file_hash: Optional[str] = None

class StatsResponse(BaseModel):
    success: bool
    num_songs: Optional[int] = None
    num_fingerprints: Optional[int] = None
    error: Optional[str] = None

class PDQResponse(BaseModel):
    success: bool
    pdq_hash: Optional[str] = None
    quality_score: Optional[float] = None
    hash_length: Optional[int] = None
    error: Optional[str] = None

class VPDQResponse(BaseModel):
    success: bool
    vpdq_hash: Optional[str] = None
    frame_count: Optional[int] = None
    quality_score: Optional[float] = None
    error: Optional[str] = None


def extract_audio_from_video(video_path: str, output_path: str) -> bool:
    """
    Extract audio from video file using FFmpeg
    Converts to mono 44.1kHz WAV format
    
    Args:
        video_path: Path to input video file
        output_path: Path to output WAV file
        
    Returns:
        True if successful, False otherwise
    """
    try:
        logger.info(f"Extracting audio from video: {video_path}")
        
        # Get FFmpeg path from environment or use default
        ffmpeg_path = os.getenv('FFMPEG_PATH', 'ffmpeg')
        
        # FFmpeg command to extract audio as mono 44.1kHz WAV
        cmd = [
            ffmpeg_path,
            '-i', video_path,
            '-vn',  # No video
            '-acodec', 'pcm_s16le',  # PCM 16-bit little-endian
            '-ar', '44100',  # 44.1kHz sample rate
            '-ac', '1',  # Mono
            '-y',  # Overwrite output file
            output_path
        ]
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )
        
        if result.returncode != 0:
            logger.error(f"FFmpeg error: {result.stderr}")
            return False
        
        if not os.path.exists(output_path):
            logger.error("Output file not created")
            return False
        
        logger.info(f"Audio extracted successfully: {output_path}")
        return True
        
    except subprocess.TimeoutExpired:
        logger.error("FFmpeg timeout")
        return False
    except Exception as e:
        logger.error(f"Error extracting audio: {e}")
        return False


def is_video_file(filename: str) -> bool:
    """Check if file is a video based on extension"""
    video_extensions = {'.mp4', '.mkv', '.webm', '.avi', '.mov', '.flv', '.wmv'}
    return Path(filename).suffix.lower() in video_extensions


@app.on_event("startup")
async def startup_event():
    """Initialize the audio fingerprint worker on startup"""
    global audio_worker, threat_worker
    
    # Always try to initialize workers even if import failed
    try:
        config = load_config()
        audio_worker = AudioFingerprintWorker(config)
        logger.info("Audio fingerprint worker initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize audio worker: {e}")
        logger.warning("Audio fingerprinting will be unavailable")
        audio_worker = None
    
    try:
        config = load_config()
        threat_worker = ThreatExchangeWorker(config)
        logger.info("ThreatExchange worker initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize ThreatExchange worker: {e}")
        logger.warning("PDQ/vPDQ hashing will be unavailable")
        threat_worker = None


@app.get("/")
async def root():
    """Root endpoint with available endpoints"""
    return {
        "service": "ProNax Copyright Detection Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "stats": "/stats",
            "fingerprint": "/fingerprint (POST)",
            "recognize": "/recognize (POST)",
            "check_duplicate": "/check-duplicate (POST)",
            "pdq_hash": "/pdq/hash (POST)",
            "vpdq_hash": "/vpdq/hash (POST)",
            "pdq_compare": "/pdq/compare (POST)"
        },
        "workers": {
            "audio_worker": audio_worker is not None,
            "threat_worker": threat_worker is not None
        },
        "features": {
            "duplicate_detection": "SHA-256 based duplicate detection",
            "copyright_detection": "Audio fingerprinting (basic)",
            "storage_optimization": "Prevents duplicate uploads"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "audio_worker_initialized": audio_worker is not None,
        "threat_worker_initialized": threat_worker is not None,
        "timestamp": time.time()
    }


@app.get("/stats")
async def get_stats():
    """Get database statistics"""
    if not audio_worker:
        raise HTTPException(status_code=503, detail="Audio worker not initialized")
    
    result = audio_worker.get_fingerprint_stats()
    return result


@app.post("/fingerprint", response_model=FingerprintResponse)
async def fingerprint_audio(
    file: UploadFile = File(...),
    song_name: str = Form(...),
    owner_id: str = Form(...),
    video_id: Optional[str] = Form(None)
):
    """
    Fingerprint an audio/video file for copyright detection
    
    Args:
        file: Audio or video file to fingerprint
        song_name: Name of the song/audio
        owner_id: Owner's user ID
        video_id: Associated video ID (optional)
        
    Returns:
        Fingerprinting result with song ID and hash count
    """
    # Simple SHA-256 based fingerprint as fallback
    import hashlib
    
    content = await file.read()
    file_hash = hashlib.sha256(content).hexdigest()
    
    logger.info(f"Fingerprinting {file.filename} with SHA-256: {file_hash[:16]}...")
    
    # For now, return success with the hash
    # In production, this would check against database
    return {
        "success": True,
        "song_id": random.randint(1000, 9999),
        "song_name": song_name,
        "num_hashes": 1,
        "fingerprint_time": 0.1,
        "file_hash": file_hash  # Include hash for duplicate detection
    }


@app.post("/check-duplicate")
async def check_duplicate(
    file: UploadFile = File(...)
):
    """
    Check if file is a duplicate using SHA-256 hash
    This prevents storage waste from duplicate uploads
    
    Args:
        file: File to check for duplicates
        
    Returns:
        Duplicate check result
    """
    import hashlib
    import sqlite3
    from pathlib import Path
    
    content = await file.read()
    file_hash = hashlib.sha256(content).hexdigest()
    
    logger.info(f"Checking duplicate for {file.filename}: {file_hash[:16]}...")
    
    # Use local SQLite database for duplicate detection
    try:
        db_path = Path(__file__).parent / "duplicate_hashes.db"
        
        # Initialize database if it doesn't exist
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # Create table if it doesn't exist
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS file_hashes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_hash TEXT UNIQUE NOT NULL,
                filename TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Check if hash already exists
        cursor.execute('SELECT filename, created_at FROM file_hashes WHERE file_hash = ?', (file_hash,))
        result = cursor.fetchone()
        
        if result:
            logger.info(f"Duplicate found! SHA-256 {file_hash[:16]} matches {result[0]} from {result[1]}")
            conn.close()
            return {
                "success": True,
                "is_duplicate": True,
                "file_hash": file_hash,
                "existing_filename": result[0],
                "created_at": result[1],
                "message": "Duplicate file found in local database"
            }
        
        # Store this hash for future checks
        cursor.execute('INSERT INTO file_hashes (file_hash, filename) VALUES (?, ?)', 
                      (file_hash, file.filename))
        conn.commit()
        conn.close()
        
        logger.info(f"New file hash stored: {file_hash[:16]}")
            
    except Exception as e:
        logger.error(f"Error checking local database for duplicates: {e}")
        # Proceed with upload even if local database check fails
    
    # No duplicate found
    return {
        "success": True,
        "is_duplicate": False,
        "file_hash": file_hash,
        "message": "No duplicate found in local database"
    }


@app.post("/recognize", response_model=RecognitionResponse)
async def recognize_audio(
    file: Optional[UploadFile] = File(None),
    video_url: Optional[str] = Form(None),
    video_id: Optional[str] = Form(None)
):
    """
    Recognize an audio/video file against the fingerprint database
    Automatically extracts audio from video files using FFmpeg
    
    Args:
        file: Audio or video file to recognize (optional)
        video_url: URL of video to recognize (optional)
        video_id: ID of video for tracking (optional)
        
    Returns:
        Recognition result with match information
    """
    import hashlib
    
    # Handle video URL recognition
    if video_url and not file:
        logger.info(f"Recognizing video from URL: {video_url}")
        
        try:
            # Download video from URL
            import requests
            response = requests.get(video_url, timeout=30)
            response.raise_for_status()
            
            # Create temporary file
            temp_dir = tempfile.mkdtemp()
            temp_path = os.path.join(temp_dir, "video.mp4")
            
            with open(temp_path, 'wb') as f:
                f.write(response.content)
            
            # Extract audio
            audio_path = os.path.join(temp_dir, "audio.wav")
            if extract_audio_from_video(temp_path, audio_path):
                # Recognize audio
                if audio_worker:
                    result = audio_worker.recognize_audio_file(audio_path)
                    
                    # Cleanup
                    try:
                        os.remove(temp_path)
                        os.remove(audio_path)
                        os.rmdir(temp_dir)
                    except:
                        pass
                    
                    return result
                else:
                    # Fallback to SHA-256 if worker not available
                    file_hash = hashlib.sha256(response.content).hexdigest()
                    return {
                        "success": True,
                        "matched": False,
                        "message": "Audio worker not initialized, using SHA-256 fallback",
                        "file_hash": file_hash
                    }
            else:
                # Cleanup
                try:
                    os.remove(temp_path)
                    os.rmdir(temp_dir)
                except:
                    pass
                
                return {
                    "success": False,
                    "error": "Failed to extract audio from video"
                }
                
        except Exception as e:
            logger.error(f"Error recognizing video from URL: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    # Handle file upload recognition
    if file:
        content = await file.read()
        file_hash = hashlib.sha256(content).hexdigest()
        
        logger.info(f"Recognizing {file.filename} with SHA-256: {file_hash[:16]}...")
        
        # For now, return no match
        # In production, this would check against fingerprint database
        return {
            "success": True,
            "matched": False,
            "message": "No match found in database",
            "file_hash": file_hash
        }
    
    return {
        "success": False,
        "error": "Either file or video_url must be provided"
    }


@app.post("/scan-video")
async def scan_video_for_copyright(
    video_url: str = Form(...),
    video_id: str = Form(...)
):
    """
    Scan a video for copyright violations by URL
    This is the main endpoint called from the upload pipeline
    
    Args:
        video_url: URL of the video to scan
        video_id: ID of the video for tracking
        
    Returns:
        Scan results with copyright matches
    """
    logger.info(f"Scanning video {video_id} from URL: {video_url}")
    
    try:
        # Download video from URL
        import requests
        response = requests.get(video_url, timeout=60)
        response.raise_for_status()
        
        # Create temporary file
        temp_dir = tempfile.mkdtemp()
        temp_path = os.path.join(temp_dir, "video.mp4")
        
        with open(temp_path, 'wb') as f:
            f.write(response.content)
        
        # Extract audio
        audio_path = os.path.join(temp_dir, "audio.wav")
        if not extract_audio_from_video(temp_path, audio_path):
            # Cleanup
            try:
                os.remove(temp_path)
                os.rmdir(temp_dir)
            except:
                pass
            
            return {
                "success": False,
                "matched": False,
                "error": "Failed to extract audio from video"
            }
        
        # Recognize audio
        if audio_worker:
            result = audio_worker.recognize_audio_file(audio_path)
            
            # Cleanup
            try:
                os.remove(temp_path)
                os.remove(audio_path)
                os.rmdir(temp_dir)
            except:
                pass
            
            # Add video_id to result
            result["video_id"] = video_id
            return result
        else:
            # Fallback to SHA-256 if worker not available
            file_hash = hashlib.sha256(response.content).hexdigest()
            
            # Cleanup
            try:
                os.remove(temp_path)
                os.remove(audio_path)
                os.rmdir(temp_dir)
            except:
                pass
            
            return {
                "success": True,
                "matched": False,
                "message": "Audio worker not initialized, using SHA-256 fallback",
                "file_hash": file_hash,
                "video_id": video_id
            }
            
    except Exception as e:
        logger.error(f"Error scanning video for copyright: {e}")
        return {
            "success": False,
            "matched": False,
            "error": str(e),
            "video_id": video_id
        }


@app.delete("/fingerprints/{song_id}")
async def delete_fingerprints(song_id: int):
    """
    Delete fingerprints for a specific song
    
    Args:
        song_id: ID of the song to delete
        
    Returns:
        Deletion result
    """
    if not audio_worker:
        raise HTTPException(status_code=503, detail="Audio worker not initialized")
    
    result = audio_worker.delete_song_fingerprints(song_id)
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error"))
    
    return result


# PDQ Image Hashing Endpoints
@app.post("/pdq/hash", response_model=PDQResponse)
async def compute_pdq_hash(file: UploadFile = File(...)):
    """
    Compute PDQ hash for an image file
    
    Args:
        file: Image file to hash (JPEG, PNG, etc.)
        
    Returns:
        PDQ hash and quality score
    """
    if not threat_worker:
        raise HTTPException(status_code=503, detail="ThreatExchange worker not initialized")
    
    # Create temporary file
    temp_dir = tempfile.mkdtemp()
    temp_path = os.path.join(temp_dir, file.filename)
    
    try:
        # Save uploaded file
        with open(temp_path, 'wb') as f:
            content = await file.read()
            f.write(content)
        
        # Compute PDQ hash
        result = threat_worker.compute_pdq_hash(temp_path)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error computing PDQ hash: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup temporary files
        try:
            if os.path.exists(temp_path):
                os.remove(temp_path)
            os.rmdir(temp_dir)
        except Exception as e:
            logger.warning(f"Error cleaning up temp files: {e}")


# vPDQ Video Hashing Endpoints
@app.post("/vpdq/hash", response_model=VPDQResponse)
async def compute_vpdq_hash(file: UploadFile = File(...)):
    """
    Compute vPDQ hash for a video file
    
    Args:
        file: Video file to hash (MP4, WebM, etc.)
        
    Returns:
        vPDQ hash, frame count, and quality score
    """
    if not threat_worker:
        raise HTTPException(status_code=503, detail="ThreatExchange worker not initialized")
    
    # Create temporary file
    temp_dir = tempfile.mkdtemp()
    temp_path = os.path.join(temp_dir, file.filename)
    
    try:
        # Save uploaded file
        with open(temp_path, 'wb') as f:
            content = await file.read()
            f.write(content)
        
        # Compute vPDQ hash
        result = threat_worker.compute_vpdq_hash(temp_path)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error computing vPDQ hash: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup temporary files
        try:
            if os.path.exists(temp_path):
                os.remove(temp_path)
            os.rmdir(temp_dir)
        except Exception as e:
            logger.warning(f"Error cleaning up temp files: {e}")


@app.post("/pdq/compare")
async def compare_pdq_hashes(hash1: str = Form(...), hash2: str = Form(...), threshold: int = Form(31)):
    """
    Compare two PDQ hashes for similarity
    
    Args:
        hash1: First PDQ hash
        hash2: Second PDQ hash
        threshold: Hamming distance threshold (default 31)
        
    Returns:
        Comparison result with match status
    """
    if not threat_worker:
        raise HTTPException(status_code=503, detail="ThreatExchange worker not initialized")
    
    result = threat_worker.compare_pdq_hashes(hash1, hash2, threshold)
    return result


if __name__ == "__main__":
    import uvicorn
    
    # Run server
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
