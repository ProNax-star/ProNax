/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
/**
 * Task Producers
 * Provides convenient functions to enqueue jobs for different background tasks
 */

import { addJob, addBulkJobs } from './service';
import type {
  JobType,
  JobDataUnion,
  JobOptions,
  VideoProcessingJobData,
  VideoTranscodingJobData,
  AnalyticsAggregationJobData,
  AnalyticsSyncJobData,
  EmailNotificationJobData,
  PushNotificationJobData,
  ContentModerationJobData,
  CopyrightCheckJobData,
  ThumbnailGenerationJobData,
  SubtitleGenerationJobData,
} from './types';

/**
 * Enqueue video processing job
 */
export async function enqueueVideoProcessing(
  data: VideoProcessingJobData,
  options?: JobOptions
) {
  return await addJob('video-processing', data, {
    priority: 10,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    ...options,
  });
}

/**
 * Enqueue video transcoding job
 */
export async function enqueueVideoTranscoding(
  data: VideoTranscodingJobData,
  options?: JobOptions
) {
  return await addJob('video-transcoding', data, {
    priority: 8,
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    timeout: 300000, // 5 minutes
    ...options,
  });
}

/**
 * Enqueue analytics aggregation job
 */
export async function enqueueAnalyticsAggregation(
  data: AnalyticsAggregationJobData,
  options?: JobOptions
) {
  return await addJob('analytics-aggregation', data, {
    priority: 5,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    ...options,
  });
}

/**
 * Enqueue analytics sync job (batch)
 */
export async function enqueueAnalyticsSync(
  data: AnalyticsSyncJobData,
  options?: JobOptions
) {
  return await addJob('analytics-sync', data, {
    priority: 5,
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    ...options,
  });
}

/**
 * Enqueue email notification job
 */
export async function enqueueEmailNotification(
  data: EmailNotificationJobData,
  options?: JobOptions
) {
  const priority = data.priority === 'high' ? 10 : data.priority === 'normal' ? 5 : 1;
  
  return await addJob('email-notification', data, {
    priority,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
    ...options,
  });
}

/**
 * Enqueue push notification job
 */
export async function enqueuePushNotification(
  data: PushNotificationJobData,
  options?: JobOptions
) {
  const priority = data.priority === 'high' ? 10 : data.priority === 'normal' ? 5 : 1;
  
  return await addJob('push-notification', data, {
    priority,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    ...options,
  });
}

/**
 * Enqueue content moderation job
 */
export async function enqueueContentModeration(
  data: ContentModerationJobData,
  options?: JobOptions
) {
  return await addJob('content-moderation', data, {
    priority: 8,
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    ...options,
  });
}

/**
 * Enqueue copyright check job
 */
export async function enqueueCopyrightCheck(
  data: CopyrightCheckJobData,
  options?: JobOptions
) {
  return await addJob('copyright-check', data, {
    priority: 7,
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    timeout: 120000, // 2 minutes
    ...options,
  });
}

/**
 * Enqueue thumbnail generation job
 */
export async function enqueueThumbnailGeneration(
  data: ThumbnailGenerationJobData,
  options?: JobOptions
) {
  return await addJob('thumbnail-generation', data, {
    priority: 6,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    ...options,
  });
}

/**
 * Enqueue subtitle generation job
 */
export async function enqueueSubtitleGeneration(
  data: SubtitleGenerationJobData,
  options?: JobOptions
) {
  return await addJob('subtitle-generation', data, {
    priority: 6,
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    timeout: 300000, // 5 minutes
    ...options,
  });
}

/**
 * Enqueue video upload complete workflow
 * This chains multiple jobs: processing -> transcoding -> moderation -> copyright
 */
