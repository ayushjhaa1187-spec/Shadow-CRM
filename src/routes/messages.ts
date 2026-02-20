// @ts-nocheck
import { Router, Request, Response } from "express";
import { MessageGenerator } from "../services/messageGenerator";
import { LeadRepository } from "../services/leadRepository";
import { AccountRepository } from "../services/accountRepository";
import { SignalRepository } from "../services/signalRepository";

const router = Router();

/**
 * POST /api/messages/generate
 * Generate message for a lead
 */
router.post("/generate", async (req: Request, res: Response) => {
  try {
    const { leadId, format = "email" } = req.body;

    if (!leadId) {
      return res.status(400).json({ error: "leadId is required" });
    }

    // Get lead with full details
    const lead = await LeadRepository.getLeadWithDetails(leadId);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    // Get signals
    const signals = await SignalRepository.getSignalsByAccount(lead.accountId);

    // Build context
    const context = {
      accountName: lead.account.name,
      domain: lead.account.domain,
      industry: lead.account.industry,
      companySize: lead.account.companySize,
      location: lead.account.location,
      signals,
      leadScore: lead.finalScore,
      tier: lead.tier as "A" | "B" | "C",
    };

    let message: any;

    switch (format) {
      case "linkedin":
        message = MessageGenerator.generateLinkedInMessage(context);
        return res.json({
          success: true,
          format: "linkedin",
          message,
        });

      case "sms":
        message = MessageGenerator.generateSMSMessage(context);
        return res.json({
          success: true,
          format: "sms",
          message,
        });

      case "call_script":
        message = MessageGenerator.generateCallScript(context);
        return res.json({
          success: true,
          format: "call_script",
          message,
        });

      case "email":
      default:
        const emailMessage = MessageGenerator.generateMessage(context);
        return res.json({
          success: true,
          format: "email",
          ...emailMessage,
        });
    }
  } catch (error) {
    console.error("Error generating message:", error);
    res.status(500).json({ error: "Failed to generate message" });
  }
});

/**
 * POST /api/messages/variations
 * Generate multiple message variations for A/B testing
 */
router.post("/variations", async (req: Request, res: Response) => {
  try {
    const { leadId, count = 3 } = req.body;

    if (!leadId) {
      return res.status(400).json({ error: "leadId is required" });
    }

    if (count < 1 || count > 10) {
      return res.status(400).json({ error: "count must be between 1 and 10" });
    }

    // Get lead with details
    const lead = await LeadRepository.getLeadWithDetails(leadId);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    // Get signals
    const signals = await SignalRepository.getSignalsByAccount(lead.accountId);

    // Build context
    const context = {
      accountName: lead.account.name,
      domain: lead.account.domain,
      industry: lead.account.industry,
      companySize: lead.account.companySize,
      location: lead.account.location,
      signals,
      leadScore: lead.finalScore,
      tier: lead.tier as "A" | "B" | "C",
    };

    // Generate variations
    const variations = MessageGenerator.generateVariations(context, count);

    res.json({
      success: true,
      leadId,
      count: variations.length,
      variations,
    });
  } catch (error) {
    console.error("Error generating variations:", error);
    res.status(500).json({ error: "Failed to generate variations" });
  }
});

/**
 * POST /api/messages/tips
 * Get personalization tips based on signals
 */
router.post("/tips", async (req: Request, res: Response) => {
  try {
    const { leadId } = req.body;

    if (!leadId) {
      return res.status(400).json({ error: "leadId is required" });
    }

    // Get lead
    const lead = await LeadRepository.getLeadWithDetails(leadId);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    // Get signals
    const signals = await SignalRepository.getSignalsByAccount(lead.accountId);

    // Generate tips
    const tips = MessageGenerator.generatePersonalizationTips(signals);

    res.json({
      success: true,
      leadId,
      accountName: lead.account.name,
      tips,
      context: {
        tier: lead.tier,
        score: lead.finalScore,
        signalCount: signals.length,
      },
    });
  } catch (error) {
    console.error("Error generating tips:", error);
    res.status(500).json({ error: "Failed to generate tips" });
  }
});

/**
 * POST /api/messages/batch
 * Generate messages for multiple leads
 */
router.post("/batch", async (req: Request, res: Response) => {
  try {
    const { leadIds, format = "email" } = req.body;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: "leadIds array is required" });
    }

    const messages = [];

    for (const leadId of leadIds) {
      try {
        const lead = await LeadRepository.getLeadWithDetails(leadId);
        if (!lead) continue;

        const signals = await SignalRepository.getSignalsByAccount(lead.accountId);

        const context = {
          accountName: lead.account.name,
          domain: lead.account.domain,
          industry: lead.account.industry,
          companySize: lead.account.companySize,
          location: lead.account.location,
          signals,
          leadScore: lead.finalScore,
          tier: lead.tier as "A" | "B" | "C",
        };

        let message;

        if (format === "linkedin") {
          message = MessageGenerator.generateLinkedInMessage(context);
        } else if (format === "sms") {
          message = MessageGenerator.generateSMSMessage(context);
        } else if (format === "call_script") {
          message = MessageGenerator.generateCallScript(context);
        } else {
          message = MessageGenerator.generateMessage(context);
        }

        messages.push({
          leadId,
          accountName: lead.account.name,
          message: typeof message === "string" ? message : message,
        });
      } catch (error) {
        console.error(`Failed to generate message for lead ${leadId}:`, error);
      }
    }

    res.json({
      success: true,
      format,
      count: messages.length,
      messages,
    });
  } catch (error) {
    console.error("Error batch generating messages:", error);
    res.status(500).json({ error: "Failed to batch generate messages" });
  }
});

export default router;
