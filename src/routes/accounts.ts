import { Router, Request, Response } from "express";
import { AccountRepository } from "../services/accountRepository";
import { SignalRepository } from "../services/signalRepository";

const router = Router();

/**
 * GET /api/accounts/:id
 * Get account by ID with full details
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const account = await AccountRepository.getAccountById(id);

    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    // Get signal summary
    const signalSummary = await SignalRepository.getSignalSummary(id);

    res.json({
      success: true,
      data: {
        ...account,
        signalSummary,
      },
    });
  } catch (error) {
    console.error("Error getting account:", error);
    res.status(500).json({ error: "Failed to get account" });
  }
});

/**
 * GET /api/accounts/domain/:domain
 * Get account by domain
 */
router.get("/domain/:domain", async (req: Request, res: Response) => {
  try {
    const { domain } = req.params;

    const account = await AccountRepository.getAccountByDomain(domain);

    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    const signalSummary = await SignalRepository.getSignalSummary(account.id);

    res.json({
      success: true,
      data: {
        ...account,
        signalSummary,
      },
    });
  } catch (error) {
    console.error("Error getting account:", error);
    res.status(500).json({ error: "Failed to get account" });
  }
});

/**
 * POST /api/accounts
 * Create or update account (upsert by domain)
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      name,
      domain,
      website,
      industry,
      companySize,
      revenue,
      location,
      techStack,
    } = req.body;

    if (!name || !domain) {
      return res.status(400).json({ error: "name and domain are required" });
    }

    const account = await AccountRepository.upsertAccount({
      name,
      domain,
      website,
      industry,
      companySize,
      revenue,
      location,
      techStack,
    });

    res.status(201).json({
      success: true,
      data: account,
    });
  } catch (error) {
    console.error("Error creating account:", error);
    res.status(500).json({ error: "Failed to create account" });
  }
});

/**
 * GET /api/accounts
 * Search accounts with filters
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const {
      industry,
      location,
      minSize,
      maxSize,
      hasShopify,
      hasKlaviyo,
      limit = "100",
    } = req.query;

    const accounts = await AccountRepository.searchAccounts({
      industry: industry as string | undefined,
      location: location as string | undefined,
      minSize: minSize ? parseInt(minSize as string) : undefined,
      maxSize: maxSize ? parseInt(maxSize as string) : undefined,
      hasShopify: hasShopify === "true",
      hasKlaviyo: hasKlaviyo === "true",
      limit: parseInt(limit as string),
    });

    res.json({
      success: true,
      count: accounts.length,
      data: accounts,
    });
  } catch (error) {
    console.error("Error searching accounts:", error);
    res.status(500).json({ error: "Failed to search accounts" });
  }
});

/**
 * GET /api/accounts/:id/signals
 * Get all signals for an account
 */
router.get("/:id/signals", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = "100" } = req.query;

    const signals = await SignalRepository.getSignalsByAccount(
      id,
      parseInt(limit as string)
    );

    res.json({
      success: true,
      count: signals.length,
      data: signals,
    });
  } catch (error) {
    console.error("Error getting signals:", error);
    res.status(500).json({ error: "Failed to get signals" });
  }
});

/**
 * GET /api/accounts/:id/hiring-signals
 * Get all hiring signals for an account
 */
router.get("/:id/hiring-signals", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = "50" } = req.query;

    const hiringSignals = await SignalRepository.getHiringSignalsByAccount(
      id,
      parseInt(limit as string)
    );

    res.json({
      success: true,
      count: hiringSignals.length,
      data: hiringSignals,
    });
  } catch (error) {
    console.error("Error getting hiring signals:", error);
    res.status(500).json({ error: "Failed to get hiring signals" });
  }
});

/**
 * GET /api/accounts/shopify-klaviyo
 * Get accounts with Shopify + Klaviyo (high-intent targets)
 */
router.get("/shopify-klaviyo", async (req: Request, res: Response) => {
  try {
    const { limit = "100" } = req.query;

    const accounts = await AccountRepository.getAccountsWithShopifyAndKlaviyo(
      parseInt(limit as string)
    );

    res.json({
      success: true,
      count: accounts.length,
      data: accounts,
    });
  } catch (error) {
    console.error("Error getting accounts:", error);
    res.status(500).json({ error: "Failed to get accounts" });
  }
});

/**
 * GET /api/accounts/stale
 * Get stale accounts (not scraped recently)
 */
router.get("/stale", async (req: Request, res: Response) => {
  try {
    const { daysWithoutScrape = "30", limit = "100" } = req.query;

    const accounts = await AccountRepository.getStaleAccounts(
      parseInt(daysWithoutScrape as string),
      parseInt(limit as string)
    );

    res.json({
      success: true,
      count: accounts.length,
      data: accounts,
    });
  } catch (error) {
    console.error("Error getting stale accounts:", error);
    res.status(500).json({ error: "Failed to get stale accounts" });
  }
});

export default router;
