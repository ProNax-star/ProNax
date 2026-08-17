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
from typing import Optional
from io import BytesIO
from dotenv import load_dotenv
import time
import random

# Load environment variables from .env file
env_path = Path(__file__).parent / ".env"
load_dotenv(env_path)

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
    print("Running in simulation mode for testing")
    WORKERS_AVAILABLE = False
    
    # Mock load_config function for simulation mode
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
        
        # FFmpeg command to extract audio as mono 44.1kHz WAV
        cmd = [
            'ffmpeg',
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
    if WORKERS_AVAILABLE:
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
    else:
        logger.info("Running in simulation mode - workers not available")
        audio_worker = None
        threat_worker = None


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "audio_worker_initialized": audio_worker is not None,
        "threat_worker_initialized": threat_worker is not None
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
    if not audio_worker:
        if WORKERS_AVAILABLE:
            raise HTTPException(status_code=503, detail="Worker not initialized")
        else:
            # Simulation mode for testing
            logger.info(f"SIMULATION: Fingerprinting {file.filename} for {song_name}")
            await file.read()  # Consume the file
            return {
                "success": True,
                "song_id": random.randint(1000, 9999),
                "song_name": song_name,
                "num_hashes": random.randint(100, 500),
                "fingerprint_time": random.uniform(0.5, 2.0)
            }
    
    # Create temporary file
    temp_dir = tempfile.mkdtemp()
    temp_input_path = os.path.join(temp_dir, file.filename)
    temp_audio_path = temp_input_path
    
    try:
        # Save uploaded file
        with open(temp_input_path, 'wb') as f:
            content = await file.read()
            f.write(content)
        
        # If video, extract audio first
        if is_video_file(file.filename):
            temp_audio_path = os.path.join(temp_dir, f"{Path(file.filename).stem}.wav")
            logger.info(f"Video file detected, extracting audio to: {temp_audio_path}")
            
            if not extract_audio_from_video(temp_input_path, temp_audio_path):
                raise HTTPException(
                    status_code=400,
                    detail="Failed to extract audio from video file"
                )
        
        # Fingerprint the audio
        if not audio_worker or not audio_worker.deJavu:
            raise HTTPException(
                status_code=503, 
                detail="Audio worker or Dejavu not fully initialized"
            )
        
        result = audio_worker.fingerprint_audio_file(
            temp_audio_path,
            song_name,
            owner_id,
            video_id
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fingerprinting audio: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup temporary files
        try:
            if os.path.exists(temp_input_path):
                os.remove(temp_input_path)
            if temp_audio_path != temp_input_path and os.path.exists(temp_audio_path):
                os.remove(temp_audio_path)
            os.rmdir(temp_dir)
        except Exception as e:
            logger.warning(f"Error cleaning up temp files: {e}")


@app.post("/recognize", response_model=RecognitionResponse)
async def recognize_audio(file: UploadFile = File(...)):
    """
    Recognize an audio/video file against the fingerprint database
    
    Args:
        file: Audio or video file to recognize
        
    Returns:
        Recognition result with match information
    """
    if not audio_worker:
        if WORKERS_AVAILABLE:
            raise HTTPException(status_code=503, detail="Worker not initialized")
        else:
            # Simulation mode for testing - randomly return match or no match
            logger.info(f"SIMULATION: Recognizing {file.filename}")
            await file.read()  # Consume the file
            
            # Simulate copyright detection: 30% chance of match for testing
            has_match = random.random() < 0.3
            
            if has_match:
                return {
                    "success": True,
                    "matched": True,
                    "song_id": random.randint(1000, 9999),
                    "song_name": "Test Copyright Song",
                    "confidence": random.uniform(0.7, 0.95),
                    "offset_seconds": random.uniform(0, 10),
                    "match_time": random.uniform(0.5, 1.5),
                    "message": "Copyright match detected in simulation mode"
                }
            else:
                return {
                    "success": True,
                    "matched": False,
                    "message": "No copyright match detected in simulation mode"
                }
    
    # Create temporary file
    temp_dir = tempfile.mkdtemp()
    temp_input_path = os.path.join(temp_dir, file.filename)
    temp_audio_path = temp_input_path
    
    try:
        # Save uploaded file
        with open(temp_input_path, 'wb') as f:
            content = await file.read()
            f.write(content)
        
        # If video, extract audio first
        if is_video_file(file.filename):
            temp_audio_path = os.path.join(temp_dir, f"{Path(file.filename).stem}.wav")
            logger.info(f"Video file detected, extracting audio to: {temp_audio_path}")
            
            if not extract_audio_from_video(temp_input_path, temp_audio_path):
                raise HTTPException(
                    status_code=400,
                    detail="Failed to extract audio from video file"
                )
        
        # Recognize the audio
        if not audio_worker or not audio_worker.deJavu:
            raise HTTPException(
                status_code=503, 
                detail="Audio worker or Dejavu not fully initialized"
            )
        
        result = audio_worker.recognize_audio_file(temp_audio_path)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error recognizing audio: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup temporary files
        try:
            if os.path.exists(temp_input_path):
                os.remove(temp_input_path)
            if temp_audio_path != temp_input_path and os.path.exists(temp_audio_path):
                os.remove(temp_audio_path)
            os.rmdir(temp_dir)
        except Exception as e:
            logger.warning(f"Error cleaning up temp files: {e}")


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
    
    # Load configuration
    config = load_config()
    
    # Run server
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
