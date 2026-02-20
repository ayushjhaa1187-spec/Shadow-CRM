// @ts-nocheck
import { Router, Request, Response } from "express";
import {
  HubSpotService,
  PipedriveService,
  WebhookService,
  WebhookPayload,
} from "../integrations/webhookService";
import { LeadRepository } from "../services/leadRepository";
import { AccountRepository } from "../services/accountRepository";

const router = Router();

/**
 * POST /api/webhooks/hubspot/send
 * Send a lead to HubSpot
 */
router.post("/hubspot/send", async (req: Request, res: Response) => {
  try {
    const { apiKey, leadId } = req.body;

    if (!apiKey || !leadId) {
      return res.status(400).json({
        error: "apiKey and leadId are required",
      });
    }

    // Get lead details
    const lead = await LeadRepository.getLeadWithDetails(leadId);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    // Build webhook payload
    const payload: WebhookPayload = {
      lead: {
        accountId: lead.accountId,
        accountName: lead.account.name,
        domain: lead.account.domain,
        score: lead.finalScore,
        tier: lead.tier,
        signals: lead.account.signals || [],
        explanation: lead.signalContext,
      },
      importedAt: new Date().toISOString(),
      sourceSystem: "ShadowCRM",
    };

    // Send to HubSpot
    await HubSpotService.sendLead({ apiKey }, payload);

    res.json({
      success: true,
      message: "Lead sent to HubSpot",
      leadId,
    });
  } catch (error) {
    console.error("Error sending to HubSpot:", error);
    res.status(500).json({ error: "Failed to send lead to HubSpot" });
  }
});

/**
 * POST /api/webhooks/hubspot/batch
 * Send multiple leads to HubSpot
 */
router.post("/hubspot/batch", async (req: Request, res: Response) => {
  try {
    const { apiKey, leadIds } = req.body;

    if (!apiKey || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({
        error: "apiKey and leadIds array are required",
      });
    }

    // Get leads
    const leads = await Promise.all(
      leadIds.map(id => LeadRepository.getLeadWithDetails(id))
    );

    const validLeads = leads.filter((l): l is any => l !== null);

    // Build payloads
    const payloads: WebhookPayload[] = validLeads.map(lead => ({
      lead: {
        accountId: lead.accountId,
        accountName: lead.account.name,
        domain: lead.account.domain,
        score: lead.finalScore,
        tier: lead.tier,
        signals: lead.account.signals || [],
        explanation: lead.signalContext,
      },
      importedAt: new Date().toISOString(),
      sourceSystem: "ShadowCRM",
    }));

    // Send batch
    const result = await HubSpotService.sendLeads({ apiKey }, payloads);

    res.json({
      success: true,
      ...result,
      message: `${result.successful} leads sent to HubSpot, ${result.failed} failed`,
    });
  } catch (error) {
    console.error("Error batch sending to HubSpot:", error);
    res.status(500).json({ error: "Failed to batch send leads to HubSpot" });
  }
});

/**
 * POST /api/webhooks/pipedrive/send
 * Send a lead to Pipedrive
 */
router.post("/pipedrive/send", async (req: Request, res: Response) => {
  try {
    const { apiKey, companyDomain, leadId } = req.body;

    if (!apiKey || !companyDomain || !leadId) {
      return res.status(400).json({
        error: "apiKey, companyDomain, and leadId are required",
      });
    }

    // Get lead details
    const lead = await LeadRepository.getLeadWithDetails(leadId);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    // Build webhook payload
    const payload: WebhookPayload = {
      lead: {
        accountId: lead.accountId,
        accountName: lead.account.name,
        domain: lead.account.domain,
        score: lead.finalScore,
        tier: lead.tier,
        signals: lead.account.signals || [],
        explanation: lead.signalContext,
      },
      importedAt: new Date().toISOString(),
      sourceSystem: "ShadowCRM",
    };

    // Send to Pipedrive
    await PipedriveService.sendLead({ apiKey, companyDomain }, payload);

    res.json({
      success: true,
      message: "Lead sent to Pipedrive",
      leadId,
    });
  } catch (error) {
    console.error("Error sending to Pipedrive:", error);
    res.status(500).json({ error: "Failed to send lead to Pipedrive" });
  }
});

/**
 * POST /api/webhooks/pipedrive/batch
 * Send multiple leads to Pipedrive
 */
