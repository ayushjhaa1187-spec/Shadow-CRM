import { prisma } from "../lib/prisma";
import { Lead, Account, Signal } from "@prisma/client";
import { LeadScoringEngine } from "./scoringEngine";
import { ScoreExplanation, DetectedSignal } from "../types";

export class LeadRepository {
  /**
   * Create a new lead and calculate its score
   */
  static async createLead(
    clientId: string,
    accountId: string,
    signals: DetectedSignal[]
  ): Promise<Lead> {
    // Get account details
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: {
        techStack: true,
        hiringSignals: true,
      },
    });

    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }

    // Get client's ICP profile
    const icpProfile = await prisma.icpProfile.findUnique({
      where: { clientId },
    });

    if (!icpProfile) {
      throw new Error(`ICP Profile for client ${clientId} not found`);
    }

    // Calculate component scores
    const icpFitScore = this.calculateIcpFitScore(account, icpProfile);
    const intentScore = this.calculateIntentScore(account, signals);
    const timingScore = this.calculateTimingScore(account, signals);
    const momentumScore = this.calculateMomentumScore(account, signals);

    // Calculate final score
    const scoring = LeadScoringEngine.calculateLeadScore(
      icpFitScore,
      intentScore,
      timingScore,
      momentumScore,
      this.generateExplanation(icpFitScore, intentScore, timingScore, momentumScore, signals)
    );

    // Create lead
    const lead = await prisma.lead.create({
      data: {
        clientId,
        accountId,
        icpFitScore,
        intentScore,
        timingScore,
        momentumScore,
        finalScore: scoring.final,
        tier: scoring.tier,
        scoreBreakdown: scoring.components,
        signalContext: {
          signals: signals.map(s => ({
            type: s.type,
            subType: s.subType,
            confidence: s.confidence,
            detectedAt: s.detectedAt,
          })),
        },
      },
    });

    return lead;
  }

  /**
   * Calculate ICP Fit Score for an account against client's ICP
   */
  private static calculateIcpFitScore(
    account: Account & { techStack: any; hiringSignals: any[] },
    icpProfile: any
  ): number {
    const industryScore = LeadScoringEngine.scoreIndustryMatch(
      icpProfile.industryMatch,
      account.industry || ""
    );

    const sizeScore = LeadScoringEngine.scoreCompanySize(
      icpProfile.minEmployees || 10,
      icpProfile.maxEmployees || 200,
      account.companySize || undefined
    );

    const geoScore = LeadScoringEngine.scoreGeography(
      icpProfile.geoMatch,
      account.location
    );

    const revenueScore = LeadScoringEngine.scoreRevenue(account.revenue, false);

    const detectedTechs = new Set<string>();
    if (account.techStack) {
      if (account.techStack.isShopify) detectedTechs.add("shopify");
      if (account.techStack.isDroplify) detectedTechs.add("dropify");
      if (account.techStack.klaviyoDetected) detectedTechs.add("klaviyo");
      if (account.techStack.metaPixelDetected) detectedTechs.add("meta_pixel");
      account.techStack.customTechs?.forEach((tech: string) => detectedTechs.add(tech.toLowerCase()));
    }

    const techScore = LeadScoringEngine.scoreTechStack(
      icpProfile.requiredTechs,
      icpProfile.preferredTechs,
      detectedTechs
    );

    return LeadScoringEngine.calculateIcpFit(
      industryScore,
      sizeScore,
      geoScore,
      revenueScore,
      techScore
    );
  }

  /**
   * Calculate Intent Score based on signals
   */
  private static calculateIntentScore(account: any, signals: DetectedSignal[]): number {
    let hiringScore = 0;
    let websiteChangeScore = 0;
    let adActivityScore = 0;
    let techStackChangeScore = 0;

    for (const signal of signals) {
      const daysSince = this.daysSinceDetection(signal.detectedAt);

      switch (signal.type) {
        case "hiring": {
          const jobTitle = signal.data.jobTitle || "";
          hiringScore = LeadScoringEngine.scoreHiringSignal(jobTitle, daysSince);
          break;
        }
        case "website_change": {
          const changeType = signal.subType || "";
          websiteChangeScore = LeadScoringEngine.scoreWebsiteChange(changeType, daysSince);
          break;
        }
        case "ad_activity": {
          const trend = signal.data.volumeTrend || "stable";
          adActivityScore = LeadScoringEngine.scoreAdActivity(true, trend);
          break;
        }
        case "tech_stack_change": {
          techStackChangeScore = LeadScoringEngine.scoreTechStackChange(daysSince);
          break;
        }
      }
    }

    return LeadScoringEngine.calculateIntentScore(
      hiringScore,
      websiteChangeScore,
      adActivityScore,
      techStackChangeScore
    );
  }

  /**
   * Calculate Timing Score
   */
  private static calculateTimingScore(account: any, signals: DetectedSignal[]): number {
    let hiringWhileGrowing = 0;
    let fundingEvent = 0;
    let leadershipChange = 0;
    let productLaunch = 0;

    const hasHiringSignal = signals.some(s => s.type === "hiring");
    const hasAdActivity = signals.some(s => s.type === "ad_activity");

    hiringWhileGrowing = LeadScoringEngine.scoreHiringWhileGrowing(hasHiringSignal, hasAdActivity);

    for (const signal of signals) {
      if (signal.type === "funding") {
        fundingEvent = LeadScoringEngine.scoreFundingEvent(
          this.daysSinceDetection(signal.detectedAt)
        );
      }
      if (signal.type === "leadership_change") {
        leadershipChange = LeadScoringEngine.scoreLeadershipChange(
          this.daysSinceDetection(signal.detectedAt)
        );
      }
    }

    return LeadScoringEngine.calculateTimingScore(
      hiringWhileGrowing,
      fundingEvent,
      leadershipChange,
      productLaunch
    );
  }

  /**
   * Calculate Momentum Score
   */
  private static calculateMomentumScore(account: any, signals: DetectedSignal[]): number {
    // This would need more data sources (job board API, traffic data, etc.)
    // For now, return a placeholder
    const hiringVelocity = signals.filter(s => s.type === "hiring").length * 10;
    const contentVelocity = signals.filter(s => s.subType === "new_blog_post").length * 5;
    const adVelocity = signals.filter(s => s.type === "ad_activity").length * 10;
    const trafficGrowth = 0;

    return LeadScoringEngine.calculateMomentumScore(
      Math.min(30, hiringVelocity),
      Math.min(20, contentVelocity),
      Math.min(30, adVelocity),
      trafficGrowth
    );
  }

  /**
   * Get leads for a client, optionally filtered by tier
   */
  static async getLeadsByClient(
    clientId: string,
    tier?: "A" | "B" | "C",
    limit: number = 50
  ): Promise<Lead[]> {
    return prisma.lead.findMany({
      where: {
        clientId,
        ...(tier && { tier }),
      },
      orderBy: {
        finalScore: "desc",
      },
      take: limit,
      include: {
        account: true,
      },
    });
  }

  /**
   * Get a single lead with full details
   */
  static async getLeadWithDetails(leadId: string): Promise<Lead | null> {
    return prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        account: {
          include: {
            techStack: true,
            hiringSignals: true,
            signals: true,
          },
        },
      },
    });
  }

  /**
   * Update lead status (contacted, replied, qualified, lost)
   */
  static async updateLeadStatus(
    leadId: string,
    status: "new" | "contacted" | "replied" | "qualified" | "lost"
  ): Promise<Lead> {
    return prisma.lead.update({
      where: { id: leadId },
      data: { status, updatedAt: new Date() },
    });
  }

  /**
   * Bulk get leads by tier
   */
  static async getLeadTierDistribution(clientId: string): Promise<Record<string, number>> {
    const distribution = await prisma.lead.groupBy({
      by: ["tier"],
      where: { clientId },
      _count: true,
    });

    return {
      A: distribution.find(d => d.tier === "A")?._count || 0,
      B: distribution.find(d => d.tier === "B")?._count || 0,
      C: distribution.find(d => d.tier === "C")?._count || 0,
    };
  }

  /**
   * Helper: days since detection
   */
  private static daysSinceDetection(date: Date): number {
    return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Helper: generate explanation
   */
  private static generateExplanation(
    icpFit: number,
    intent: number,
    timing: number,
    momentum: number,
    signals: DetectedSignal[]
  ): ScoreExplanation {
    return {
      icpBreakdown: [
        `ICP Fit Score: ${Math.round(icpFit)}%`,
        "Strong structural alignment with target profile",
      ],
      intentSignals: [
        `Intent Score: ${Math.round(intent)}%`,
        `Detected ${signals.length} active signals`,
      ],
      timingFactors: [
        `Timing Score: ${Math.round(timing)}%`,
        "Moment of friction detected - buying likelihood high",
      ],
      momentumIndicators: [
        `Momentum Score: ${Math.round(momentum)}%`,
        "Account showing growth velocity",
      ],
    };
  }
}
