import { DetectedSignal } from "../types";

export interface MessageContext {
  accountName: string;
  domain: string;
  industry?: string;
  companySize?: number;
  location?: string;
  signals: DetectedSignal[];
  leadScore: number;
  tier: "A" | "B" | "C";
}

export interface GeneratedMessage {
  subject: string;
  emailBody: string;
  reasoning: string[];
  signals: string[];
}

export class MessageGenerator {
  /**
   * Generate contextual outreach message from signals
   */
  static generateMessage(context: MessageContext): GeneratedMessage {
    const signals = context.signals || [];
    const hiringSignals = signals.filter(s => s.type === "hiring");
    const techSignals = signals.filter(s => s.type === "tech_stack" || s.type === "tech_stack_change");
    const adSignals = signals.filter(s => s.type === "ad_activity");
    const websiteSignals = signals.filter(s => s.type === "website_change");
    const momKentumSignals = signals.filter(s => s.type === "momentum");

    const reasoning: string[] = [];
    const extractedSignals: string[] = [];

    // Build subject line
    let subject = this.generateSubject(context, hiringSignals, techSignals);

    // Build email body
    let body = this.generateEmailBody(context, {
      hiringSignals,
      techSignals,
      adSignals,
      websiteSignals,
      momentumSignals: momKentumSignals,
      reasoning,
      extractedSignals,
    });

    return {
      subject,
      emailBody: body,
      reasoning,
      signals: extractedSignals,
    };
  }

  /**
   * Generate subject line
   */
  private static generateSubject(
    context: MessageContext,
    hiringSignals: DetectedSignal[],
    techSignals: DetectedSignal[]
  ): string {
    const topics: string[] = [];

    // Hiring signal => growth opportunity
    if (hiringSignals.length > 0) {
      const hasPerformanceMarketer = hiringSignals.some(s =>
        s.data?.positions?.some((p: any) =>
          p.title?.toLowerCase().includes("performance") ||
          p.title?.toLowerCase().includes("paid")
        )
      );

      if (hasPerformanceMarketer) {
        topics.push("scaling paid acquisition");
        topics.push("growing your marketing team");
      } else {
        topics.push("your team expansion");
      }
    }

    // Tech stack changes => recent buying signal
    if (techSignals.length > 0 && techSignals.some(s => s.subType === "recent_scrape")) {
      topics.push("your growth");
      topics.push("new launches");
    }

    // Tier-based urgency
    if (context.tier === "A") {
      const chosen = topics[Math.floor(Math.random() * topics.length)];
      return `Quick question on ${chosen}`;
    }

    if (context.tier === "B") {
      return `Vendor idea for ${context.accountName}`;
    }

    return `Thought you'd find this useful`;
  }

  /**
   * Generate email body
   */
  private static generateEmailBody(
    context: MessageContext,
    signals: {
      hiringSignals: DetectedSignal[];
      techSignals: DetectedSignal[];
      adSignals: DetectedSignal[];
      websiteSignals: DetectedSignal[];
      momentumSignals: DetectedSignal[];
      reasoning: string[];
      extractedSignals: string[];
    }
  ): string {
    const { accountName, domain } = context;
    const { hiringSignals, techSignals, adSignals, reasoning, extractedSignals } = signals;

    let body = `Hi team at ${accountName},\n\n`;

    // Opening hook based on signals
    if (hiringSignals.length > 0) {
      const jobTitles = hiringSignals
        .flatMap(s => (s.data?.positions || []) as any[])
        .map(p => p.title)
        .slice(0, 2)
        .join(" and ");

      body += `Noticed you're hiring for ${jobTitles} - great sign you're scaling.\n\n`;
      reasoning.push(`Detected active hiring for growth roles (${jobTitles})`);
      extractedSignals.push("Active hiring signal");
    }

    if (techSignals.some(s => s.subType === "high_intent_ecom")) {
      body += `Saw you're running Shopify + Klaviyo stack - that's a strong combo for ecommerce growth.\n\n`;
      reasoning.push("Detected high-intent ecommerce tech stack");
      extractedSignals.push("Shopify + Klaviyo detected");
    }

    if (adSignals.length > 0) {
      body += `We noticed your paid acquisition activity has been ramping up.\n\n`;
      reasoning.push("Detected increased ad spending");
      extractedSignals.push("Ad activity signal");
    }

    // Value prop
    body += `We work with teams like yours to optimize paid acquisition during scaling phases. Common wins:\n`;
    body += `- Reduced CPA while scaling volume\n`;
    body += `- Better channel mix allocation\n`;
    body += `- Faster hiring-to-productivity cycles\n\n`;

    // CTA
    body += `Would make sense to chat if you're focused on any of those. Open next week?\n\n`;

    body += `Best,\n`;
    body += `[Your Name]`;

    return body;
  }

