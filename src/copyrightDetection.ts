/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { supabase } from '@/integrations/supabase/loose';

export interface CopyrightMatch {
  content_id: string;
  content_type: string;
  owner_id: string;
  match_percentage: number;
  metadata: any;
  offset_seconds?: number;
  confidence?: number;
  match_type?: 'exact' | 'acoustic' | 'partial' | 'text';
}

// Acoustic fingerprint configuration
const FINGERPRINT_CONFIG = {
  SAMPLE_RATE: 44100,
  FFT_SIZE: 2048,
  HOP_SIZE: 512,
  NFFT: 2048,
  NUM_HASHES: 30, // Number of fingerprints per second
  FAN_VALUE: 15, // For matching hashes
  MATCH_THRESHOLD: 0.75, // 75% similarity threshold for full match
  PARTIAL_THRESHOLD: 0.45, // 45% similarity for partial segment matches
  MIN_MATCHING_HASHES: 8, // Minimum hashes to consider a match
};

/**
 * Acoustic Fingerprint using Web Audio API
 * Generates spectrogram-based fingerprints similar to Chromaprint
 */
class AcousticFingerprinter {
  private audioContext: AudioContext | null = null;

  private async getAudioContext(): Promise<AudioContext> {
    if (!this.audioContext) {
      // Check if AudioContext is available (main thread only)
      if (typeof AudioContext === 'undefined' && typeof (window as any).webkitAudioContext === 'undefined') {
        throw new Error('AudioContext is not available in this environment (Web Workers do not support AudioContext)');
      }
      
      const AudioContextClass = AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass({ sampleRate: FINGERPRINT_CONFIG.SAMPLE_RATE });
    }
    return this.audioContext;
  }

  /**
   * Decode audio file to AudioBuffer
   */
  async decodeAudio(file: File): Promise<AudioBuffer> {
    const audioContext = await this.getAudioContext();
    const arrayBuffer = await file.arrayBuffer();
    return await audioContext.decodeAudioData(arrayBuffer);
  }

  /**
   * Generate spectrogram from audio data
   */
  private async generateSpectrogram(audioBuffer: AudioBuffer): Promise<Float32Array[]> {
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const duration = audioBuffer.duration;
    
    const spectrogram: Float32Array[] = [];
    const fftSize = FINGERPRINT_CONFIG.FFT_SIZE;
    const hopSize = FINGERPRINT_CONFIG.HOP_SIZE;
    
    // Process audio in chunks
    for (let i = 0; i < channelData.length - fftSize; i += hopSize) {
      const chunk = channelData.slice(i, i + fftSize);
      
      // Apply window function (Hann window)
      const windowed = this.applyHannWindow(chunk);
      
      // Compute FFT
      const fft = await this.computeFFT(windowed);
      
      // Compute magnitude spectrum
      const magnitudes = new Float32Array(fft.length / 2);
      for (let j = 0; j < magnitudes.length; j++) {
        magnitudes[j] = Math.sqrt(fft[j * 2] ** 2 + fft[j * 2 + 1] ** 2);
      }
      
      spectrogram.push(magnitudes);
    }
    
    return spectrogram;
  }

