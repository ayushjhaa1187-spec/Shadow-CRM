// @ts-nocheck
import { Queue, Worker, QueueEvents } from "bull";
import redis from "redis";

// Redis client
export const redisClient = redis.createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.connect().catch(err => console.error("Redis connection error:", err));

/**
 * Job queues for different operations
 */

// Scraping queue
export const scrapeQueue = new Queue("scrape-company", {
  connection: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
  },
});

// Signal decay update queue (periodic)
export const signalDecayQueue = new Queue("signal-decay", {
  connection: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
  },
});

// Lead scoring queue
export const leadScoringQueue = new Queue("lead-scoring", {
  connection: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
  },
});

// Webhook delivery queue
export const webhookQueue = new Queue("webhook-delivery", {
  connection: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
  },
});

// Batch operation queue
export const batchQueue = new Queue("batch-operations", {
  connection: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
  },
});

/**
 * Configure queue event listeners
 */
export function setupQueueListeners() {
  const queues = [scrapeQueue, signalDecayQueue, leadScoringQueue, webhookQueue, batchQueue];

  for (const queue of queues) {
    const queueEvents = new QueueEvents(queue.name, {
      connection: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
      },
    });

    queueEvents.on("completed", job => {
      console.log(`✓ Job ${job.id} completed:`, job.name);
    });

    queueEvents.on("failed", ({ jobId, failedReason }) => {
      console.error(`✗ Job ${jobId} failed:`, failedReason);
    });

    queueEvents.on("progress", ({ jobId, progress }) => {
      console.log(`⟳ Job ${jobId} progress: ${progress}%`);
    });
  }
}

/**
 * Get queue stats
 */
export async function getQueueStats() {
  const queues = [scrapeQueue, signalDecayQueue, leadScoringQueue, webhookQueue, batchQueue];
  const stats: Record<string, any> = {};

  for (const queue of queues) {
    const counts = await queue.getJobCounts(
      "active",
      "waiting",
      "completed",
      "failed"
    );

    stats[queue.name] = {
      ...counts,
      isPaused: await queue.isPaused(),
    };
  }

  return stats;
}

/**
 * Pause all queues (for maintenance)
 */
export async function pauseAllQueues() {
  const queues = [scrapeQueue, signalDecayQueue, leadScoringQueue, webhookQueue, batchQueue];

  for (const queue of queues) {
    await queue.pause();
    console.log(`Paused ${queue.name}`);
  }
}

/**
 * Resume all queues
 */
export async function resumeAllQueues() {
  const queues = [scrapeQueue, signalDecayQueue, leadScoringQueue, webhookQueue, batchQueue];

  for (const queue of queues) {
    await queue.resume();
    console.log(`Resumed ${queue.name}`);
  }
}

/**
 * Clean old jobs from queues
 */
export async function cleanOldJobs(daysOld: number = 7) {
  const queues = [scrapeQueue, signalDecayQueue, leadScoringQueue, webhookQueue, batchQueue];
  const grace = daysOld * 24 * 60 * 60 * 1000; // Convert to milliseconds

  for (const queue of queues) {
    const removed = await queue.clean(grace, 100);
    console.log(`Cleaned ${removed.length} jobs from ${queue.name}`);
  }
}

/**
 * Gracefully shutdown queues
 */
export async function shutdownQueues() {
  const queues = [scrapeQueue, signalDecayQueue, leadScoringQueue, webhookQueue, batchQueue];

  for (const queue of queues) {
    await queue.close();
  }

  await redisClient.quit();
  console.log("All queues shut down");
}
