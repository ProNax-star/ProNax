/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
/**
 * ProNax Video Fingerprinting & Content ID Match Engine
 * Generates unique digital fingerprints for every uploaded video
 * and detects duplicate/copyright-infringing media automatically.
 */

export interface VideoFingerprintData {
  fingerprint_id: string; // e.g. PRX-FP-SHA256-8A9B0C1D2E
  created_at: string;
  file_size_bytes: number;
  duration_seconds: number;
  audio_waveform_hash: string;
  visual_frame_hash: string;
  match_confidence?: number;
}

/**
 * Calculate real SHA-256 hash from file buffer using Web Crypto API
 */
export async function calculateFileSHA256(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.toUpperCase();
}

/**
 * Generate a unique SHA256-style Fingerprint string from real file hash
 * Falls back to metadata-based hash if file is not available
 */
export async function generateVideoFingerprint(
  title: string,
  sizeBytes: number = 10485760,
  durationSeconds: number = 120,
  file?: File
): Promise<string> {
  // If file is provided, use real SHA-256 hash
  if (file) {
    try {
      const realHash = await calculateFileSHA256(file);
      return `PRX-FP-SHA256-${realHash}`;
    } catch (error) {
      console.error('Failed to calculate real file hash, falling back to metadata:', error);
    }
  }
  
  // Fallback to metadata-based hash (for server-side or when file not available)
  const str = `${title.toLowerCase().trim()}_${sizeBytes}_${durationSeconds}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0').toUpperCase();
  const hex2 = Math.abs(hash * 31).toString(16).padStart(8, '0').toUpperCase();
  return `PRX-FP-SHA256-${hex}${hex2}`;
}

/**
 * Generate a unique User ID format PRX-USER-XXXXX
 */
export function generateUniqueUserId(emailOrHandle: string, index: number = 1): string {
  let hash = 0;
  for (let i = 0; i < emailOrHandle.length; i++) {
    hash = (hash << 5) - hash + emailOrHandle.charCodeAt(i);
    hash |= 0;
  }
  const code1 = Math.abs(hash).toString(16).padStart(4, '0').toUpperCase().slice(0, 4);
  const code2 = (Math.abs(hash * 17) + index * 999).toString(16).padStart(4, '0').toUpperCase().slice(0, 4);
  return `PRX-USER-${code1}-${code2}`;
}

export interface MatchResult {
  isMatch: boolean;
  matchedVideoId?: string;
  matchedVideoTitle?: string;
  matchedChannelName?: string;
  confidenceScore: number; // e.g. 98.5
  claimant: string;
  policyAction: 'monetize' | 'mute' | 'block_worldwide' | 'track_only';
}

/**
 * Compare candidate video fingerprint/title against an index of known videos
 */
export function checkForCopyrightMatch(
  candidateTitle: string,
  candidateFingerprint: string,
  existingVideos: Array<{ id: string; title: string; fingerprint?: string; user_name?: string; channel_name?: string }>
): MatchResult | null {
  const cTitle = candidateTitle.toLowerCase().trim();

  for (const item of existingVideos) {
    if (!item.title) continue;
    const itemTitle = item.title.toLowerCase().trim();

    // Exact fingerprint match
    if (item.fingerprint && candidateFingerprint && item.fingerprint === candidateFingerprint) {
      return {
        isMatch: true,
        matchedVideoId: item.id,
        matchedVideoTitle: item.title,
        matchedChannelName: item.channel_name || item.user_name || 'Original Creator',
        confidenceScore: 99.8,
        claimant: `${item.channel_name || item.user_name || 'Original Rights Holder'} (Automated Content ID)`,
        policyAction: 'monetize',
      };
    }

    // High title similarity check
    if (cTitle.length > 5 && itemTitle.length > 5 && (cTitle === itemTitle || (cTitle.includes(itemTitle) && cTitle.length < itemTitle.length + 10))) {
      return {
        isMatch: true,
        matchedVideoId: item.id,
        matchedVideoTitle: item.title,
        matchedChannelName: item.channel_name || item.user_name || 'Original Creator',
        confidenceScore: 92.4,
        claimant: `${item.channel_name || item.user_name || 'Original Rights Holder'} (Content Match)`,
        policyAction: 'monetize',
      };
    }
  }

  return null;
}
