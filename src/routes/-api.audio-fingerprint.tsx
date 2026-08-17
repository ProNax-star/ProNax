import { audioFingerprintService } from '@/lib/audioFingerprint';

/**
 * Audio Fingerprinting API Routes
 * These routes use the FastAPI server for audio copyright detection
 * The FastAPI server handles file uploads, audio extraction, and Dejavu matching
 */

// Get fingerprint database statistics
export async function getFingerprintStats() {
  return await audioFingerprintService.getStats();
}

// Delete fingerprints for a song
export async function deleteFingerprints(songId: number) {
  return await audioFingerprintService.deleteFingerprints(songId);
}

// Health check for the FastAPI server
export async function checkAudioFingerprintHealth() {
  return await audioFingerprintService.healthCheck();
}

// Note: For fingerprinting and recognition, use the audioFingerprintService directly:
// import { audioFingerprintService } from '@/lib/audioFingerprint';
// 
// // Fingerprint audio/video
// const result = await audioFingerprintService.fingerprintAudio(file, songName, ownerId, videoId);
//
// // Recognize audio/video
// const recognition = await audioFingerprintService.recognizeAudio(file);
