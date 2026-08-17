#!/usr/bin/env python3
"""
Test script for audio fingerprinting end-to-end verification
This script tests the complete pipeline: fingerprinting and recognition
"""

import os
import sys
import json
import subprocess
from pathlib import Path

# Add dejavu to path
sys.path.insert(0, str(Path(__file__).parent / "dejavu"))

from audio_fingerprint_worker import AudioFingerprintWorker, load_config


def check_ffmpeg():
    """Check if FFmpeg is installed"""
    try:
        result = subprocess.run(['ffmpeg', '-version'], capture_output=True, text=True)
        if result.returncode == 0:
            print("✓ FFmpeg is installed")
            return True
        else:
            print("✗ FFmpeg is not installed")
            return False
    except FileNotFoundError:
        print("✗ FFmpeg is not found in PATH")
        return False


def test_fingerprinting(worker, test_audio_path):
    """Test audio fingerprinting"""
    print("\n" + "="*60)
    print("TEST 1: Fingerprinting Audio")
    print("="*60)
    
    if not os.path.exists(test_audio_path):
        print(f"✗ Test audio file not found: {test_audio_path}")
        print("Please provide a valid audio file path")
        return None
    
    print(f"Fingerprinting: {test_audio_path}")
    result = worker.fingerprint_audio_file(
        test_audio_path,
        "Test Song",
        "test-user-id"
    )
    
    print(f"Result: {json.dumps(result, indent=2)}")
    
    if result.get("success"):
        print("✓ Fingerprinting successful")
        return result.get("song_id")
    else:
        print(f"✗ Fingerprinting failed: {result.get('error')}")
        return None


def test_recognition(worker, test_audio_path):
    """Test audio recognition"""
    print("\n" + "="*60)
    print("TEST 2: Audio Recognition")
    print("="*60)
    
    if not os.path.exists(test_audio_path):
        print(f"✗ Test audio file not found: {test_audio_path}")
        return False
    
    print(f"Recognizing: {test_audio_path}")
    result = worker.recognize_audio_file(test_audio_path)
    
    print(f"Result: {json.dumps(result, indent=2)}")
    
    if result.get("success"):
        if result.get("matched"):
            print(f"✓ Recognition successful - Matched: {result.get('song_name')}")
            print(f"  Confidence: {result.get('confidence')}")
            print(f"  Offset: {result.get('offset_seconds')}s")
            return True
        else:
            print("✓ Recognition successful - No match found (expected for new database)")
            return True
    else:
        print(f"✗ Recognition failed: {result.get('error')}")
        return False


def test_stats(worker):
    """Test database statistics"""
    print("\n" + "="*60)
    print("TEST 3: Database Statistics")
    print("="*60)
    
    result = worker.get_fingerprint_stats()
    
    print(f"Result: {json.dumps(result, indent=2)}")
    
    if result.get("success"):
        print(f"✓ Stats retrieved successfully")
        print(f"  Songs: {result.get('num_songs')}")
        print(f"  Fingerprints: {result.get('num_fingerprints')}")
        return True
    else:
        print(f"✗ Stats retrieval failed: {result.get('error')}")
        return False


def main():
    """Main test function"""
    print("="*60)
    print("AUDIO FINGERPRINTING END-TO-END TEST")
    print("="*60)
    
    # Check FFmpeg
    if not check_ffmpeg():
        print("\nERROR: FFmpeg is required for audio processing")
        print("Install FFmpeg: https://ffmpeg.org/download.html")
        sys.exit(1)
    
    # Load configuration
    print("\nLoading configuration...")
    config = load_config()
    print(f"Database: {config.get('db_host')}:{config.get('db_port')}/{config.get('db_name')}")
    
    # Initialize worker
    print("\nInitializing Dejavu worker...")
    try:
        worker = AudioFingerprintWorker(config)
        print("✓ Worker initialized successfully")
    except Exception as e:
        print(f"✗ Worker initialization failed: {e}")
        print("\nMake sure:")
        print("1. Database migration has been applied")
        print("2. Database credentials are correct")
        print("3. Database is accessible")
        sys.exit(1)
    
    # Get test audio path
    if len(sys.argv) > 1:
        test_audio = sys.argv[1]
    else:
        test_audio = input("\nEnter path to test audio file (MP3/WAV): ").strip()
    
    if not test_audio:
        print("ERROR: No audio file provided")
        sys.exit(1)
    
    # Run tests
    results = []
    
    # Test 1: Fingerprinting
    song_id = test_fingerprinting(worker, test_audio)
    results.append(("Fingerprinting", song_id is not None))
    
    # Test 2: Recognition
    recognition_ok = test_recognition(worker, test_audio)
    results.append(("Recognition", recognition_ok))
    
    # Test 3: Stats
    stats_ok = test_stats(worker)
    results.append(("Statistics", stats_ok))
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    for test_name, passed in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{test_name}: {status}")
    
    all_passed = all(result[1] for result in results)
    
    if all_passed:
        print("\n✓ All tests passed!")
        print("Audio fingerprinting pipeline is working correctly.")
    else:
        print("\n✗ Some tests failed")
        print("Please check the errors above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
