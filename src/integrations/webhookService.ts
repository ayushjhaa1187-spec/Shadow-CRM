import { webhookQueue } from "../queue/config";

export interface HubSpotConfig {
  apiKey: string;
  portalId?: string;
}

export interface PipedriveConfig {
  apiKey: string;
  companyDomain: string;
}

export interface WebhookPayload {
  lead: {
    accountId: string;
    accountName: string;
    domain: string;
    score: number;
    tier: string;
    signals: any[];
    explanation: any;
  };
  importedAt: string;
  sourceSystem: string;
}

/**
 * HubSpot Integration Service
 */
export class HubSpotService {
  static async sendLead(config: HubSpotConfig, payload: WebhookPayload): Promise<any> {
    const { apiKey, portalId } = config;
    const { lead } = payload;

    // Create contact in HubSpot
    const contactPayload = {
      properties: [
        {
          property: "firstname",
          value: lead.accountName.split(" ")[0],
        },
        {
          property: "lastname",
          value: lead.accountName.split(" ").slice(1).join(" ") || "Research",
        },
        {
          property: "company",
          value: lead.accountName,
        },
        {
          property: "website",
          value: `https://${lead.domain}`,
        },
        {
          property: "shadowcrm_lead_score",
          value: lead.score.toString(),
        },
        {
          property: "shadowcrm_lead_tier",
          value: lead.tier,
        },
        {
          property: "shadowcrm_signals",
          value: JSON.stringify(lead.signals),
        },
      ],
    };

    try {
      const response = await fetch(
        `https://api.hubapi.com/crm/v3/objects/contacts`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(contactPayload),
        }
      );

      if (!response.ok) {
        throw new Error(`HubSpot API error: ${response.status}`);
      }

      const data = await response.json();

      // Optionally add to deal
      if (data.id) {
        await this.createDeal(apiKey, data.id, lead);
      }

      return data;
    } catch (error) {
      console.error("HubSpot lead export failed:", error);
      throw error;
    }
  }

  /**
   * Create a deal in HubSpot for the contact
   */
  private static async createDeal(
    apiKey: string,
    contactId: string,
    lead: any
  ): Promise<any> {
    const dealPayload = {
      properties: [
        {
          name: "dealname",
          value: `${lead.accountName} - Outreach`,
        },
        {
          name: "dealstage",
          value: "qualifiedtobuy",
        },
        {
          name: "amount",
          value: "5000",
        },
        {
          name: "shadowcrm_lead_tier",
          value: lead.tier,
        },
      ],
    };

    try {
      const response = await fetch(
        `https://api.hubapi.com/crm/v3/objects/deals`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(dealPayload),
        }
      );

      if (!response.ok) {
        throw new Error(`HubSpot deal creation error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("HubSpot deal creation failed:", error);
      // Don't throw - deal creation is optional
      return null;
    }
  }

  /**
   * Batch send leads to HubSpot
   */
  static async sendLeads(
    config: HubSpotConfig,
    payloads: WebhookPayload[]
  ): Promise<{ successful: number; failed: number; errors: any[] }> {
    let successful = 0;
    let failed = 0;
    const errors = [];

    for (const payload of payloads) {
      try {
        await this.sendLead(config, payload);
        successful++;
      } catch (error) {
        failed++;
        errors.push({ lead: payload.lead.accountName, error });
      }
    }

    return { successful, failed, errors };
  }
}

/**
 * Pipedrive Integration Service
 */
export class PipedriveService {
  static async sendLead(config: PipedriveConfig, payload: WebhookPayload): Promise<any> {
    const { apiKey, companyDomain } = config;
    const { lead } = payload;

    // Create organization in Pipedrive
    const orgPayload = {
      name: lead.accountName,
      custom_fields: {
        shadowcrm_lead_score: lead.score,
        shadowcrm_lead_tier: lead.tier,
      },
    };

    try {
      const response = await fetch(
        `https://${companyDomain}.pipedrive.com/v1/organizations?api_token=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(orgPayload),
        }
      );

      if (!response.ok) {
        throw new Error(`Pipedrive API error: ${response.status}`);
      }

      const data = await response.json();

      // Create a person/deal for the lead
      if (data.success && data.data.id) {
        await this.createDeal(apiKey, companyDomain, data.data.id, lead);
      }

      return data;
    } catch (error) {
      console.error("Pipedrive lead export failed:", error);
      throw error;
    }
  }

  /**
   * Create a deal in Pipedrive for the organization
   */
  private static async createDeal(
    apiKey: string,
    companyDomain: string,
    orgId: string,
    lead: any
  ): Promise<any> {
    const dealPayload = {
      title: `${lead.accountName} - Outreach`,
      org_id: orgId,
      value: 5000,
      currency: "USD",
      custom_fields: {
        shadowcrm_lead_tier: lead.tier,
      },
    };

    try {
      const response = await fetch(
        `https://${companyDomain}.pipedrive.com/v1/deals?api_token=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(dealPayload),
        }
      );

      if (!response.ok) {
        throw new Error(`Pipedrive deal creation error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Pipedrive deal creation failed:", error);
      return null;
    }
  }

  /**
   * Batch send leads to Pipedrive
   */
  static async sendLeads(
    config: PipedriveConfig,
    payloads: WebhookPayload[]
  ): Promise<{ successful: number; failed: number; errors: any[] }> {
    let successful = 0;
    let failed = 0;
    const errors = [];

    for (const payload of payloads) {
      try {
        await this.sendLead(config, payload);
        successful++;
      } catch (error) {
        failed++;
        errors.push({ lead: payload.lead.accountName, error });
      }
    }

    return { successful, failed, errors };
  }
}

/**
 * Generic Webhook Service
 */
export class WebhookService {
  /**
   * Queue a webhook delivery
   */
  static async queueWebhook(
    webhookUrl: string,
    payload: any,
    retries: number = 3
  ): Promise<string> {
    const job = await webhookQueue.add(
      "deliver",
      {
        webhookUrl,
        payload,
        retries,
      },
      {
        attempts: retries,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: false,
      }
    );

    return job.id;
  }

  /**
   * Send webhook immediately (synchronous)
   */
  static async sendWebhook(webhookUrl: string, payload: any): Promise<any> {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Shadow-CRM/1.0",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook delivery failed: ${response.status}`);
    }

    return response.json();
  }
}
