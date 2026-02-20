import { Router, Request, Response } from "express";
import { CompanyScraperOrchestrator, DEFAULT_SCRAPER_CONFIG } from "../scrapers/orchestrator";
import { AccountRepository } from "../services/accountRepository";
import { SignalRepository } from "../services/signalRepository";

const router = Router();

/**
 * POST /api/scrape
 * Scrape a single company by domain
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { domain, companyName } = req.body;

    if (!domain || !companyName) {
      return res.status(400).json({
        error: "domain and companyName are required",
      });
    }

    // Validate domain format
    if (!/^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/.test(domain)) {
      return res.status(400).json({
        error: "Invalid domain format",
      });
    }

    res.json({
      status: "scraping",
      domain,
      message: "Scrape job queued. Results will be available shortly.",
    });

    // Run scraping in background (don't wait)
    (async () => {
      try {
        const scrapedAccount = await CompanyScraperOrchestrator.scrapeCompany(
          domain,
          companyName,
          DEFAULT_SCRAPER_CONFIG
        );

        // Save account to database
        const account = await AccountRepository.upsertAccount(scrapedAccount);

        // Save signals
        if (scrapedAccount.signals && scrapedAccount.signals.length > 0) {
          // Note: In production, you'd have a clientId from auth context
          // For now, signals are stored without a specific client association
          for (const signal of scrapedAccount.signals) {
            await SignalRepository.createSignal(
              "temp-client-id", // Would come from auth
              account.id,
              signal
            );
          }
        }

        console.log(`✓ Successfully scraped ${domain}`);
      } catch (error) {
        console.error(`✗ Failed to scrape ${domain}:`, error);
      }
    })();
  } catch (error) {
    console.error("Error initiating scrape:", error);
    res.status(500).json({ error: "Failed to initiate scrape" });
  }
});

/**
 * POST /api/scrape/batch
 * Scrape multiple companies
 */
router.post("/batch", async (req: Request, res: Response) => {
  try {
    const { companies, concurrency = 3 } = req.body;

    if (!Array.isArray(companies) || companies.length === 0) {
      return res.status(400).json({
        error: "companies array is required with at least one entry",
      });
    }

    // Validate all companies
    for (const company of companies) {
      if (!company.domain || !company.name) {
        return res.status(400).json({
          error: "Each company must have domain and name",
        });
      }
    }

    res.json({
      status: "batch_queued",
      count: companies.length,
      concurrency,
      message:
        "Batch scrape job queued. Check back for results.",
    });

    // Run batch scraping in background
    (async () => {
      try {
        const results = await CompanyScraperOrchestrator.scrapeCompanies(
          companies,
          DEFAULT_SCRAPER_CONFIG,
          concurrency
        );

        // Save all accounts and signals
        for (const scrapedAccount of results) {
          const account = await AccountRepository.upsertAccount(scrapedAccount);

          if (scrapedAccount.signals && scrapedAccount.signals.length > 0) {
            for (const signal of scrapedAccount.signals) {
              await SignalRepository.createSignal(
                "temp-client-id",
                account.id,
                signal
              );
            }
          }
        }

        console.log(`✓ Batch scrape completed: ${results.length} companies`);
      } catch (error) {
        console.error("✗ Batch scrape failed:", error);
      }
    })();
  } catch (error) {
    console.error("Error initiating batch scrape:", error);
    res.status(500).json({ error: "Failed to initiate batch scrape" });
  }
});

/**
 * POST /api/scrape/domain/:domain
 * Scrape by domain only (get company name from WHOIS or domain)
 */
router.post("/domain/:domain", async (req: Request, res: Response) => {
  try {
    const { domain } = req.params;
    const { companyName } = req.body;

    const name = companyName || domain.split(".")[0];

    res.json({
      status: "scraping",
      domain,
      message: "Scrape initiated",
    });

    (async () => {
      try {
        const scrapedAccount = await CompanyScraperOrchestrator.scrapeCompany(
          domain,
          name,
          DEFAULT_SCRAPER_CONFIG
        );

        const account = await AccountRepository.upsertAccount(scrapedAccount);

        if (scrapedAccount.signals) {
          for (const signal of scrapedAccount.signals) {
            await SignalRepository.createSignal(
              "temp-client-id",
              account.id,
              signal
            );
          }
        }

        console.log(`✓ Scraped ${domain}`);
      } catch (error) {
        console.error(`✗ Failed to scrape ${domain}:`, error);
      }
    })();
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to initiate scrape" });
  }
});

/**
 * GET /api/scrape/status/:domain
 * Get scrape status for a domain
 */
router.get("/status/:domain", async (req: Request, res: Response) => {
  try {
    const { domain } = req.params;

    const account = await AccountRepository.getAccountByDomain(domain);

    if (!account) {
      return res.status(404).json({
        status: "not_found",
        message: "No scraped data found for this domain",
      });
    }

    const summary = CompanyScraperOrchestrator.getScrapeSummary({
      name: account.name,
      domain: account.domain,
      website: account.website,
      techStack: account.techStack || undefined,
      signals: account.signals || [],
    });

    res.json({
      status: "scraped",
      domain,
      lastScraped: account.lastScrapedAt,
      summary,
    });
  } catch (error) {
    console.error("Error checking scrape status:", error);
    res.status(500).json({ error: "Failed to check status" });
  }
});

export default router;
