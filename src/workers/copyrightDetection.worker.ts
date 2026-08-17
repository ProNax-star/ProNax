/**
 * Web Worker for Copyright Detection
 * Handles CPU-intensive fingerprint matching/comparison in a separate thread
 * Audio decoding and fingerprint generation happens on main thread (AudioContext required)
 */

// Worker message types
interface WorkerMessage {
  type: 'compareFingerprints' | 'matchPartialSegments';
  data: {
    fingerprints1: string[];
    fingerprints2: string[];
    windowSize?: number;
  };
}

interface WorkerResponse {
  type: 'result' | 'error' | 'progress';
  data?: any;
  error?: string;
}

// Configuration matching the main thread
const FINGERPRINT_CONFIG = {
  NUM_HASHES: 30,
  FAN_VALUE: 15,
  MATCH_THRESHOLD: 0.75,
  PARTIAL_THRESHOLD: 0.45,
  MIN_MATCHING_HASHES: 8,
};

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { type, data } = e.message || e.data;

  if (type === 'compareFingerprints') {
    try {
      await handleCompareFingerprints(data);
    } catch (error) {
      self.postMessage({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      } as WorkerResponse);
    }
  } else if (type === 'matchPartialSegments') {
    try {
      await handleMatchPartialSegments(data);
    } catch (error) {
      self.postMessage({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      } as WorkerResponse);
    }
  }
};

async function handleCompareFingerprints(data: {
  fingerprints1: string[];
  fingerprints2: string[];
}) {
  const { fingerprints1, fingerprints2 } = data;

  try {
    const comparison = compareFingerprints(fingerprints1, fingerprints2);
    
    self.postMessage({
      type: 'result',
      data: comparison
    } as WorkerResponse);
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Fingerprint comparison failed'
    } as WorkerResponse);
  }
}

async function handleMatchPartialSegments(data: {
  fingerprints1: string[];
  fingerprints2: string[];
  windowSize?: number;
}) {
  const { fingerprints1, fingerprints2, windowSize = 30 } = data;

  try {
    const comparison = matchPartialSegments(fingerprints1, fingerprints2, windowSize);
    
    self.postMessage({
      type: 'result',
      data: comparison
    } as WorkerResponse);
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Partial segment matching failed'
    } as WorkerResponse);
  }
}

/**
 * Compare two fingerprint sets and return match score (CPU-intensive operation)
 */
function compareFingerprints(
  fingerprints1: string[],
  fingerprints2: string[]
): {
  matchScore: number;
  matchingHashes: number;
  totalHashes: number;
} {
  const set1 = new Set(fingerprints1);
  const set2 = new Set(fingerprints2);
  
  let matchingHashes = 0;
  const totalHashes = Math.max(set1.size, set2.size);
  
  // Count matching hashes
  for (const hash of set1) {
    if (set2.has(hash)) {
      matchingHashes++;
    }
  }
  
  const matchScore = totalHashes > 0 ? matchingHashes / totalHashes : 0;
  
  return {
    matchScore,
    matchingHashes,
    totalHashes
  };
}

/**
 * Match partial audio segments (CPU-intensive operation)
 */
function matchPartialSegments(
  fingerprints1: string[],
  fingerprints2: string[],
  windowSize: number = 30
): {
  bestMatch: number;
  bestOffset: number;
  matches: Array<{ offset: number; score: number }>;
} {
  const matches: Array<{ offset: number; score: number }> = [];
  const maxOffset = Math.abs(fingerprints1.length - fingerprints2.length);
  
  // Slide window comparison
  for (let offset = -maxOffset; offset <= maxOffset; offset++) {
    const slice1 = getSlice(fingerprints1, offset, windowSize);
    const slice2 = getSlice(fingerprints2, 0, windowSize);
    
    if (slice1.length < FINGERPRINT_CONFIG.MIN_MATCHING_HASHES || 
        slice2.length < FINGERPRINT_CONFIG.MIN_MATCHING_HASHES) {
      continue;
    }
    
    const comparison = compareFingerprints(slice1, slice2);
    
    if (comparison.matchScore >= FINGERPRINT_CONFIG.PARTIAL_THRESHOLD) {
      matches.push({
        offset,
        score: comparison.matchScore
      });
    }
  }
  
  // Find best match
  const bestMatch = matches.length > 0 
    ? Math.max(...matches.map(m => m.score))
    : 0;
  const bestOffset = matches.length > 0
    ? matches.find(m => m.score === bestMatch)?.offset ?? 0
    : 0;
  
  return { bestMatch, bestOffset, matches };
}

function getSlice(array: string[], offset: number, size: number): string[] {
  const start = Math.max(0, offset);
  const end = Math.min(array.length, start + size);
  return array.slice(start, end);
}
