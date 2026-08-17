#!/usr/bin/env python3
"""
ThreatExchange Worker for Image/Video Copyright Detection
Uses PDQ (image hashing) and vPDQ (video hashing) for copyright detection
"""

import os
import sys
import json
import logging
from typing import Dict, Any, Optional, List
from pathlib import Path
import hashlib

# Add threatexchange to path
sys.path.insert(0, str(Path(__file__).parent / "threatexchange"))

from threatexchange.signal_type.pdq.signal import PdqSignal
from threatexchange.signal_type.pdq.pdq_hasher import pdq_from_file
try:
    from threatexchange.extensions.vpdq.vpdq_util import vpdq_compute_hash_from_file
except (ImportError, ModuleNotFoundError):
    vpdq_compute_hash_from_file = None

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ThreatExchangeWorker:
    """Worker for PDQ image hashing and vPDQ video hashing"""
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize the ThreatExchange worker
        
        Args:
            config: Configuration dictionary with database connection details
        """
        self.config = config
        logger.info("ThreatExchange worker initialized")
    
    def compute_pdq_hash(self, image_path: str) -> Dict[str, Any]:
        """
        Compute PDQ hash for an image file
        
        Args:
            image_path: Path to the image file
            
        Returns:
            Dictionary with PDQ hash and metadata
        """
        try:
            logger.info(f"Computing PDQ hash for: {image_path}")

            # Hash compute karein
            result = pdq_from_file(image_path)

            # Tuple Unpacking (pdq_from_file returns tuple: hex_string, quality)
            if isinstance(result, tuple):
                pdq_hash_str = result[0]  # First element is already hex string
                quality_score = result[1] if len(result) > 1 else None
            else:
                pdq_hash_str = str(result)  # Fallback to string if not tuple
                quality_score = None

            logger.info(f"PDQ hash computed: {pdq_hash_str[:16]}...")

            return {
                "success": True,
                "pdq_hash": pdq_hash_str,
                "quality_score": quality_score,
                "hash_length": len(pdq_hash_str),
                "error": None,
            }
        except Exception as e:
            logger.error(f"Error computing PDQ hash: {e}")
            return {
                "success": False,
                "pdq_hash": None,
                "quality_score": None,
                "hash_length": None,
                "error": str(e),
            }
    
    def compute_vpdq_hash(self, video_path: str) -> Dict[str, Any]:
        """
        Compute vPDQ hash for a video file

        Args:
            video_path: Path to the video file

        Returns:
            Dictionary with vPDQ hash and metadata
        """
        try:
            logger.info(f"Computing vPDQ hash for: {video_path}")

            # Check if vPDQ is available
            if vpdq_compute_hash_from_file is None:
                logger.warning("vPDQ module not available, returning error")
                return {
                    "success": False,
                    "error": "vPDQ module not installed or unavailable"
                }

            # Compute vPDQ hash using ThreatExchange
            vpdq_result = vpdq_compute_hash_from_file(video_path)

            # Extract hash and metadata
            vpdq_hash = vpdq_result.get("hash", "")
            frame_count = vpdq_result.get("frame_count", 0)
            quality_score = vpdq_result.get("quality", 0.0)

            logger.info(f"vPDQ hash computed: {vpdq_hash[:16] if vpdq_hash else 'N/A'}...")

            return {
                "success": True,
                "vpdq_hash": vpdq_hash,
                "frame_count": frame_count,
                "quality_score": quality_score
            }

        except Exception as e:
            logger.error(f"Error computing vPDQ hash: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def compare_pdq_hashes(self, hash1: str, hash2: str, threshold: int = 31) -> Dict[str, Any]:
        """
        Compare two PDQ hashes for similarity
        
        Args:
            hash1: First PDQ hash (hex string)
            hash2: Second PDQ hash (hex string)
            threshold: Hamming distance threshold (default 31 for PDQ)
            
        Returns:
            Dictionary with comparison results
        """
        try:
            # Convert hex to bytes
            h1_bytes = bytes.fromhex(hash1)
            h2_bytes = bytes.fromhex(hash2)
            
            # Compute Hamming distance
            hamming_distance = self._hamming_distance(h1_bytes, h2_bytes)
            
            # Determine if match
            is_match = hamming_distance <= threshold
            
            # Compute similarity percentage
            max_distance = len(h1_bytes) * 8  # 8 bits per byte
            similarity = 1.0 - (hamming_distance / max_distance)
            
            return {
                "success": True,
                "hamming_distance": hamming_distance,
                "threshold": threshold,
                "is_match": is_match,
                "similarity": similarity,
                "similarity_percentage": similarity * 100
            }
            
        except Exception as e:
            logger.error(f"Error comparing PDQ hashes: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def compare_vpdq_hashes(self, hash1: str, hash2: str, threshold: float = 0.5) -> Dict[str, Any]:
        """
        Compare two vPDQ hashes for similarity
        
        Args:
            hash1: First vPDQ hash
            hash2: Second vPDQ hash
            threshold: Similarity threshold (default 0.5)
            
        Returns:
            Dictionary with comparison results
        """
        try:
            # Simple comparison based on hash similarity
            # In production, use ThreatExchange's vPDQ comparison
            similarity = self._compute_hash_similarity(hash1, hash2)
            
            is_match = similarity >= threshold
            
            return {
                "success": True,
                "similarity": similarity,
                "threshold": threshold,
                "is_match": is_match,
                "similarity_percentage": similarity * 100
            }
            
        except Exception as e:
            logger.error(f"Error comparing vPDQ hashes: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def _hamming_distance(self, bytes1: bytes, bytes2: bytes) -> int:
        """Compute Hamming distance between two byte arrays"""
        if len(bytes1) != len(bytes2):
            raise ValueError("Byte arrays must be same length")
        
        distance = 0
        for b1, b2 in zip(bytes1, bytes2):
            xor = b1 ^ b2
            distance += bin(xor).count('1')
        
        return distance
    
    def _compute_quality_score(self, pdq_hash: str) -> float:
        """Compute a simple quality score based on hash distribution"""
        # This is a placeholder - in production use PDQ's quality metric
        try:
            hash_bytes = bytes.fromhex(pdq_hash)
            # Simple entropy-based quality score
            byte_counts = [0] * 256
            for byte in hash_bytes:
                byte_counts[byte] += 1
            
            entropy = 0.0
            for count in byte_counts:
                if count > 0:
                    probability = count / len(hash_bytes)
                    entropy -= probability * (probability.bit_length() - 1)
            
            # Normalize to 0-1 range
            max_entropy = 8.0  # Maximum entropy for 8-bit values
            quality = min(entropy / max_entropy, 1.0)
            
            return quality
        except:
            return 0.5  # Default quality
    
    def _compute_hash_similarity(self, hash1: str, hash2: str) -> float:
        """Compute similarity between two hashes"""
        if not hash1 or not hash2:
            return 0.0
        
        if hash1 == hash2:
            return 1.0
        
        # Simple character overlap similarity
        set1 = set(hash1)
        set2 = set(hash2)
        
        intersection = len(set1 & set2)
        union = len(set1 | set2)
        
        return intersection / union if union > 0 else 0.0


def load_config() -> Dict[str, Any]:
    """Load configuration from environment variables"""
    return {
        "db_host": os.getenv("DB_HOST", "localhost"),
        "db_user": os.getenv("DB_USER", "postgres"),
        "db_password": os.getenv("DB_PASSWORD", ""),
        "db_name": os.getenv("DB_NAME", "pronax"),
        "db_port": int(os.getenv("DB_PORT", "5432")),
    }


def main():
    """Main entry point for the worker"""
    config = load_config()
    
    try:
        worker = ThreatExchangeWorker(config)
        
        # Example usage
        if len(sys.argv) > 1:
            command = sys.argv[1]
            
            if command == "pdq" and len(sys.argv) > 2:
                image_path = sys.argv[2]
                result = worker.compute_pdq_hash(image_path)
                print(json.dumps(result, indent=2))
                
            elif command == "vpdq" and len(sys.argv) > 2:
                video_path = sys.argv[2]
                result = worker.compute_vpdq_hash(video_path)
                print(json.dumps(result, indent=2))
                
            elif command == "compare_pdq" and len(sys.argv) > 3:
                hash1 = sys.argv[2]
                hash2 = sys.argv[3]
                result = worker.compare_pdq_hashes(hash1, hash2)
                print(json.dumps(result, indent=2))
                
            else:
                print("Usage:")
                print("  python threatexchange_worker.py pdq <image_path>")
                print("  python threatexchange_worker.py vpdq <video_path>")
                print("  python threatexchange_worker.py compare_pdq <hash1> <hash2>")
                sys.exit(1)
        else:
            print("ThreatExchange Worker is ready")
            print("Usage:")
            print("  python threatexchange_worker.py pdq <image_path>")
            print("  python threatexchange_worker.py vpdq <video_path>")
            print("  python threatexchange_worker.py compare_pdq <hash1> <hash2>")
            
    except Exception as e:
        logger.error(f"Worker error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