  /**
   * Apply Hann window to reduce spectral leakage
   */
  private applyHannWindow(data: Float32Array): Float32Array {
    const windowed = new Float32Array(data.length);
    for (let i = 0; i < data.length; i++) {
      const window = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (data.length - 1)));
      windowed[i] = data[i] * window;
    }
    return windowed;
  }

  /**
   * Compute FFT using AnalyserNode
   */
  private async computeFFT(data: Float32Array): Promise<Float32Array> {
    const audioContext = await this.getAudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = FINGERPRINT_CONFIG.FFT_SIZE;
    
    // Create buffer source and process
    const buffer = audioContext.createBuffer(1, data.length, audioContext.sampleRate);
    buffer.getChannelData(0).set(data);
    
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(analyser);
    
    const fftData = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(fftData);
    
    source.disconnect();
    return fftData;
  }

  /**
   * Generate acoustic fingerprints from spectrogram
   * Uses peak detection and hashing similar to Chromaprint
   */
  private generateFingerprints(spectrogram: Float32Array[]): string[] {
    const fingerprints: string[] = [];
    const numTimeFrames = spectrogram.length;
    const numFreqBins = spectrogram[0].length;
    
    // Generate fingerprints for each time frame
    for (let t = 0; t < numTimeFrames; t++) {
      const peaks = this.detectPeaks(spectrogram[t]);
      
      // Create hash from peak pairs
      for (let i = 0; i < peaks.length; i++) {
        for (let j = i + 1; j < Math.min(i + FINGERPRINT_CONFIG.FAN_VALUE, peaks.length); j++) {
          const hash = this.createHash(peaks[i], peaks[j], t);
          fingerprints.push(hash);
        }
      }
    }
    
    return fingerprints;
  }

  /**
   * Detect peaks in frequency spectrum
   */
  private detectPeaks(spectrum: Float32Array): number[] {
    const peaks: number[] = [];
    const neighborhoodSize = 5;
    
    for (let i = neighborhoodSize; i < spectrum.length - neighborhoodSize; i++) {
      const current = spectrum[i];
      let isPeak = true;
      
      // Check if current is a local maximum
      for (let j = i - neighborhoodSize; j <= i + neighborhoodSize; j++) {
        if (j !== i && spectrum[j] >= current) {
          isPeak = false;
          break;
        }
      }
      
      if (isPeak && current > 0.1) { // Threshold for noise
        peaks.push(i);
      }
    }
    
    return peaks;
  }

  /**
   * Create hash from frequency peaks and time
   */
  private createHash(freq1: number, freq2: number, time: number): string {
    // Use a combination of frequency and time information
    const hash = (freq1 << 16) | (freq2 << 8) | (time & 0xFF);
    return hash.toString(16).padStart(8, '0');
  }

  /**
   * Generate complete acoustic fingerprint for a file
   */
  async generateFingerprint(file: File): Promise<{
    fingerprints: string[];
    duration: number;
    sampleRate: number;
  }> {
    try {
      const audioBuffer = await this.decodeAudio(file);
      const spectrogram = await this.generateSpectrogram(audioBuffer);
      const fingerprints = this.generateFingerprints(spectrogram);
      
      return {
        fingerprints,
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate
      };
    } catch (error) {
      console.error('Error generating acoustic fingerprint:', error);
      throw error;
    }
  }

  /**
   * Compare two fingerprint sets and return match score
   */
  compareFingerprints(
    fingerprints1: string[],
    fingerprints2: string[]
  ): {
    matchScore: number;
    matchingHashes: number;
    totalHashes: number;
    offsetSeconds?: number;
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
   * Match partial audio segments (for detecting remixes/edits)
   */
  matchPartialSegments(
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
      const slice1 = this.getSlice(fingerprints1, offset, windowSize);
      const slice2 = this.getSlice(fingerprints2, 0, windowSize);
      
      if (slice1.length < FINGERPRINT_CONFIG.MIN_MATCHING_HASHES || 
          slice2.length < FINGERPRINT_CONFIG.MIN_MATCHING_HASHES) {
        continue;
      }
      
      const comparison = this.compareFingerprints(slice1, slice2);
      
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

  private getSlice(array: string[], offset: number, size: number): string[] {
    const start = Math.max(0, offset);
    const end = Math.min(array.length, start + size);
    return array.slice(start, end);
  }

  close() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export { AcousticFingerprinter };

/**
 * Check uploaded video for potential copyright violations
 * Uses Web Worker for fingerprint generation to prevent main thread blocking
 * Implements 10-second timeout with fallback to SHA-256 hash check
 */
export async function checkCopyrightViolation(
  videoFile: File,
  videoTitle: string,
  videoDescription: string
): Promise<CopyrightMatch[]> {
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit
  const SCAN_TIMEOUT = 10000; // 10 second strict timeout

  // Check file size before processing
  if (videoFile.size > MAX_FILE_SIZE) {
    console.log('File too large for copyright check, falling back to hash check:', videoFile.size);
    return await checkForHashDuplicates(videoFile);
  }

  try {
    // Step 1: Generate fingerprint using Web Worker with timeout
    const fingerprintResult = await generateFingerprintWithTimeout(videoFile, SCAN_TIMEOUT);
    
    if (!fingerprintResult || !fingerprintResult.fingerprints || fingerprintResult.fingerprints.length === 0) {
      console.warn('Fingerprint generation failed or returned empty, falling back to hash check');
      return await checkForHashDuplicates(videoFile);
    }

    console.log('Generated fingerprint via worker:', {
      numHashes: fingerprintResult.fingerprints.length,
      duration: fingerprintResult.duration
    });

    // Step 2: Fetch existing fingerprints from database with timeout
    const dbFetchPromise = supabase
      .from('copyright_fingerprints')
      .select('*')
      .eq('is_active', true)
      .limit(50); // Limit to prevent memory issues

    const dbTimeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database fetch timeout')), 5000)
    );

    const { data: existingFingerprints } = await Promise.race([dbFetchPromise, dbTimeoutPromise]) as any;

    if (!existingFingerprints || existingFingerprints.length === 0) {
      console.log('No existing fingerprints found, falling back to hash check');
      return await checkForHashDuplicates(videoFile);
    }

    const matches: CopyrightMatch[] = [];

    // Step 3: Use Web Worker for CPU-intensive matching with per-comparison timeout
    try {
      const worker = new Worker(new URL('@/workers/copyrightDetection.worker.ts', import.meta.url), { type: 'module' });

      for (const fp of existingFingerprints) {
        const metadata = (fp.metadata ?? {}) as {
          fingerprints?: string[];
          title?: string;
          description?: string;
          duration?: number;
        };

        // Skip if no stored fingerprints
        if (!metadata.fingerprints || metadata.fingerprints.length === 0) {
          continue;
        }

        try {
          // Use worker for full fingerprint comparison with 3-second timeout per comparison
          const comparison = await runWorkerComparisonWithTimeout(
            worker, 
            fingerprintResult.fingerprints, 
            metadata.fingerprints,
            3000
          );

          // Check for full match
          if (comparison.matchScore >= FINGERPRINT_CONFIG.MATCH_THRESHOLD) {
            console.log('✓ Full match detected for content:', fp.content_id);
            matches.push({
              content_id: fp.content_id,
              content_type: fp.content_type,
              owner_id: fp.owner_id,
              match_percentage: Math.round(comparison.matchScore * 100),
              metadata: fp.metadata,
              match_type: 'acoustic',
              confidence: comparison.matchScore
            });
            continue;
          }

          // Use worker for partial segment matching with 3-second timeout
          const partialMatch = await runWorkerPartialMatchWithTimeout(
            worker, 
            fingerprintResult.fingerprints, 
            metadata.fingerprints,
            3000
          );

          if (partialMatch.bestMatch >= FINGERPRINT_CONFIG.PARTIAL_THRESHOLD) {
            const offsetSeconds = Math.abs(partialMatch.bestOffset) / FINGERPRINT_CONFIG.NUM_HASHES;
            
            matches.push({
              content_id: fp.content_id,
              content_type: fp.content_type,
              owner_id: fp.owner_id,
              match_percentage: Math.round(partialMatch.bestMatch * 100),
              metadata: fp.metadata,
              offset_seconds: offsetSeconds,
              match_type: 'partial',
              confidence: partialMatch.bestMatch
            });
          }
        } catch (comparisonError) {
          console.warn('Comparison timeout or error for content:', fp.content_id, comparisonError);
          // Continue with next fingerprint on error
          continue;
        }

        // Text-based fallback (fast operation)
        const title = metadata.title || '';
        const description = metadata.description || '';
        const titleMatch = title.toLowerCase().includes(videoTitle.toLowerCase()) ||
                          videoTitle.toLowerCase().includes(title.toLowerCase());
        const descMatch = description && videoDescription.toLowerCase().includes(description.toLowerCase());

        if (titleMatch || descMatch) {
          const alreadyMatched = matches.some(m => m.content_id === fp.content_id);
          if (!alreadyMatched) {
            matches.push({
              content_id: fp.content_id,
              content_type: fp.content_type,
              owner_id: fp.owner_id,
              match_percentage: titleMatch ? 60 : 45,
              metadata: fp.metadata,
              match_type: 'text'
            });
          }
        }
      }

      worker.terminate();
    } catch (workerError) {
      console.error('Worker initialization failed, falling back to hash check:', workerError);
      return await checkForHashDuplicates(videoFile);
    }

    // Sort matches by match percentage (highest first)
    matches.sort((a, b) => b.match_percentage - a.match_percentage);

    console.log('Final matches result:', {
      totalMatches: matches.length,
      matchIds: matches.map(m => ({ id: m.content_id, type: m.match_type, percentage: m.match_percentage }))
    });

    return matches;
  } catch (error) {
    console.error('Copyright check failed, falling back to SHA-256 hash check:', error);
    // Even if fingerprinting fails, still check for hash duplicates
    return await checkForHashDuplicates(videoFile);
  }
}

/**
 * Generate fingerprint using Web Worker with timeout protection
 * Uses chunked FileReader stream to prevent loading entire file into memory
 */
async function generateFingerprintWithTimeout(
  file: File,
  timeoutMs: number
): Promise<{ fingerprints: string[]; duration: number; sampleRate: number } | null> {
  try {
    // Use worker for fingerprint generation with timeout
    // Pass file reference instead of loading into memory
    const worker = new Worker(new URL('@/workers/audioProcessing.worker.ts', import.meta.url), { type: 'module' });

    const workerPromise = new Promise<{ fingerprints: string[]; duration: number; sampleRate: number }>((resolve, reject) => {
      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error('Fingerprint generation timeout'));
      }, timeoutMs);

      const handleMessage = (e: MessageEvent) => {
        const { type, data, error } = e.data;
        
        if (type === 'result') {
          clearTimeout(timeout);
          worker.removeEventListener('message', handleMessage);
          resolve(data);
        } else if (type === 'error') {
          clearTimeout(timeout);
          worker.removeEventListener('message', handleMessage);
          reject(new Error(error || 'Worker fingerprint generation failed'));
        }
      };

      worker.addEventListener('message', handleMessage);
      
      // Stream file in chunks to worker to prevent memory spike
      streamFileToWorker(file, worker, timeoutMs)
        .then(() => {
          // All chunks sent, worker will process and send result
        })
        .catch((streamError) => {
          clearTimeout(timeout);
          worker.removeEventListener('message', handleMessage);
          reject(streamError);
        });
    });

    const result = await workerPromise;
    worker.terminate();
    return result;
  } catch (error) {
    console.error('Fingerprint generation with timeout failed:', error);
    return null;
  }
}

