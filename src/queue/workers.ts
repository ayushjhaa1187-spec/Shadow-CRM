// @ts-nocheck
import { Job, Worker } from "bull";
import {
  scrapeQueue,
  signalDecayQueue,
  leadScoringQueue,
  webhookQueue,
  redisClient,
} from "./config";
import { CompanyScraperOrchestrator, DEFAULT_SCRAPER_CONFIG } from "../scrapers/orchestrator";
import { AccountRepository } from "../services/accountRepository";
import { SignalRepository } from "../services/signalRepository";
import { LeadRepository } from "../services/leadRepository";
import { SignalNormalizer } from "../scrapers/signalNormalizer";

/**
 * Scrape Worker
 * Handles company scraping jobs
 */
export const scrapeWorker = new Worker(
  "scrape-company",
  async job => {
    const { domain, companyName } = job.data;

    console.log(`[${domain}] Starting scrape...`);
    job.progress(0);

    try {
      // Scrape company
      job.progress(20);
      const scrapedAccount = await CompanyScraperOrchestrator.scrapeCompany(
        domain,
        companyName,
        DEFAULT_SCRAPER_CONFIG
      );

      // Save to database
      job.progress(60);
      const account = await AccountRepository.upsertAccount(scrapedAccount);

      // Save signals
      job.progress(80);
      if (scrapedAccount.signals && scrapedAccount.signals.length > 0) {
        for (const signal of scrapedAccount.signals) {
          // Get client ID from job if available
          const clientId = job.data.clientId || "system";
          await SignalRepository.createSignal(clientId, account.id, signal);
        }
      }

      job.progress(100);
      return {
        accountId: account.id,
        domain,
        signalsExtracted: scrapedAccount.signals?.length || 0,
      };
    } catch (error) {
      console.error(`[${domain}] Scrape failed:`, error);
      throw error;
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
    },
    concurrency: 3, // Process 3 scrapes in parallel
  }
);

/**
 * Signal Decay Worker
 * Periodically updates signal decay values
 */
export const signalDecayWorker = new Worker(
  "signal-decay",
  async job => {
    const { accountId } = job.data;

    console.log(`[${accountId}] Updating signal decay...`);

    try {
      // Apply decay to all signals for account
      await SignalRepository.applyDecayToAccountSignals(accountId);

      return {
        accountId,
        success: true,
      };
    } catch (error) {
      console.error(`[${accountId}] Decay update failed:`, error);
      throw error;
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
    },
    concurrency: 10, // Update 10 accounts in parallel
  }
);

/**
 * Lead Scoring Worker
 * Score leads for a client
 */
export const leadScoringWorker = new Worker(
  "lead-scoring",
  async job => {
    const { clientId, accountIds } = job.data;

    console.log(`[${clientId}] Scoring ${accountIds.length} accounts...`);
    job.progress(0);

    try {
      const totalAccounts = accountIds.length;
      const results = [];

      for (let i = 0; i < accountIds.length; i++) {
        const accountId = accountIds[i];

        try {
          // Get account with signals
          const account = await AccountRepository.getAccountById(accountId);
          if (!account) continue;

          // Get signals
          const signals = await SignalRepository.getSignalsByAccount(accountId);

          // Create lead
          const lead = await LeadRepository.createLead(clientId, accountId, signals);

          results.push({
            accountId,
            leadId: lead.id,
            score: lead.finalScore,
            tier: lead.tier,
          });
        } catch (error) {
          console.error(`Failed to score account ${accountId}:`, error);
        }

        job.progress(Math.round(((i + 1) / totalAccounts) * 100));
      }

      return {
        clientId,
        leadsCreated: results.length,
        results,
      };
    } catch (error) {
      console.error(`[${clientId}] Scoring failed:`, error);
      throw error;
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
    },
    concurrency: 2,
  }
);

/**
 * Webhook Delivery Worker
 * Send webhooks to external services (HubSpot, Pipedrive)
 */
export const webhookWorker = new Worker(
  "webhook-delivery",
  async job => {
    const { webhookUrl, payload, retries = 3 } = job.data;

    console.log(`[Webhook] Sending to ${webhookUrl}...`);

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Shadow-CRM/1.0",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}`);
      }

      return {
        webhookUrl,
        success: true,
        status: response.status,
      };
    } catch (error) {
      console.error(`[Webhook] Delivery failed:`, error);

      if (retries > 0) {
        // Retry with exponential backoff
        const delay = Math.pow(2, 3 - retries) * 1000; // 1s, 2s, 4s
        throw new Error(`Retrying in ${delay}ms - ${error}`);
      }

      throw error;
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
    },
    concurrency: 5,
  }
);

/**
 * Subscribe to worker events
 */
export function setupWorkerListeners() {
  scrapeWorker.on("failed", (job, err) => {
    console.error(`Scrape job ${job.id} failed:`, err.message);
  });

  signalDecayWorker.on("failed", (job, err) => {
    console.error(`Decay job ${job.id} failed:`, err.message);
  });

  leadScoringWorker.on("failed", (job, err) => {
    console.error(`Scoring job ${job.id} failed:`, err.message);
  });

  webhookWorker.on("failed", (job, err) => {
    console.error(`Webhook job ${job.id} failed:`, err.message);
  });
}

/**
 * Schedule periodic decay updates
 */
export async function schedulePeriodicDecay(intervalHours: number = 6) {
  const interval = intervalHours * 60 * 60 * 1000;

  setInterval(async () => {
    try {
      console.log("[Scheduler] Queuing signal decay updates for all accounts...");

      // Get all accounts
      const allAccounts = await AccountRepository.getAccountsByIds(
        // In production, you'd paginate this
        // For now, just get recent ones
        [...Array(100).keys()]
      );

      // Queue decay jobs for each account
      for (const account of allAccounts) {
        await signalDecayQueue.add(
          "update-decay",
          { accountId: account.id },
          {
            attempts: 3,
            backoff: {
              type: "exponential",
              delay: 2000,
            },
          }
        );
      }

      console.log(`[Scheduler] Queued ${allAccounts.length} decay updates`);
    } catch (error) {
      console.error("[Scheduler] Failed to schedule decay updates:", error);
    }
  }, interval);
}

/**
 * Get worker stats
 */
export async function getWorkerStats() {
  const workers = [scrapeWorker, signalDecayWorker, leadScoringWorker, webhookWorker];
  const stats: Record<string, any> = {};

  for (const worker of workers) {
    const queue = worker.queue;
    const counts = await queue.getJobCounts(
      "active",
      "waiting",
      "completed",
      "failed"
    );

    stats[worker.name] = counts;
  }

  return stats;
}
