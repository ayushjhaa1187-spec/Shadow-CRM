import { Router, Request, Response } from "express";
import {
  scrapeQueue,
  signalDecayQueue,
  leadScoringQueue,
  webhookQueue,
  getQueueStats,
  pauseAllQueues,
  resumeAllQueues,
  cleanOldJobs,
} from "../queue/config";
import { getWorkerStats } from "../queue/workers";

const router = Router();

/**
 * POST /api/queue/scrape
 * Add a scrape job to the queue
 */
router.post("/scrape", async (req: Request, res: Response) => {
  try {
    const { domain, companyName, clientId } = req.body;

    if (!domain || !companyName) {
      return res.status(400).json({
        error: "domain and companyName are required",
      });
    }

    const job = await scrapeQueue.add(
      "scrape",
      {
        domain,
        companyName,
        clientId: clientId || "system",
      },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: false,
        removeOnFail: false,
      }
    );

    res.json({
      success: true,
      jobId: job.id,
      status: "queued",
      domain,
      message: "Scrape job added to queue",
    });
  } catch (error) {
    console.error("Error queuing scrape job:", error);
    res.status(500).json({ error: "Failed to queue scrape job" });
  }
});

/**
 * POST /api/queue/scrape-batch
 * Add batch scrape jobs to the queue
 */
router.post("/scrape-batch", async (req: Request, res: Response) => {
  try {
    const { companies, clientId } = req.body;

    if (!Array.isArray(companies) || companies.length === 0) {
      return res.status(400).json({
        error: "companies array is required with at least one entry",
      });
    }

    const jobIds = [];

    for (const company of companies) {
      const job = await scrapeQueue.add(
        "scrape",
        {
          domain: company.domain,
          companyName: company.name,
          clientId: clientId || "system",
        },
        {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
          removeOnComplete: false,
        }
      );

      jobIds.push(job.id);
    }

    res.json({
      success: true,
      jobIds,
      count: jobIds.length,
      status: "queued",
      message: `${jobIds.length} scrape jobs added to queue`,
    });
  } catch (error) {
    console.error("Error queuing batch scrape:", error);
    res.status(500).json({ error: "Failed to queue batch scrape" });
  }
});

/**
 * POST /api/queue/score
 * Add lead scoring job to queue
 */
router.post("/score", async (req: Request, res: Response) => {
  try {
    const { clientId, accountIds } = req.body;

    if (!clientId || !Array.isArray(accountIds) || accountIds.length === 0) {
      return res.status(400).json({
        error: "clientId and accountIds array are required",
      });
    }

    const job = await leadScoringQueue.add(
      "score",
      {
        clientId,
        accountIds,
      },
      {
        attempts: 2,
        removeOnComplete: false,
      }
    );

    res.json({
      success: true,
      jobId: job.id,
      status: "queued",
      accountCount: accountIds.length,
    });
  } catch (error) {
    console.error("Error queuing scoring job:", error);
    res.status(500).json({ error: "Failed to queue scoring job" });
  }
});

/**
 * POST /api/queue/webhook
 * Add webhook delivery job to queue
 */
router.post("/webhook", async (req: Request, res: Response) => {
  try {
    const { webhookUrl, payload } = req.body;

    if (!webhookUrl || !payload) {
      return res.status(400).json({
        error: "webhookUrl and payload are required",
      });
    }

    const job = await webhookQueue.add(
      "deliver",
      {
        webhookUrl,
        payload,
      },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: true,
      }
    );

    res.json({
      success: true,
      jobId: job.id,
      status: "queued",
    });
  } catch (error) {
    console.error("Error queuing webhook:", error);
    res.status(500).json({ error: "Failed to queue webhook" });
  }
});

/**
 * GET /api/queue/job/:jobId
 * Get job status
 */
router.get("/job/:jobId", async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const queues = [scrapeQueue, signalDecayQueue, leadScoringQueue, webhookQueue];

    let job;

    // Search all queues for the job
    for (const queue of queues) {
      const j = await queue.getJob(jobId);
      if (j) {
        job = j;
        break;
      }
    }

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const state = await job.getState();
    const progress = job._progress || 0;

    res.json({
      jobId: job.id,
      state,
      progress,
      data: job.data,
      result: job.returnvalue,
      failedReason: job.failedReason,
      attempts: job.attempts || 0,
      attemptsMade: job.attemptsMade || 0,
    });
  } catch (error) {
    console.error("Error getting job status:", error);
    res.status(500).json({ error: "Failed to get job status" });
  }
});

/**
 * GET /api/queue/stats
 * Get queue statistics
 */
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const queueStats = await getQueueStats();
    const workerStats = await getWorkerStats();

    res.json({
      queues: queueStats,
      workers: workerStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting queue stats:", error);
    res.status(500).json({ error: "Failed to get queue stats" });
  }
});

/**
 * POST /api/queue/pause
 * Pause all queues
 */
router.post("/pause", async (req: Request, res: Response) => {
  try {
    await pauseAllQueues();

    res.json({
      success: true,
      message: "All queues paused",
    });
  } catch (error) {
    console.error("Error pausing queues:", error);
    res.status(500).json({ error: "Failed to pause queues" });
  }
});

/**
 * POST /api/queue/resume
 * Resume all queues
 */
router.post("/resume", async (req: Request, res: Response) => {
  try {
    await resumeAllQueues();

    res.json({
      success: true,
      message: "All queues resumed",
    });
  } catch (error) {
    console.error("Error resuming queues:", error);
    res.status(500).json({ error: "Failed to resume queues" });
  }
});

/**
 * POST /api/queue/clean
 * Clean old jobs
 */
router.post("/clean", async (req: Request, res: Response) => {
  try {
    const { daysOld = 7 } = req.body;

    await cleanOldJobs(daysOld);

    res.json({
      success: true,
      message: `Cleaned jobs older than ${daysOld} days`,
    });
  } catch (error) {
    console.error("Error cleaning jobs:", error);
    res.status(500).json({ error: "Failed to clean jobs" });
  }
});

/**
 * DELETE /api/queue/job/:jobId
 * Cancel/remove a job
 */
router.delete("/job/:jobId", async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const queues = [scrapeQueue, signalDecayQueue, leadScoringQueue, webhookQueue];

    for (const queue of queues) {
      const job = await queue.getJob(jobId);
      if (job) {
        await job.remove();
        return res.json({
          success: true,
          message: "Job removed",
        });
      }
    }

    res.status(404).json({ error: "Job not found" });
  } catch (error) {
    console.error("Error removing job:", error);
    res.status(500).json({ error: "Failed to remove job" });
  }
});

export default router;