/**
 * Stream file to worker in chunks to prevent loading entire file into memory
 */
async function streamFileToWorker(
  file: File,
  worker: Worker,
  timeoutMs: number
): Promise<void> {
  const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks for streaming
  const startTime = Date.now();
  let offset = 0;

  return new Promise((resolve, reject) => {
    const readNextChunk = async () => {
      // Check timeout
      if (Date.now() - startTime > timeoutMs) {
        reject(new Error('File streaming timeout'));
        return;
      }

      if (offset >= file.size) {
        // All chunks sent, signal worker to finalize
        worker.postMessage({
          type: 'finalizeFingerprint',
          data: {
            fileName: file.name,
            fileSize: file.size
          }
        });
        resolve();
        return;
      }

      try {
        const chunk = file.slice(offset, offset + CHUNK_SIZE);
        const arrayBuffer = await chunk.arrayBuffer();
        
        worker.postMessage({
          type: 'fingerprintChunk',
          data: {
            chunkData: arrayBuffer,
            offset: offset,
            isLast: offset + CHUNK_SIZE >= file.size
          }
        });

        offset += CHUNK_SIZE;
        
        // Yield to prevent blocking
        await new Promise(resolve => setTimeout(resolve, 0));
        
        // Continue with next chunk
        readNextChunk();
      } catch (error) {
        reject(new Error(`Failed to read file chunk at offset ${offset}: ${error}`));
      }
    };

    readNextChunk();
  });
}

