/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
/**
 * ThreatExchange Service
 * Handles communication with FastAPI server for PDQ image hashing and vPDQ video hashing
 */

export interface PDQHashResult {
  success: boolean;
  pdq_hash?: string;
  quality_score?: number;
  hash_length?: number;
  error?: string;
}

export interface VPDQHashResult {
  success: boolean;
  vpdq_hash?: string;
  frame_count?: number;
  quality_score?: number;
  error?: string;
}

export interface PDQCompareResult {
  success: boolean;
  hamming_distance?: number;
  threshold?: number;
  is_match?: boolean;
  similarity?: number;
  similarity_percentage?: number;
  error?: string;
}

class ThreatExchangeService {
  private workerUrl: string;

  constructor(workerUrl: string = 'http://localhost:8000') {
    this.workerUrl = workerUrl;
  }

  /**
   * Compute PDQ hash for an image file
   */
  async computePDQHash(imageFile: File): Promise<PDQHashResult> {
    try {
      const formData = new FormData();
      formData.append('file', imageFile);

      const response = await fetch(`${this.workerUrl}/pdq/hash`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error computing PDQ hash:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Compute vPDQ hash for a video file
   */
  async computeVPDQHash(videoFile: File): Promise<VPDQHashResult> {
    try {
      const formData = new FormData();
      formData.append('file', videoFile);

      const response = await fetch(`${this.workerUrl}/vpdq/hash`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error computing vPDQ hash:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Compare two PDQ hashes for similarity
   */
  async comparePDQHashes(
    hash1: string,
    hash2: string,
    threshold: number = 31
  ): Promise<PDQCompareResult> {
    try {
      const formData = new FormData();
      formData.append('hash1', hash1);
      formData.append('hash2', hash2);
      formData.append('threshold', threshold.toString());

      const response = await fetch(`${this.workerUrl}/pdq/compare`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error comparing PDQ hashes:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check if the FastAPI server is healthy
   */
  async healthCheck(): Promise<{
    status: string;
    audio_worker_initialized: boolean;
    threat_worker_initialized: boolean;
  }> {
    try {
      const response = await fetch(`${this.workerUrl}/health`);
      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        status: 'unhealthy',
        audio_worker_initialized: false,
        threat_worker_initialized: false,
      };
    }
  }
}

export const threatExchangeService = new ThreatExchangeService();