  /**
   * Generate multiple message variations (A/B testing)
   */
  static generateVariations(context: MessageContext, count: number = 3): GeneratedMessage[] {
    const variations: GeneratedMessage[] = [];

    for (let i = 0; i < count; i++) {
      // Slight randomization of approach
      const variation = this.generateMessage(context);

      // Vary subject lines
      if (i === 1) {
        variation.subject = `One idea for ${context.accountName}`;
      } else if (i === 2) {
        variation.subject = `Quick outreach - ${context.accountName}`;
      }

      variations.push(variation);
    }

    return variations;
  }

  /**
   * Generate LinkedIn message (shorter)
   */
  static generateLinkedInMessage(context: MessageContext): string {
    const signals = context.signals || [];
    const hiringSignals = signals.filter(s => s.type === "hiring");

    let message = `Hi ${this.getFirstName(context.accountName)},\n\n`;

    if (hiringSignals.length > 0) {
      message += `Saw you're scaling the team - awesome. Would be a good time to chat about optimizing paid acquisition.\n`;
    } else {
      message += `You're doing great things at ${context.accountName}. Would love to explore how we can help accelerate your growth.\n`;
    }

    message += `\nOpen to a quick call next week?`;

    return message;
  }

  /**
   * Generate SMS message (very short)
   */
  static generateSMSMessage(context: MessageContext): string {
    return `Hi ${this.getFirstName(context.accountName)} - saw you're scaling. Quick idea on paid acq optimization. Free time next week? ${context.domain}`;
  }

  /**
   * Extract first name
   */
  private static getFirstName(fullName: string): string {
    return fullName.split(" ")[0];
  }

  /**
   * Generate cold call script outline
   */
  static generateCallScript(context: MessageContext): string {
    const signals = context.signals || [];
    const hiringSignals = signals.filter(s => s.type === "hiring");
    const techSignals = signals.filter(s => s.type === "tech_stack");

    let script = `OPENING:\n`;
    script += `"Hi, this is [Name] with [Company]. I know this is random - I came across ${context.accountName} because you're `;

    if (hiringSignals.length > 0) {
      script += `actively hiring and we work with growth-stage teams."\n\n`;
    } else {
      script += `clearly focused on scaling."\n\n`;
    }

    script += `REASON FOR CALL:\n`;
    script += `"The reason for the call: we help companies like you optimize paid acquisition without adding headcount."\n\n`;

    script += `HOOK (if interested):\n`;
    script += `"This typically means lower CACs while scaling faster. Do you have 15 minutes next week to explore?"\n`;

    return script;
  }

  /**
   * Generate personalization tips (for manual use)
   */
  static generatePersonalizationTips(
    signals: DetectedSignal[]
  ): { tip: string; confidence: number }[] {
    const tips: { tip: string; confidence: number }[] = [];

    const hiringSignals = signals.filter(s => s.type === "hiring");
    if (hiringSignals.length > 0) {
      tips.push({
        tip: "Reference their recent hiring in opening",
        confidence: 0.95,
      });
    }

    const techSignals = signals.filter(s => s.type === "tech_stack_change");
    if (techSignals.length > 0) {
      tips.push({
        tip: "Mention new tools they've added recently",
        confidence: 0.85,
      });
    }

    const adSignals = signals.filter(s => s.type === "ad_activity");
    if (adSignals.length > 0) {
      tips.push({
        tip: "Lead with paid acquisition optimization",
        confidence: 0.9,
      });
    }

    const momentumSignals = signals.filter(s => s.type === "momentum");
    if (momentumSignals.length > 0) {
      tips.push({
        tip: "Emphasize their growth momentum",
        confidence: 0.8,
      });
    }

    return tips;
  }
}