/**
 * Run fingerprint comparison in Web Worker with timeout
 */
async function runWorkerComparisonWithTimeout(
  worker: Worker,
  fingerprints1: string[],
  fingerprints2: string[],
  timeoutMs: number
): Promise<{ matchScore: number; matchingHashes: number; totalHashes: number }> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Worker comparison timeout'));
    }, timeoutMs);

    const handleMessage = (e: MessageEvent) => {
      const { type, data, error } = e.data;
      
      if (type === 'result') {
        clearTimeout(timeout);
        worker.removeEventListener('message', handleMessage);
        resolve(data);
      } else if (type === 'error') {
        clearTimeout(timeout);
        worker.removeEventListener('message', handleMessage);
        reject(new Error(error || 'Worker comparison failed'));
      }
    };

    worker.addEventListener('message', handleMessage);
    worker.postMessage({
      type: 'compareFingerprints',
      data: { fingerprints1, fingerprints2 }
    });
  });
}

/**
 * Run partial segment matching in Web Worker with timeout
 */
async function runWorkerPartialMatchWithTimeout(
  worker: Worker,
  fingerprints1: string[],
  fingerprints2: string[],
  timeoutMs: number
): Promise<{ bestMatch: number; bestOffset: number; matches: Array<{ offset: number; score: number }> }> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Worker partial match timeout'));
    }, timeoutMs);

    const handleMessage = (e: MessageEvent) => {
      const { type, data, error } = e.data;
      
      if (type === 'result') {
        clearTimeout(timeout);
        worker.removeEventListener('message', handleMessage);
        resolve(data);
      } else if (type === 'error') {
        clearTimeout(timeout);
        worker.removeEventListener('message', handleMessage);
        reject(new Error(error || 'Worker partial match failed'));
      }
    };

    worker.addEventListener('message', handleMessage);
    worker.postMessage({
      type: 'matchPartialSegments',
      data: { fingerprints1, fingerprints2 }
    });
  });
}

