#!/usr/bin/env python3
"""
Audio Fingerprint Worker for Copyright Detection
Uses Dejavu to fingerprint audio and detect copyright infringement
"""

import os
import sys
import json
import asyncio
import logging
from typing import Dict, Any, Optional
from pathlib import Path
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor

# Load environment variables from .env file
env_path = Path(__file__).parent / ".env"
load_dotenv(env_path)

# Configure FFmpeg path for pydub
ffmpeg_dir = r"C:\Users\ZKG\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0-full_build\bin"
if os.path.exists(ffmpeg_dir):
    os.environ["PATH"] = ffmpeg_dir + os.pathsep + os.environ.get("PATH", "")

# Add dejavu to path
sys.path.insert(0, str(Path(__file__).parent / "dejavu"))

from dejavu import Dejavu
from dejavu.logic.recognizer.file_recognizer import FileRecognizer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class AudioFingerprintWorker:
    """Worker for audio fingerprinting and copyright detection"""
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize the audio fingerprint worker
        
        Args:
            config: Configuration dictionary with database connection details
        """
        self.config = config
        self.deJavu = None
        self.db_conn = None
        self._initialize_dejavu()
        self._initialize_db_connection()
    
    def _initialize_db_connection(self):
        """Initialize direct database connection for duplicate checking"""
        try:
            db_password = self.config.get("db_password", "")
            db_host = self.config.get("db_host", "localhost")
            db_user = self.config.get("db_user", "postgres")
            db_name = self.config.get("db_name", "pronax")
            db_port = self.config.get("db_port", 5432)
            
            self.db_conn = psycopg2.connect(
                host=db_host,
                user=db_user,
                password=db_password,
                database=db_name,
                port=db_port
            )
            logger.info("Database connection established for duplicate checking")
        except Exception as e:
            logger.error(f"Failed to initialize database connection: {e}")
            self.db_conn = None
    
    def _initialize_dejavu(self):
        """Initialize Dejavu with database configuration"""
        try:
            # Get database configuration
            db_password = self.config.get("db_password", "")
            db_host = self.config.get("db_host", "localhost")
            db_user = self.config.get("db_user", "postgres")
            db_name = self.config.get("db_name", "pronax")
            db_port = self.config.get("db_port", 5432)

            # Configure Dejavu for PostgreSQL with SSL support for Supabase
            dejavu_config = {
                "database": {
                    "host": db_host,
                    "user": db_user,
                    "password": db_password,
                    "database": db_name,
                    "port": db_port,
                },
                "database_type": "postgres",
                "fingerprint_limit": self.config.get("fingerprint_limit", None)
            }

            self.deJavu = Dejavu(dejavu_config)
            logger.info("Dejavu initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize Dejavu: {e}")
            raise
    
    def check_duplicate_fingerprint(
        self,
        fingerprint: str,
        video_id: Optional[str] = None,
        owner_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Check if a fingerprint already exists in the database
        before completing the fingerprinting process
        
        Args:
            fingerprint: The fingerprint string to check
            video_id: Current video ID (optional, to exclude self-check)
            owner_id: Current owner ID (optional, passed but not used for filtering)
            
        Returns:
            Dictionary with duplicate check results
        """
        if not self.db_conn:
            logger.warning("No database connection available for duplicate check")
            return {"is_duplicate": False, "match_found": False}
        
        try:
            with self.db_conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # Call the Supabase RPC function to check for duplicates
                # Pass owner_id but function won't filter by it - flags all duplicates
                cursor.execute(
                    "SELECT * FROM public.check_duplicate_fingerprint(%s, %s::uuid, %s::uuid)",
                    (fingerprint, video_id, owner_id)
                )
                result = cursor.fetchone()
                
                if result and result.get("is_duplicate"):
                    logger.warning(f"Duplicate fingerprint found: {result}")
                    return {
                        "is_duplicate": True,
                        "match_found": True,
                        "existing_video_id": str(result.get("existing_video_id")),
                        "existing_video_title": result.get("existing_video_title"),
                        "existing_owner_id": str(result.get("existing_owner_id")),
                        "match_type": result.get("match_type"),
                        "confidence": float(result.get("confidence", 0))
                    }
                else:
                    logger.info("No duplicate fingerprint found")
                    return {
                        "is_duplicate": False,
                        "match_found": False
                    }
                    
        except Exception as e:
            logger.error(f"Error checking duplicate fingerprint: {e}")
            # Don't fail the entire process if duplicate check fails
            return {"is_duplicate": False, "match_found": False, "error": str(e)}
    
    def fingerprint_audio_file(
        self,
        audio_path: str,
        song_name: str,
        owner_id: str,
        video_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Fingerprint an audio file and store it in the database
        Includes duplicate check before fingerprinting
        
        Args:
            audio_path: Path to the audio file
            song_name: Name of the song/audio
            owner_id: Owner's user ID
            video_id: Associated video ID (optional)
            
        Returns:
            Dictionary with fingerprinting results
        """
        try:
            logger.info(f"Fingerprinting audio: {audio_path}")
            
            # Step 1: Generate fingerprint hash for duplicate checking
            # Use file SHA256 as a simple fingerprint identifier
            import hashlib
            with open(audio_path, 'rb') as f:
                file_hash = hashlib.sha256(f.read()).hexdigest()
            
            # Step 2: Check for duplicate before fingerprinting
            duplicate_check = self.check_duplicate_fingerprint(file_hash, video_id)
            
            if duplicate_check.get("is_duplicate"):
                logger.warning(f"Duplicate content detected before fingerprinting: {duplicate_check}")
                return {
                    "success": False,
                    "error": "Duplicate / Copyright Match Found",
                    "duplicate_detected": True,
                    "duplicate_info": duplicate_check,
                    "message": "This content matches existing copyrighted material. Upload blocked."
                }
            
            # Step 3: Fingerprint the file
            result = self.deJavu.fingerprint_file(audio_path, song_name)
            
            logger.info(f"Fingerprinting completed: {result}")
            
            return {
                "success": True,
                "song_id": result.get("song_id"),
                "song_name": song_name,
                "num_hashes": result.get("num_hashes", 0),
                "fingerprint_time": result.get("fingerprint_time", 0),
                "owner_id": owner_id,
                "video_id": video_id,
                "file_hash": file_hash,
                "duplicate_check": duplicate_check
            }
            
        except Exception as e:
            logger.error(f"Error fingerprinting audio: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def recognize_audio_file(self, audio_path: str) -> Dict[str, Any]:
        """
        Recognize an audio file against the fingerprint database
        
        Args:
            audio_path: Path to the audio file to recognize
            
        Returns:
            Dictionary with recognition results
        """
        try:
            logger.info(f"Recognizing audio: {audio_path}")
            
            # Recognize the file
            result = self.deJavu.recognize(FileRecognizer, audio_path)
            
            # Check if we have results
            results = result.get("results", [])
            
            if results and len(results) > 0:
                # Get the best match (first result)
                match = results[0]
                logger.info(f"Audio recognized: {match}")
                return {
                    "success": True,
                    "matched": True,
                    "song_id": match.get("song_id"),
                    "song_name": match.get("song_name"),
                    "confidence": match.get("input_confidence", 0),
                    "offset_seconds": match.get("offset_seconds", 0),
                    "match_time": result.get("query_time", 0)
                }
            else:
                logger.info("No match found")
                return {
                    "success": True,
                    "matched": False,
                    "message": "No matching audio found in database"
                }
                
        except Exception as e:
            logger.error(f"Error recognizing audio: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def delete_song_fingerprints(self, song_id: int) -> Dict[str, Any]:
        """
        Delete fingerprints for a specific song
        
        Args:
            song_id: ID of the song to delete
            
        Returns:
            Dictionary with deletion results
        """
        try:
            logger.info(f"Deleting fingerprints for song_id: {song_id}")
            
            # Delete from database
            self.deJavu.db.delete_song(song_id)
            
            logger.info(f"Successfully deleted fingerprints for song_id: {song_id}")
            
            return {
                "success": True,
                "song_id": song_id,
                "message": "Fingerprints deleted successfully"
            }
            
        except Exception as e:
            logger.error(f"Error deleting fingerprints: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_fingerprint_stats(self) -> Dict[str, Any]:
        """
        Get statistics about the fingerprint database
        
        Returns:
            Dictionary with database statistics
        """
        try:
            num_songs = self.deJavu.db.get_num_songs()
            num_fingerprints = self.deJavu.db.get_num_fingerprints()
            
            return {
                "success": True,
                "num_songs": num_songs,
                "num_fingerprints": num_fingerprints
            }
            
        except Exception as e:
            logger.error(f"Error getting stats: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def close(self):
        """Clean up database connections"""
        try:
            if self.db_conn:
                self.db_conn.close()
                logger.info("Database connection closed")
        except Exception as e:
            logger.error(f"Error closing database connection: {e}")


def load_config() -> Dict[str, Any]:
    """Load configuration from environment variables"""
    return {
        "db_host": os.getenv("DB_HOST", "localhost"),
        "db_user": os.getenv("DB_USER", "postgres"),
        "db_password": os.getenv("DB_PASSWORD", ""),
        "db_name": os.getenv("DB_NAME", "pronax"),
        "db_port": int(os.getenv("DB_PORT", "5432")),
        "fingerprint_limit": int(os.getenv("FINGERPRINT_LIMIT", "-1")) if os.getenv("FINGERPRINT_LIMIT") else None
    }


def main():
    """Main entry point for the worker"""
    config = load_config()
    
    try:
        worker = AudioFingerprintWorker(config)
        
        # Example usage
        if len(sys.argv) > 1:
            command = sys.argv[1]
            
            if command == "fingerprint" and len(sys.argv) > 2:
                audio_path = sys.argv[2]
                song_name = sys.argv[3] if len(sys.argv) > 3 else "Unknown"
                owner_id = sys.argv[4] if len(sys.argv) > 4 else "system"
                
                result = worker.fingerprint_audio_file(audio_path, song_name, owner_id)
                print(json.dumps(result, indent=2))
                
            elif command == "recognize" and len(sys.argv) > 2:
                audio_path = sys.argv[2]
                
                result = worker.recognize_audio_file(audio_path)
                print(json.dumps(result, indent=2))
                
            elif command == "stats":
                result = worker.get_fingerprint_stats()
                print(json.dumps(result, indent=2))
                
            else:
                print("Usage:")
                print("  python audio_fingerprint_worker.py fingerprint <audio_path> <song_name> <owner_id>")
                print("  python audio_fingerprint_worker.py recognize <audio_path>")
                print("  python audio_fingerprint_worker.py stats")
                sys.exit(1)
        else:
            print("Audio Fingerprint Worker is ready")
            print("Usage:")
            print("  python audio_fingerprint_worker.py fingerprint <audio_path> <song_name> <owner_id>")
            print("  python audio_fingerprint_worker.py recognize <audio_path>")
            print("  python audio_fingerprint_worker.py stats")
            
    except Exception as e:
        logger.error(f"Worker error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
