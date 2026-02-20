import { Router, Request, Response } from "express";
import { LeadRepository } from "../services/leadRepository";
import { AccountRepository } from "../services/accountRepository";
import { ClientRepository } from "../services/clientRepository";
import { SignalRepository } from "../services/signalRepository";

const router = Router();

/**
 * GET /api/leads/:clientId
 * Get all leads for a client, optionally filtered by tier
 */
router.get("/:clientId", async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { tier, limit = "50" } = req.query;

    const leads = await LeadRepository.getLeadsByClient(
      clientId,
      tier as "A" | "B" | "C" | undefined,
      parseInt(limit as string)
    );

    res.json({
      success: true,
      count: leads.length,
      data: leads,
    });
  } catch (error) {
    console.error("Error getting leads:", error);
    res.status(500).json({ error: "Failed to get leads" });
  }
});

/**
 * GET /api/leads/:clientId/:leadId
 * Get single lead with full details
 */
router.get("/:clientId/:leadId", async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;

    const lead = await LeadRepository.getLeadWithDetails(leadId);

    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    res.json({
      success: true,
      data: lead,
    });
  } catch (error) {
    console.error("Error getting lead:", error);
    res.status(500).json({ error: "Failed to get lead" });
  }
});

/**
 * POST /api/leads/:clientId
 * Create a new lead (from account + signals)
 */
router.post("/:clientId", async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { accountId } = req.body;

    if (!accountId) {
      return res.status(400).json({ error: "accountId is required" });
    }

    // Get account and signals
    const account = await AccountRepository.getAccountById(accountId);
    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    const signals = await SignalRepository.getSignalsByAccount(accountId, 100);

    // Create lead with scoring
    const lead = await LeadRepository.createLead(
      clientId,
      accountId,
      signals.map(s => ({
        type: s.type as any,
        subType: s.subType,
        confidence: s.confidence,
        weight: s.weight,
        data: s.rawData as any,
        detectedAt: s.detectedAt,
      }))
    );

    res.status(201).json({
      success: true,
      data: lead,
    });
  } catch (error) {
    console.error("Error creating lead:", error);
    res.status(500).json({ error: "Failed to create lead" });
  }
});

/**
 * PATCH /api/leads/:leadId/status
 * Update lead status (contacted, replied, qualified, lost)
 */
router.patch("/:leadId/status", async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;
    const { status } = req.body;

    if (!["new", "contacted", "replied", "qualified", "lost"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const lead = await LeadRepository.updateLeadStatus(
      leadId,
      status as "new" | "contacted" | "replied" | "qualified" | "lost"
    );

    res.json({
      success: true,
      data: lead,
    });
  } catch (error) {
    console.error("Error updating lead status:", error);
    res.status(500).json({ error: "Failed to update lead status" });
  }
});

/**
 * GET /api/leads/:clientId/distribution
 * Get tier distribution for client
 */
router.get("/:clientId/distribution", async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    const distribution = await LeadRepository.getLeadTierDistribution(clientId);

    res.json({
      success: true,
      data: distribution,
    });
  } catch (error) {
    console.error("Error getting distribution:", error);
    res.status(500).json({ error: "Failed to get distribution" });
  }
});

export default router;
