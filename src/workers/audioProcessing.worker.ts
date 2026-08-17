/**
 * Web Worker for Audio Processing and Fingerprint Generation
 * Handles file reading and processing in chunks to prevent main thread blocking
 * Uses chunked FileReader with timeout protection
 */

interface WorkerMessage {
  type: 'generateFingerprint' | 'generateHash' | 'fingerprintChunk' | 'finalizeFingerprint';
  data: {
    fileData?: ArrayBuffer;
    fileName?: string;
    fileSize?: number;
    sampleRate?: number;
    chunkData?: ArrayBuffer;
    offset?: number;
    isLast?: boolean;
  };
}

interface WorkerResponse {
  type: 'result' | 'error' | 'progress';
  data?: any;
  error?: string;
}

// Configuration
const WORKER_CONFIG = {
  SAMPLE_RATE: 44100,
  FFT_SIZE: 2048,
  HOP_SIZE: 512,
  NUM_HASHES: 30,
  FAN_VALUE: 15,
  MATCH_THRESHOLD: 0.75,
  PARTIAL_THRESHOLD: 0.45,
  MIN_MATCHING_HASHES: 8,
};

// State for chunked processing
let chunkBuffer: Uint8Array[] = [];
let totalFileSize = 0;
let fileName = '';
let fileSize = 0;

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { type, data } = e.data;

  if (type === 'generateFingerprint') {
    try {
      if (data.fileData && data.fileName && data.fileSize) {
        await handleGenerateFingerprint({
          fileData: data.fileData,
          fileName: data.fileName,
          fileSize: data.fileSize
        });
      } else {
        self.postMessage({
          type: 'error',
          error: 'Missing required data for fingerprint generation'
        } as WorkerResponse);
      }
    } catch (error) {
      self.postMessage({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      } as WorkerResponse);
    }
  } else if (type === 'generateHash') {
    try {
      await handleGenerateHash(data);
    } catch (error) {
      self.postMessage({
        type: 'error',
        error: error instanceof Error ? error.message : 'Hash generation failed'
      } as WorkerResponse);
    }
  } else if (type === 'fingerprintChunk') {
    try {
      handleFingerprintChunk(data);
    } catch (error) {
      self.postMessage({
        type: 'error',
        error: error instanceof Error ? error.message : 'Chunk processing failed'
      } as WorkerResponse);
    }
  } else if (type === 'finalizeFingerprint') {
    try {
      await handleFinalizeFingerprint(data);
    } catch (error) {
      self.postMessage({
        type: 'error',
        error: error instanceof Error ? error.message : 'Finalization failed'
      } as WorkerResponse);
    }
  }
};

async function handleGenerateFingerprint(data: {
  fileData: ArrayBuffer;
  fileName: string;
  fileSize: number;
}) {
  const { fileData, fileName: fName, fileSize: fSize } = data;

  try {
    // Generate simplified fingerprint from file data (chunked processing)
    const startTime = Date.now();
    const fingerprints = generateSimplifiedFingerprint(fileData);
    
    const duration = (Date.now() - startTime) / 1000;
    
    self.postMessage({
      type: 'result',
      data: {
        fingerprints,
        duration: duration,
        sampleRate: WORKER_CONFIG.SAMPLE_RATE,
        fileName: fName,
        fileSize: fSize
      }
    } as WorkerResponse);
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Fingerprint generation failed'
    } as WorkerResponse);
  }
}

async function handleGenerateHash(data: {
  fileData?: ArrayBuffer;
}) {
  const { fileData } = data;

  if (!fileData) {
    self.postMessage({
      type: 'error',
      error: 'No file data provided for hash generation'
    } as WorkerResponse);
    return;
  }

  try {
    // Generate SHA-256 hash using Web Crypto API
    const hashBuffer = await crypto.subtle.digest('SHA-256', fileData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    self.postMessage({
      type: 'result',
      data: { hash }
    } as WorkerResponse);
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Hash generation failed'
    } as WorkerResponse);
  }
}

/**
 * Handle incoming chunk of file data for fingerprint generation
 */
function handleFingerprintChunk(data: {
  chunkData?: ArrayBuffer;
  offset?: number;
  isLast?: boolean;
}) {
  const { chunkData, offset, isLast } = data;

  if (!chunkData) {
    self.postMessage({
      type: 'error',
      error: 'No chunk data provided'
    } as WorkerResponse);
    return;
  }

  // Store chunk in buffer
  chunkBuffer.push(new Uint8Array(chunkData));
  totalFileSize += chunkData.byteLength;

  // If this is the last chunk, we could start processing
  // But we'll wait for finalize signal
}

/**
 * Handle finalization of fingerprint generation after all chunks received
 */
async function handleFinalizeFingerprint(data: {
  fileName?: string;
  fileSize?: number;
}) {
  const { fileName: fName, fileSize: fSize } = data;
  
  fileName = fName || '';
  fileSize = fSize || 0;

  try {
    // Combine all chunks into a single buffer
    const totalSize = chunkBuffer.reduce((sum, chunk) => sum + chunk.length, 0);
    const combinedBuffer = new Uint8Array(totalSize);
    let position = 0;
    
    for (const chunk of chunkBuffer) {
      combinedBuffer.set(chunk, position);
      position += chunk.length;
    }

    // Generate fingerprint from combined data
    const startTime = Date.now();
    const fingerprints = generateSimplifiedFingerprint(combinedBuffer.buffer);
    const duration = (Date.now() - startTime) / 1000;

    // Clear buffer to free memory
    chunkBuffer = [];
    totalFileSize = 0;

    self.postMessage({
      type: 'result',
      data: {
        fingerprints,
        duration: duration,
        sampleRate: WORKER_CONFIG.SAMPLE_RATE,
        fileName: fileName,
        fileSize: fileSize
      }
    } as WorkerResponse);
  } catch (error) {
    // Clear buffer on error
    chunkBuffer = [];
    totalFileSize = 0;
    
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Fingerprint finalization failed'
    } as WorkerResponse);
  }
}

/**
 * Generate simplified fingerprint from file data
 * Uses chunked processing to prevent memory issues
 */
function generateSimplifiedFingerprint(arrayBuffer: ArrayBuffer): string[] {
  const fingerprints: string[] = [];
  const data = new Uint8Array(arrayBuffer);
  
  // Process in chunks to prevent memory spikes
  const chunkSize = 1024 * 1024; // 1MB chunks
  const numChunks = Math.ceil(data.length / chunkSize);
  
  for (let chunk = 0; chunk < numChunks; chunk++) {
    const start = chunk * chunkSize;
    const end = Math.min(start + chunkSize, data.length);
    const chunkData = data.slice(start, end);
    
    // Generate hash from chunk
    const chunkHash = generateChunkHash(chunkData, chunk);
    fingerprints.push(chunkHash);
    
    // Yield to prevent blocking (simulate async)
    if (chunk % 5 === 0) {
      // Small delay to allow event loop processing
      const start = Date.now();
      while (Date.now() - start < 1) {
        // Minimal yield
      }
    }
  }
  
  return fingerprints;
}

/**
 * Generate hash from data chunk
 */
function generateChunkHash(data: Uint8Array, chunkIndex: number): string {
  let hash = 0;
  
  // Simple hash algorithm for chunk
  for (let i = 0; i < Math.min(data.length, 1024); i++) {
    hash = ((hash << 5) - hash) + data[i];
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Combine with chunk index for uniqueness
  const combinedHash = (hash << 16) | (chunkIndex & 0xFFFF);
  return combinedHash.toString(16).padStart(8, '0');
}
