/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
/**
 * Queue Service Implementation
 * Manages BullMQ queues for async task processing with Redis backend
 */

import { Queue, Worker, Job } from 'bullmq';
type QueueScheduler = any;
import { getRedisClient } from '../redis';
import type {
  JobType,
  JobDataUnion,
  JobResultUnion,
  JobOptions,
  QueueConfig,
  WorkerConfig,
} from './types';

// Queue instances
const queues: Map<JobType, Queue> = new Map();
const workers: Map<JobType, Worker> = new Map();
const schedulers: Map<JobType, QueueScheduler> = new Map();

/**
 * Get Redis connection configuration
 */
function getRedisConfig() {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  };
}

/**
 * Get or create a queue
 */
export function getQueue<T extends JobType>(name: T): Queue<JobDataUnion, JobResultUnion> {
  if (!queues.has(name)) {
    const queue = new Queue<JobDataUnion, JobResultUnion>(name, {
      connection: getRedisConfig(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });

    queues.set(name, queue);
    console.log(`Queue created: ${name}`);
  }

  return queues.get(name)!;
}

/**
 * Add a job to a queue
 */
export async function addJob<T extends JobType>(
  queueName: T,
  data: JobDataUnion,
  options?: JobOptions
): Promise<Job<JobDataUnion, JobResultUnion>> {
  const queue = getQueue(queueName);
  const job = await queue.add(queueName, data, options);
  console.log(`Job added to queue ${queueName}: ${job.id}`);
  return job;
}

/**
 * Add multiple jobs to a queue
 */
export async function addBulkJobs<T extends JobType>(
  queueName: T,
  jobs: Array<{ data: JobDataUnion; options?: JobOptions }>
): Promise<Job<JobDataUnion, JobResultUnion>[]> {
  const queue = getQueue(queueName);
  const jobsWithNames = jobs.map((job) => ({
    name: queueName,
    data: job.data,
    opts: job.options,
  }));
  const addedJobs = await queue.addBulk(jobsWithNames);
  console.log(`Added ${addedJobs.length} jobs to queue ${queueName}`);
  return addedJobs;
}

/**
 * Get job by ID
 */
export async function getJob<T extends JobType>(
  queueName: T,
  jobId: string
): Promise<Job<JobDataUnion, JobResultUnion> | undefined> {
  const queue = getQueue(queueName);
  return await queue.getJob(jobId);
}

/**
 * Remove a job
 */
export async function removeJob<T extends JobType>(
  queueName: T,
  jobId: string
): Promise<boolean> {
  const queue = getQueue(queueName);
  const job = await queue.getJob(jobId);
  if (job) {
    await job.remove();
    console.log(`Job removed: ${jobId}`);
    return true;
  }
  return false;
}

/**
 * Retry a failed job
 */
export async function retryJob<T extends JobType>(
  queueName: T,
  jobId: string
): Promise<Job<JobDataUnion, JobResultUnion> | undefined> {
  const queue = getQueue(queueName);
  const job = await queue.getJob(jobId);
  if (job) {
    await job.retry();
    console.log(`Job retried: ${jobId}`);
    return job;
  }
  return undefined;
}

/**
 * Get queue statistics
 */
export async function getQueueStats<T extends JobType>(
  queueName: T
): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}> {
  const queue = getQueue(queueName);
  const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
    (await queue.isPaused()) ? 1 : 0,
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    paused,
  };
}

/**
 * Pause a queue
 */
export async function pauseQueue<T extends JobType>(queueName: T): Promise<void> {
  const queue = getQueue(queueName);
  await queue.pause();
  console.log(`Queue paused: ${queueName}`);
}

/**
 * Resume a queue
 */
export async function resumeQueue<T extends JobType>(queueName: T): Promise<void> {
  const queue = getQueue(queueName);
  await queue.resume();
  console.log(`Queue resumed: ${queueName}`);
}

/**
 * Clear a queue (remove all jobs)
 */
export async function clearQueue<T extends JobType>(queueName: T): Promise<void> {
  const queue = getQueue(queueName);
  await queue.drain();
  await queue.clean(0, 0, 'wait');
  await queue.clean(0, 0, 'active');
  await queue.clean(0, 0, 'completed');
  await queue.clean(0, 0, 'failed');
  await queue.clean(0, 0, 'delayed');
  console.log(`Queue cleared: ${queueName}`);
}

/**
 * Close all queues
 */
export async function closeAllQueues(): Promise<void> {
  for (const [name, queue] of queues) {
    await queue.close();
    console.log(`Queue closed: ${name}`);
  }
  queues.clear();
}

/**
 * Worker handler type
 */
export type JobHandler<T extends JobType> = (
  job: Job<JobDataUnion, JobResultUnion>
) => Promise<JobResultUnion>;

/**
 * Create a worker for a queue
 */
export function createWorker<T extends JobType>(
  queueName: T,
  handler: JobHandler<T>,
  options?: WorkerConfig
): Worker<JobDataUnion, JobResultUnion> {
  if (workers.has(queueName)) {
    console.log(`Worker already exists for queue: ${queueName}`);
    return workers.get(queueName)!;
  }

  const worker = new Worker<JobDataUnion, JobResultUnion>(
    queueName,
    async (job) => {
      console.log(`Processing job ${job.id} in queue ${queueName}`);
      try {
        const result = await handler(job);
        console.log(`Job ${job.id} completed successfully`);
        return result;
      } catch (error) {
        console.error(`Job ${job.id} failed:`, error);
        throw error;
      }
    },
    {
      connection: getRedisConfig(),
      concurrency: options?.concurrency || 5,
      limiter: options?.limiter,
    }
  );

  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed in queue ${queueName}`);
  });

  worker.on('failed', (job, error) => {
    console.error(`Job ${job?.id} failed in queue ${queueName}:`, error.message);
  });

  worker.on('error', (error) => {
    console.error(`Worker error in queue ${queueName}:`, error);
  });

  workers.set(queueName, worker);
  console.log(`Worker created for queue: ${queueName}`);

  return worker;
}

/**
 * Close a specific worker
 */
export async function closeWorker<T extends JobType>(queueName: T): Promise<void> {
  const worker = workers.get(queueName);
  if (worker) {
    await worker.close();
    workers.delete(queueName);
    console.log(`Worker closed for queue: ${queueName}`);
  }
}

/**
 * Close all workers
 */
export async function closeAllWorkers(): Promise<void> {
  for (const [name, worker] of workers) {
    await worker.close();
    console.log(`Worker closed for queue: ${name}`);
  }
  workers.clear();
}

/**
 * Graceful shutdown
 */
export async function gracefulShutdown(): Promise<void> {
  console.log('Starting graceful shutdown...');
  
  await closeAllWorkers();
  await closeAllQueues();
  
  console.log('Graceful shutdown complete');
}

// Handle process termination
if (typeof process !== 'undefined') {
  process.on('SIGINT', async () => {
    await gracefulShutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await gracefulShutdown();
    process.exit(0);
  });
}
