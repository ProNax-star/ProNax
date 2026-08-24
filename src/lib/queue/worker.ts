/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
/**
 * Worker Entry Point
 * Starts all background job workers with proper configuration
 */

import { createWorker } from './service';
import { jobHandlers } from './handlers';
import type { JobType } from './types';

// Worker configuration
const WORKER_CONFIG = {
  concurrency: {
    'video-processing': 3,
    'video-transcoding': 2,
    'analytics-aggregation': 5,
    'analytics-sync': 10,
    'email-notification': 5,
    'push-notification': 10,
    'content-moderation': 3,
    'copyright-check': 2,
    'thumbnail-generation': 5,
    'subtitle-generation': 2,
  },
  limiter: {
    max: 100,
    duration: 60000, // 100 jobs per minute
  },
};

/**
 * Start all workers
 */
export function startAllWorkers() {
  console.log('Starting all workers...');
  
  const queueTypes: JobType[] = [
    'video-processing',
    'video-transcoding',
    'analytics-aggregation',
    'analytics-sync',
    'email-notification',
    'push-notification',
    'content-moderation',
    'copyright-check',
    'thumbnail-generation',
    'subtitle-generation',
  ];
  
  const workers: any[] = [];
  
  for (const queueType of queueTypes) {
    const concurrency = WORKER_CONFIG.concurrency[queueType] || 5;
    
    const worker = createWorker(
      queueType,
      jobHandlers[queueType],
      {
        concurrency,
        limiter: WORKER_CONFIG.limiter,
      } as any
    );
    
    workers.push(worker);
    console.log(`Worker started for queue: ${queueType} (concurrency: ${concurrency})`);
  }
  
  console.log(`All ${workers.length} workers started successfully`);
  
  return workers;
}

/**
 * Start a specific worker
 */
export function startWorker(queueType: JobType) {
  console.log(`Starting worker for queue: ${queueType}`);
  
  const concurrency = WORKER_CONFIG.concurrency[queueType] || 5;
  
  const worker = createWorker(
    queueType,
    jobHandlers[queueType],
    {
      concurrency,
      limiter: WORKER_CONFIG.limiter,
    } as any
  );
  
  console.log(`Worker started for queue: ${queueType} (concurrency: ${concurrency})`);
  
  return worker;
}

/**
 * Start workers for production
 * Only starts essential workers for production
 */
export function startProductionWorkers() {
  console.log('Starting production workers...');
  
  const productionQueues: JobType[] = [
    'video-processing',
    'video-transcoding',
    'analytics-sync',
    'content-moderation',
    'copyright-check',
  ];
  
  const workers: any[] = [];
  
  for (const queueType of productionQueues) {
    const concurrency = WORKER_CONFIG.concurrency[queueType] || 5;
    
    const worker = createWorker(
      queueType,
      jobHandlers[queueType],
      {
        concurrency,
        limiter: WORKER_CONFIG.limiter,
      } as any
    );
    
    workers.push(worker);
    console.log(`Production worker started for queue: ${queueType} (concurrency: ${concurrency})`);
  }
  
  console.log(`All ${workers.length} production workers started successfully`);
  
  return workers;
}

/**
 * Start workers for development
 * Starts all workers with lower concurrency
 */
export function startDevelopmentWorkers() {
  console.log('Starting development workers...');
  
  const devConfig = {
    concurrency: {
      'video-processing': 1,
      'video-transcoding': 1,
      'analytics-aggregation': 2,
      'analytics-sync': 3,
      'email-notification': 2,
      'push-notification': 3,
      'content-moderation': 1,
      'copyright-check': 1,
      'thumbnail-generation': 2,
      'subtitle-generation': 1,
    },
  };
  
  const queueTypes: JobType[] = [
    'video-processing',
    'video-transcoding',
    'analytics-aggregation',
    'analytics-sync',
    'email-notification',
    'push-notification',
    'content-moderation',
    'copyright-check',
    'thumbnail-generation',
    'subtitle-generation',
  ];
  
  const workers: any[] = [];
  
  for (const queueType of queueTypes) {
    const concurrency = devConfig.concurrency[queueType] || 2;
    
    const worker = createWorker(
      queueType,
      jobHandlers[queueType],
      {
        concurrency,
        limiter: {
          max: 50,
          duration: 60000,
        },
      } as any
    );
    
    workers.push(worker);
    console.log(`Dev worker started for queue: ${queueType} (concurrency: ${concurrency})`);
  }
  
  console.log(`All ${workers.length} development workers started successfully`);
  
  return workers;
}

// Auto-start workers if this file is run directly
if (require.main === module) {
  const env = process.env.NODE_ENV || 'development';
  
  if (env === 'production') {
    startProductionWorkers();
  } else {
    startDevelopmentWorkers();
  }
  
  console.log('Workers are running. Press Ctrl+C to stop.');
}