router.post("/pipedrive/batch", async (req: Request, res: Response) => {
  try {
    const { apiKey, companyDomain, leadIds } = req.body;

    if (!apiKey || !companyDomain || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({
        error: "apiKey, companyDomain, and leadIds array are required",
      });
    }

    // Get leads
    const leads = await Promise.all(
      leadIds.map(id => LeadRepository.getLeadWithDetails(id))
    );

    const validLeads = leads.filter((l): l is any => l !== null);

    // Build payloads
    const payloads: WebhookPayload[] = validLeads.map(lead => ({
      lead: {
        accountId: lead.accountId,
        accountName: lead.account.name,
        domain: lead.account.domain,
        score: lead.finalScore,
        tier: lead.tier,
        signals: lead.account.signals || [],
        explanation: lead.signalContext,
      },
      importedAt: new Date().toISOString(),
      sourceSystem: "ShadowCRM",
    }));

    // Send batch
    const result = await PipedriveService.sendLeads(
      { apiKey, companyDomain },
      payloads
    );

    res.json({
      success: true,
      ...result,
      message: `${result.successful} leads sent to Pipedrive, ${result.failed} failed`,
    });
  } catch (error) {
    console.error("Error batch sending to Pipedrive:", error);
    res.status(500).json({ error: "Failed to batch send leads to Pipedrive" });
  }
});

/**
 * POST /api/webhooks/custom
 * Send to custom webhook
 */
router.post("/custom", async (req: Request, res: Response) => {
  try {
    const { webhookUrl, leadId, async: isAsync = true } = req.body;

    if (!webhookUrl || !leadId) {
      return res.status(400).json({
        error: "webhookUrl and leadId are required",
      });
    }

    // Get lead details
    const lead = await LeadRepository.getLeadWithDetails(leadId);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    // Build payload
    const payload: WebhookPayload = {
      lead: {
        accountId: lead.accountId,
        accountName: lead.account.name,
        domain: lead.account.domain,
        score: lead.finalScore,
        tier: lead.tier,
        signals: lead.account.signals || [],
        explanation: lead.signalContext,
      },
      importedAt: new Date().toISOString(),
      sourceSystem: "ShadowCRM",
    };

    if (isAsync) {
      // Queue for async delivery
      const jobId = await WebhookService.queueWebhook(webhookUrl, payload);
      res.json({
        success: true,
        message: "Webhook queued for delivery",
        jobId,
      });
    } else {
      // Send immediately
      await WebhookService.sendWebhook(webhookUrl, payload);
      res.json({
        success: true,
        message: "Webhook delivered",
      });
    }
  } catch (error) {
    console.error("Error sending custom webhook:", error);
    res.status(500).json({ error: "Failed to send webhook" });
  }
});

/**
 * POST /api/webhooks/custom/batch
 * Send multiple leads to custom webhook
 */
router.post("/custom/batch", async (req: Request, res: Response) => {
  try {
    const { webhookUrl, leadIds, async: isAsync = true } = req.body;

    if (!webhookUrl || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({
        error: "webhookUrl and leadIds array are required",
      });
    }

    // Get leads
    const leads = await Promise.all(
      leadIds.map(id => LeadRepository.getLeadWithDetails(id))
    );

    const validLeads = leads.filter((l): l is any => l !== null);

    // Build payloads
    const payloads: WebhookPayload[] = validLeads.map(lead => ({
      lead: {
        accountId: lead.accountId,
        accountName: lead.account.name,
        domain: lead.account.domain,
        score: lead.finalScore,
        tier: lead.tier,
        signals: lead.account.signals || [],
        explanation: lead.signalContext,
      },
      importedAt: new Date().toISOString(),
      sourceSystem: "ShadowCRM",
    }));

    if (isAsync) {
      // Queue all webhooks
      const jobIds = await Promise.all(
        payloads.map(payload => WebhookService.queueWebhook(webhookUrl, payload))
      );

      res.json({
        success: true,
        message: "Webhooks queued for delivery",
        count: jobIds.length,
        jobIds,
      });
    } else {
      // Send immediately (warning: slower)
      let successful = 0;
      let failed = 0;

      for (const payload of payloads) {
        try {
          await WebhookService.sendWebhook(webhookUrl, payload);
          successful++;
        } catch (error) {
          failed++;
        }
      }

      res.json({
        success: true,
        message: `${successful} webhooks delivered, ${failed} failed`,
        successful,
        failed,
      });
    }
  } catch (error) {
    console.error("Error batch sending custom webhooks:", error);
    res.status(500).json({ error: "Failed to batch send webhooks" });
  }
});

export default router;