export async function enqueueVideoUploadWorkflow(
  videoId: string,
  videoPath: string,
  ownerId: string,
  options?: JobOptions
) {
  // Step 1: Video processing
  await enqueueVideoProcessing(
    {
      videoId,
      videoPath,
      ownerId,
    },
    options
  );
  
  // Step 2: Video transcoding (after processing)
  await enqueueVideoTranscoding(
    {
      videoId,
      inputPath: videoPath,
      outputFormats: ['1080p', '720p', '480p', '360p'],
      ownerId,
    },
    {
      ...options,
      delay: 5000, // Delay 5 seconds after processing
    }
  );
  
  // Step 3: Content moderation
  await enqueueContentModeration(
    {
      videoId,
      title: 'Video Title',
      description: 'Video Description',
      tags: [],
      userId: ownerId,
    },
    {
      ...options,
      delay: 10000, // Delay 10 seconds after upload
    }
  );
  
  // Step 4: Copyright check
  await enqueueCopyrightCheck(
    {
      videoId,
      videoPath,
      ownerId,
    },
    {
      ...options,
      delay: 15000, // Delay 15 seconds after upload
    }
  );
  
  console.log(`Video upload workflow enqueued for video: ${videoId}`);
}

/**
 * Enqueue analytics sync batch
 */
export async function enqueueAnalyticsSyncBatch(
  events: AnalyticsSyncJobData['events'],
  options?: JobOptions
) {
  // Split events into batches of 100
  const batchSize = 100;
  const batches: any[] = [];
  
  for (let i = 0; i < events.length; i += batchSize) {
    batches.push(events.slice(i, i + batchSize));
  }
  
  // Enqueue each batch
  const jobs = batches.map((batch) => ({
    data: { events: batch } as AnalyticsSyncJobData,
    options,
  }));
  
  return await addBulkJobs('analytics-sync', jobs);
}

/**
 * Enqueue welcome email for new user
 */
export async function enqueueWelcomeEmail(
  userEmail: string,
  userName: string,
  options?: JobOptions
) {
  return await enqueueEmailNotification(
    {
      to: userEmail,
      subject: 'Welcome to Pro Nax!',
      template: 'welcome',
      data: {
        userName,
      },
      priority: 'normal',
    },
    options
  );
}

/**
 * Enqueue video published notification
 */
export async function enqueueVideoPublishedNotification(
  userId: string,
  videoTitle: string,
  videoId: string,
  options?: JobOptions
) {
  // Send push notification
  await enqueuePushNotification(
    {
      userId,
      title: 'Your video is live!',
      body: `"${videoTitle}" is now live on Pro Nax`,
      data: {
        videoId,
        type: 'video_published',
      },
      priority: 'normal',
    },
    options
  );
  
  // Send email notification
  // In production, fetch user email from database
  await enqueueEmailNotification(
    {
      to: 'user@example.com', // Replace with actual user email
      subject: 'Your video is live!',
      template: 'video_published',
      data: {
        videoTitle,
        videoId,
      },
      priority: 'normal',
    },
    options
  );
}

/**
 * Enqueue daily analytics aggregation (scheduled job)
 */
export async function enqueueDailyAnalyticsAggregation(
  channelId: string,
  date: Date = new Date(),
  options?: JobOptions
) {
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);
  
  return await enqueueAnalyticsAggregation(
    {
      channelId,
      startDate,
      endDate,
      metrics: ['views', 'likes', 'comments', 'shares', 'watch-time'],
    },
    {
      ...options,
      repeat: {
        every: 86400000, // Every 24 hours
      },
    }
  );
}

/**
 * Enqueue copyright check on all new videos (scheduled job)
 */
export async function enqueueBulkCopyrightCheck(
  videoIds: string[],
  ownerId: string,
  options?: JobOptions
) {
  const jobs = videoIds.map((videoId) => ({
    data: {
      videoId,
      videoPath: '', // Will be fetched from database
      ownerId,
    } as CopyrightCheckJobData,
    options,
  }));
  
  return await addBulkJobs('copyright-check', jobs);
}