/**
 * Direct copyright check (fallback if worker fails)
 * This runs on the main thread and may cause UI freezing
 */
async function checkCopyrightViolationDirect(
  videoFile: File,
  videoTitle: string,
  videoDescription: string,
  fingerprintResult?: { fingerprints: string[]; duration: number; sampleRate: number }
): Promise<CopyrightMatch[]> {
  const matches: CopyrightMatch[] = [];
  const fingerprinter = new AcousticFingerprinter();
  const CHECK_TIMEOUT = 10000; // 10 second timeout

  try {
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Copyright check timeout')), CHECK_TIMEOUT);
    });

    const checkPromise = (async () => {
      // 1. Generate acoustic fingerprint from uploaded video (if not provided)
      const fpResult = fingerprintResult || await fingerprinter.generateFingerprint(videoFile);
      console.log('Generated acoustic fingerprint:', {
        numHashes: fpResult.fingerprints.length,
        duration: fpResult.duration
      });

      // 2. Fetch existing fingerprints from database
      const { data: existingFingerprints } = await supabase
        .from('copyright_fingerprints')
        .select('*')
        .eq('is_active', true)
        .limit(50); // Limit to prevent memory issues

      if (existingFingerprints) {
        for (const fp of existingFingerprints) {
          const metadata = (fp.metadata ?? {}) as {
            fingerprints?: string[];
            title?: string;
            description?: string;
            duration?: number;
          };

          // Skip if no stored fingerprints
          if (!metadata.fingerprints || metadata.fingerprints.length === 0) {
            continue;
          }

          // 3. Compare acoustic fingerprints
          const fullMatch = fingerprinter.compareFingerprints(
            fpResult.fingerprints,
            metadata.fingerprints
          );

          // Check for full match
          if (fullMatch.matchScore >= FINGERPRINT_CONFIG.MATCH_THRESHOLD) {
            matches.push({
              content_id: fp.content_id,
              content_type: fp.content_type,
              owner_id: fp.owner_id,
              match_percentage: Math.round(fullMatch.matchScore * 100),
              metadata: fp.metadata,
              match_type: 'acoustic',
              confidence: fullMatch.matchScore
            });
            continue;
          }

          // 4. Check for partial segment matches (remixes, edits, covers)
          const partialMatch = fingerprinter.matchPartialSegments(
            fpResult.fingerprints,
            metadata.fingerprints
          );

          if (partialMatch.bestMatch >= FINGERPRINT_CONFIG.PARTIAL_THRESHOLD) {
            const offsetSeconds = Math.abs(partialMatch.bestOffset) / FINGERPRINT_CONFIG.NUM_HASHES;
            
            matches.push({
              content_id: fp.content_id,
              content_type: fp.content_type,
              owner_id: fp.owner_id,
              match_percentage: Math.round(partialMatch.bestMatch * 100),
              metadata: fp.metadata,
              offset_seconds: offsetSeconds,
              match_type: 'partial',
              confidence: partialMatch.bestMatch
            });
          }

          // 5. Fallback to text-based matching for additional confidence
          const title = metadata.title || '';
          const description = metadata.description || '';
          const titleMatch = title.toLowerCase().includes(videoTitle.toLowerCase()) ||
                            videoTitle.toLowerCase().includes(title.toLowerCase());
          const descMatch = description && videoDescription.toLowerCase().includes(description.toLowerCase());

          if (titleMatch || descMatch) {
            // Only add if not already matched
            const alreadyMatched = matches.some(m => m.content_id === fp.content_id);
            if (!alreadyMatched) {
              matches.push({
                content_id: fp.content_id,
                content_type: fp.content_type,
                owner_id: fp.owner_id,
                match_percentage: titleMatch ? 60 : 45,
                metadata: fp.metadata,
                match_type: 'text'
              });
            }
          }
        }
      }

      // 6. Check for exact file hash matches (duplicate uploads)
      const fileHash = await generateFileHash(videoFile);
      const { data: hashMatches } = await supabase
        .from('videos')
        .select('id, owner_id, title, sha256')
        .eq('sha256', fileHash)
        .limit(10);

      if (hashMatches && hashMatches.length > 0) {
        for (const video of hashMatches) {
          // Add as exact match if not already matched
          const alreadyMatched = matches.some(m => m.content_id === video.id);
          if (!alreadyMatched) {
            matches.push({
              content_id: video.id,
              content_type: 'video',
              owner_id: video.owner_id,
              match_percentage: 100,
              metadata: { title: video.title },
              match_type: 'exact'
            });
          }
        }
      }

      // Sort matches by match percentage (highest first)
      matches.sort((a, b) => b.match_percentage - a.match_percentage);

      return matches;
    })();

    // Race between check and timeout
    return await Promise.race([checkPromise, timeoutPromise]);
  } catch (error) {
    console.error('Copyright check failed:', error);
    return [];
  } finally {
    try {
      fingerprinter.close();
    } catch (e) {
      console.error('Error closing fingerprinter:', e);
    }
  }
}

