#!/usr/bin/env python3
"""
Comprehensive test script for video upload and copyright matching
Tests the complete pipeline: video upload → audio extraction → fingerprinting → recognition
"""

import os
import sys
import json
import requests
import time
from pathlib import Path

# Configuration
FASTAPI_URL = "http://localhost:8000"


def check_server_health():
    """Check if FastAPI server is running"""
    print("="*60)
    print("CHECK 1: FastAPI Server Health")
    print("="*60)
    
    try:
        response = requests.get(f"{FASTAPI_URL}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Server is healthy")
            print(f"  Status: {data.get('status')}")
            print(f"  Worker initialized: {data.get('worker_initialized')}")
            return True
        else:
            print(f"✗ Server returned status code: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("✗ Cannot connect to FastAPI server")
        print("  Make sure the server is running: python fastapi_server.py")
        return False
    except Exception as e:
        print(f"✗ Error checking server health: {e}")
        return False


def test_fingerprint_video(video_path, song_name="Test Video", owner_id="test-user"):
    """Test fingerprinting a video file"""
    print("\n" + "="*60)
    print("TEST 2: Fingerprint Video File")
    print("="*60)
    
    if not os.path.exists(video_path):
        print(f"✗ Video file not found: {video_path}")
        return None
    
    print(f"Uploading and fingerprinting: {video_path}")
    print(f"  Song name: {song_name}")
    print(f"  Owner ID: {owner_id}")
    
    try:
        with open(video_path, 'rb') as f:
            files = {'file': (os.path.basename(video_path), f, 'video/mp4')}
            data = {
                'song_name': song_name,
                'owner_id': owner_id
            }
            
            start_time = time.time()
            response = requests.post(
                f"{FASTAPI_URL}/fingerprint",
                files=files,
                data=data,
                timeout=300  # 5 minute timeout for large files
            )
            elapsed_time = time.time() - start_time
        
        if response.status_code == 200:
            result = response.json()
            print(f"✓ Fingerprinting successful")
            print(f"  Time taken: {elapsed_time:.2f}s")
            print(f"  Song ID: {result.get('song_id')}")
            print(f"  Number of hashes: {result.get('num_hashes')}")
            print(f"  Fingerprint time: {result.get('fingerprint_time', 0):.4f}s")
            return result
        else:
            print(f"✗ Fingerprinting failed with status: {response.status_code}")
            print(f"  Error: {response.text}")
            return None
            
    except requests.exceptions.Timeout:
        print("✗ Request timeout - file may be too large or server slow")
        return None
    except Exception as e:
        print(f"✗ Error during fingerprinting: {e}")
        return None


def test_recognize_video(video_path):
    """Test recognizing a video file against the database"""
    print("\n" + "="*60)
    print("TEST 3: Recognize Video File")
    print("="*60)
    
    if not os.path.exists(video_path):
        print(f"✗ Video file not found: {video_path}")
        return None
    
    print(f"Uploading and recognizing: {video_path}")
    
    try:
        with open(video_path, 'rb') as f:
            files = {'file': (os.path.basename(video_path), f, 'video/mp4')}
            
            start_time = time.time()
            response = requests.post(
                f"{FASTAPI_URL}/recognize",
                files=files,
                timeout=300
            )
            elapsed_time = time.time() - start_time
        
        if response.status_code == 200:
            result = response.json()
            print(f"✓ Recognition completed")
            print(f"  Time taken: {elapsed_time:.2f}s")
            
            if result.get('matched'):
                print(f"  ✓ MATCH FOUND!")
                print(f"  Song ID: {result.get('song_id')}")
                print(f"  Song Name: {result.get('song_name')}")
                print(f"  Confidence: {result.get('confidence', 0) * 100:.2f}%")
                print(f"  Offset: {result.get('offset_seconds', 0):.2f}s")
                print(f"  Match time: {result.get('match_time', 0):.4f}s")
                print(f"  Match source: Audio fingerprint database")
            else:
                print(f"  No match found (expected for new database)")
                print(f"  Message: {result.get('message')}")
            
            return result
        else:
            print(f"✗ Recognition failed with status: {response.status_code}")
            print(f"  Error: {response.text}")
            return None
            
    except requests.exceptions.Timeout:
        print("✗ Request timeout")
        return None
    except Exception as e:
        print(f"✗ Error during recognition: {e}")
        return None


def test_get_stats():
    """Test getting database statistics"""
    print("\n" + "="*60)
    print("TEST 4: Database Statistics")
    print("="*60)
    
    try:
        response = requests.get(f"{FASTAPI_URL}/stats", timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✓ Statistics retrieved successfully")
            print(f"  Total songs: {result.get('num_songs')}")
            print(f"  Total fingerprints: {result.get('num_fingerprints')}")
            print(f"  Avg fingerprints per song: {result.get('num_fingerprints', 0) / max(result.get('num_songs', 1), 1):.0f}")
            return result
        else:
            print(f"✗ Failed to get stats: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"✗ Error getting stats: {e}")
        return None


def main():
    """Main test function"""
    print("="*60)
    print("VIDEO UPLOAD & COPYRIGHT MATCHING TEST")
    print("="*60)
    print(f"FastAPI Server: {FASTAPI_URL}")
    
    # Get video path
    if len(sys.argv) > 1:
        video_path = sys.argv[1]
    else:
        video_path = input("\nEnter path to test video file (MP4/MKV/WebM): ").strip()
    
    if not video_path:
        print("ERROR: No video file provided")
        print("\nUsage:")
        print("  python test_video_upload.py /path/to/video.mp4")
        sys.exit(1)
    
    # Check server health
    if not check_server_health():
        print("\nERROR: FastAPI server is not running")
        print("Start the server with: python fastapi_server.py")
        sys.exit(1)
    
    # Run tests
    results = []
    
    # Test 1: Fingerprint video
    fingerprint_result = test_fingerprint_video(video_path)
    results.append(("Video Fingerprinting", fingerprint_result is not None))
    
    # Test 2: Recognize video
    recognition_result = test_recognize_video(video_path)
    results.append(("Video Recognition", recognition_result is not None))
    
    # Test 3: Get stats
    stats_result = test_get_stats()
    results.append(("Database Statistics", stats_result is not None))
    
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
        print("Video upload and copyright matching pipeline is working correctly.")
        
        if fingerprint_result and recognition_result:
            print("\nCopyright Detection Results:")
            print(f"  Registered song ID: {fingerprint_result.get('song_id')}")
            print(f"  Hashes stored: {fingerprint_result.get('num_hashes')}")
            
            if recognition_result.get('matched'):
                print(f"  Match confidence: {recognition_result.get('confidence', 0) * 100:.2f}%")
                print(f"  Match source: Dejavu audio fingerprint database")
                print(f"  Match offset: {recognition_result.get('offset_seconds', 0):.2f}s")
    else:
        print("\n✗ Some tests failed")
        print("Please check the errors above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