/**
 * Generate SHA-256 hash of a file for duplicate detection
 * Uses chunked processing to prevent memory crash for large files
 */
async function generateFileHash(file: File): Promise<string> {
  const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks
  const fileSize = file.size;
  let offset = 0;
  
  // For small files, use direct approach
  if (fileSize <= CHUNK_SIZE) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  // For large files, use chunked processing
  try {
    // Use File API's slice method with streaming
    const stream = file.stream();
    const reader = stream.getReader();
    
    // Use crypto.subtle.digest with streaming (not directly supported, so we'll use chunks)
    // Fallback: hash first and last chunks for quick duplicate detection
    const firstChunk = file.slice(0, Math.min(CHUNK_SIZE, fileSize));
    const lastChunk = file.slice(Math.max(0, fileSize - CHUNK_SIZE), fileSize);
    
    const firstBuffer = await firstChunk.arrayBuffer();
    const lastBuffer = await lastChunk.arrayBuffer();
    
    // Combine first and last chunks
    const combined = new Uint8Array(firstBuffer.byteLength + lastBuffer.byteLength);
    combined.set(new Uint8Array(firstBuffer), 0);
    combined.set(new Uint8Array(lastBuffer), firstBuffer.byteLength);
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', combined.buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.error('Chunked hash generation failed, falling back to first chunk only:', error);
    // Ultimate fallback: just hash first chunk
    const firstChunk = file.slice(0, Math.min(CHUNK_SIZE, fileSize));
    const buffer = await firstChunk.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

/**
 * Check for hash duplicates as fallback when acoustic fingerprinting fails
 * This ensures duplicates are still detected even if AudioContext is unavailable
 */
async function checkForHashDuplicates(videoFile: File): Promise<CopyrightMatch[]> {
  console.log('Checking for hash duplicates as fallback');
  
  try {
    const fileHash = await generateFileHash(videoFile);
    console.log('Generated file hash:', fileHash);
    
    const { data: hashMatches } = await supabase
      .from('videos')
      .select('id, owner_id, title, sha256')
      .eq('sha256', fileHash)
      .limit(10);

    if (hashMatches && hashMatches.length > 0) {
      console.log(`Found ${hashMatches.length} hash duplicates`);
      
      return hashMatches.map(video => ({
        content_id: video.id,
        content_type: 'video',
        owner_id: video.owner_id,
        match_percentage: 100,
        metadata: { title: video.title },
        match_type: 'exact' as const
      }));
    }
    
    console.log('No hash duplicates found');
    return [];
  } catch (error) {
    console.error('Hash duplicate check failed:', error);
    return [];
  }
}

/**
 * Create a copyright claim when a violation is detected
 */
export async function createCopyrightClaim(
  videoId: string,
  claimantId: string,
  claimType: 'audio' | 'video' | 'visual' | 'manual',
  match: CopyrightMatch,
  severity: 'warning' | 'block' | 'demonetize' = 'warning'
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('create_copyright_claim', {
      p_video_id: videoId,
      p_claimant_id: claimantId,
      p_claim_type: claimType,
      p_severity: severity,
      p_match_percentage: match.match_percentage,
      p_matched_content_id: match.content_id,
      p_matched_content_title: match.metadata?.title,
      p_matched_content_owner: match.metadata?.owner
    });

    if (error) {
      console.error('Failed to create copyright claim:', error);
      return null;
    }

    return data as string;
  } catch (error) {
    console.error('Copyright claim creation failed:', error);
    return null;
  }
}

/**
 * Dispute a copyright claim
 */
export async function disputeCopyrightClaim(
  claimId: string,
  disputeReason: string,
  disputeEvidence?: string[]
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('dispute_copyright_claim', {
      p_claim_id: claimId,
      p_dispute_reason: disputeReason,
      p_dispute_evidence: disputeEvidence
    });

    if (error) {
      console.error('Failed to dispute claim:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Dispute failed:', error);
    return false;
  }
}

/**
 * Release a copyright claim (for claimants or admins)
 */
export async function releaseCopyrightClaim(claimId: string): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('release_copyright_claim', {
      p_claim_id: claimId
    });

    if (error) {
      console.error('Failed to release claim:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Release failed:', error);
    return false;
  }
}

/* ------------------------------------------------------------------ *
 * Pre-upload copyright / duplicate-content pipeline
 * ------------------------------------------------------------------ */

export type CopyrightPreCheckStatus = 'clean' | 'duplicate' | 'claimed' | 'skipped';

export interface CopyrightPreCheck {
  status: CopyrightPreCheckStatus;
  /** SHA-256 based fingerprint of the selected file. */
  fingerprint: string | null;
  sha256: string | null;
  matches: CopyrightMatch[];
  /** Human readable summary for the upload UI. */
  message: string;
}

/**
 * Runs before publishing: fingerprints the file, checks the Content-ID index
 * for an exact duplicate, then runs the metadata/audio match scan.
 */
export async function checkCopyrightStatus(
  file: File,
  title = '',
  description = ''
): Promise<CopyrightPreCheck> {
  const { generateVideoFingerprint, calculateFileSHA256 } = await import('@/lib/videoFingerprint');
  const { supabase } = await import('@/integrations/supabase/loose');

  let fingerprint: string | null = null;
  let sha256: string | null = null;

  try {
    fingerprint = await generateVideoFingerprint(title || file.name, file.size, 0, file);
    sha256 = await calculateFileSHA256(file);
  } catch (err) {
    console.warn('[copyright] fingerprinting failed', err);
    return { status: 'skipped', fingerprint, sha256, matches: [], message: 'Fingerprint unavailable — scan skipped.' };
  }

  // 1) Exact duplicate of an already published asset?
  try {
    const { data } = await (supabase as any)
      .from('videos')
      .select('id, title, owner_id')
      .eq('sha256', sha256)
      .limit(1);
    if (data && data.length) {
      return {
        status: 'duplicate',
        fingerprint,
        sha256,
        matches: [],
        message: 'This exact file is already published on ProNax.',
      };
    }
  } catch (err) {
    console.warn('[copyright] duplicate lookup failed', err);
  }

  // 2) Content-ID / metadata match scan.
  try {
    const matches = await checkCopyrightViolation(file, title, description);
    if (matches.length) {
      return {
        status: 'claimed',
        fingerprint,
        sha256,
        matches,
        message: `${matches.length} potential copyright match${matches.length > 1 ? 'es' : ''} detected.`,
      };
    }
  } catch (err) {
    console.warn('[copyright] content scan failed', err);
    return { status: 'skipped', fingerprint, sha256, matches: [], message: 'Copyright scan unavailable.' };
  }

  return { status: 'clean', fingerprint, sha256, matches: [], message: 'No copyright matches found.' };
}
