import { ScoreComponents, LeadScore, ScoreExplanation, DetectedSignal } from "../types";

export class LeadScoringEngine {
  // Weights for final score calculation
  private static readonly WEIGHTS = {
    icpFit: 0.35,
    intent: 0.30,
    timing: 0.20,
    momentum: 0.15,
  };

  // Signal decay rate (lambda) - signals decay over 30 days
  private static readonly DECAY_LAMBDA = 0.03;

  /**
   * Calculate final lead score and tier
   * Lead Score = (ICP Fit × 0.35) + (Intent × 0.30) + (Timing × 0.20) + (Momentum × 0.15)
   */
  static calculateLeadScore(
    icpFit: number,
    intent: number,
    timing: number,
    momentum: number,
    explanation: ScoreExplanation
  ): LeadScore {
    const final =
      icpFit * this.WEIGHTS.icpFit +
      intent * this.WEIGHTS.intent +
      timing * this.WEIGHTS.timing +
      momentum * this.WEIGHTS.momentum;

    const tier = this.determineTier(final);

    return {
      final: Math.min(100, Math.round(final * 100) / 100),
      components: { icpFit, intent, timing, momentum },
      tier,
      explanation,
    };
  }

  /**
   * Determine tier based on final score
   * A: 80-100 | B: 65-79 | C: 50-64 | Ignore: <50
   */
  private static determineTier(score: number): "A" | "B" | "C" {
    if (score >= 80) return "A";
    if (score >= 65) return "B";
    return "C";
  }

  /**
   * Calculate ICP Fit Score (0-100)
   * Components: Industry (25), Company Size (20), Geography (10), Revenue (15), Tech Stack (30)
   */
  static calculateIcpFit(
    industryMatch: number,      // 0-25
    companySizeMatch: number,   // 0-20
    geoMatch: number,           // 0-10
    revenueMatch: number,       // 0-15
    techStackMatch: number      // 0-30
  ): number {
    const total = industryMatch + companySizeMatch + geoMatch + revenueMatch + techStackMatch;
    return Math.min(100, total);
  }

  /**
   * Industry Match Score (0-25)
   */
  static scoreIndustryMatch(targetIndustries: string[], accountIndustry: string): number {
    if (!accountIndustry) return 0;
    const normalizedAccount = accountIndustry.toLowerCase();

    if (targetIndustries.some(ind => normalizedAccount.includes(ind.toLowerCase()))) {
      return 25; // Exact match
    }

    // Adjacent match
    if (
      normalizedAccount.includes("marketing") ||
      normalizedAccount.includes("ecommerce") ||
      normalizedAccount.includes("agency")
    ) {
      return 15;
    }

    return 5; // Broad fit
  }

  /**
   * Company Size Match (0-20)
   */
  static scoreCompanySize(targetMin: number, targetMax: number, accountSize?: number): number {
    if (!accountSize) return 3; // Unknown, minimal points

    if (accountSize >= targetMin && accountSize <= targetMax) {
      return 20; // Perfect fit
    }

    if (accountSize > targetMax) {
      if (accountSize <= targetMax * 1.5) return 12; // Slightly over
      return 0;
    }

    if (accountSize < targetMin) {
      if (accountSize >= targetMin * 0.7) return 8; // Slightly under
      return 0;
    }

    return 5;
  }

  /**
   * Geography Match (0-10)
   */
  static scoreGeography(targetGeos: string[], accountGeo?: string): number {
    if (!accountGeo) return 0;

    if (targetGeos.includes(accountGeo.toUpperCase())) {
      return 10;
    }

    return 0;
  }

  /**
   * Revenue Proxy Match (0-15)
   * Based on signals like "7-figure revenue", funded status
   */
  static scoreRevenue(revenueBracket?: string, fundingSignal?: boolean): number {
    if (fundingSignal) return 15; // Strong signal
    if (revenueBracket && !revenueBracket.includes("unknown")) return 10; // Moderate signal
    return 3; // Weak signal
  }

  /**
   * Tech Stack Match (0-30)
   * Checks for presence of key tech: Shopify, Klaviyo, Meta Pixel, etc
   */
  static scoreTechStack(
    requiredTechs: string[],
    preferredTechs: string[],
    detectedTechs: Set<string>
  ): number {
    let score = 0;

    // All required tech present = 30 points
    const allRequiredPresent = requiredTechs.every(tech =>
      detectedTechs.has(tech.toLowerCase())
    );

    if (allRequiredPresent) {
      score = 30;
    } else if (requiredTechs.some(tech => detectedTechs.has(tech.toLowerCase()))) {
      score = 15; // Partial
    } else {
      // Check preferred techs
      const preferredCount = preferredTechs.filter(tech =>
        detectedTechs.has(tech.toLowerCase())
      ).length;

      if (preferredCount >= preferredTechs.length * 0.5) {
        score = 10;
      } else {
        score = 0;
      }
    }

    return score;
  }

  /**
   * Calculate Intent Signal Score (0-100)
   * Components: Hiring (40), Website Changes (20), Ad Activity (20), Tech Stack Change (20)
   * All signals decay over time
   */
  static calculateIntentScore(
    hiringScore: number,           // 0-40
    websiteChangeScore: number,    // 0-20
    adActivityScore: number,       // 0-20
    techStackChangeScore: number   // 0-20
  ): number {
    const total = hiringScore + websiteChangeScore + adActivityScore + techStackChangeScore;
    return Math.min(100, total);
  }

  /**
   * Hiring Signal Score (0-40)
   * Decays over time. Fresh job post = 40. 90 days old = ~5.
   */
  static scoreHiringSignal(
    jobTitle: string,
    daysSincePosted: number
  ): number {
    let baseScore = 0;

    const titleLower = jobTitle.toLowerCase();

    if (
      titleLower.includes("performance") ||
      titleLower.includes("paid media") ||
      titleLower.includes("ppc")
    ) {
      baseScore = 40; // Performance marketer
    } else if (
      titleLower.includes("growth") ||
      titleLower.includes("demand")
    ) {
      baseScore = 35; // Growth lead
    } else if (titleLower.includes("marketing ops")) {
      baseScore = 25;
    } else if (titleLower.includes("marketing")) {
      baseScore = 15;
    }

    // Apply decay: Decay Factor = e^(-λt)
    const decayedScore = baseScore * this.applyDecay(daysSincePosted);

    return Math.round(decayedScore * 100) / 100;
  }

  /**
   * Website Change Score (0-20)
   * Rebrand, new landing page, new PDP, new blog cadence
   */
  static scoreWebsiteChange(changeType: string, daysSinceChange: number): number {
    let baseScore = 0;

    switch (changeType.toLowerCase()) {
      case "rebrand":
      case "new_landing_page":
      case "new_pdo":
        baseScore = 20;
        break;
      case "new_blog_post":
        baseScore = 10;
        break;
      case "new_collection":
        baseScore = 15;
        break;
      default:
        baseScore = 5;
    }

    return Math.round(baseScore * this.applyDecay(daysSinceChange) * 100) / 100;
  }

  /**
   * Ad Activity Score (0-20)
   * Detects Meta/Google ads. Increasing volume = 20, stable = 10
   */
  static scoreAdActivity(
    adsDetected: boolean,
    volumeTrend?: "increasing" | "stable" | "decreasing"
  ): number {
    if (!adsDetected) return 0;

    if (volumeTrend === "increasing") return 20;
    if (volumeTrend === "stable") return 10;
    return 5; // Decreasing
  }

  /**
   * Tech Stack Change Score (0-20)
   * Recently switched analytics, ESP, checkout, etc.
   */
  static scoreTechStackChange(daysSinceChange: number): number {
    const baseScore = 20;
    return Math.round(baseScore * this.applyDecay(daysSinceChange) * 100) / 100;
  }

  /**
   * Calculate Timing Score (0-100)
   * Detects "moment of friction" when buying is likely
   */
  static calculateTimingScore(
    hiringWhileGrowing: number,    // 0-40
    fundingEvent: number,          // 0-30
    leadershipChange: number,      // 0-20
    productLaunch: number          // 0-10
  ): number {
    const total = hiringWhileGrowing + fundingEvent + leadershipChange + productLaunch;
    return Math.min(100, total);
  }

  /**
   * Hiring While Growing Score (0-40)
   * Hiring marketing roles + increasing ads = buying signal
   */
  static scoreHiringWhileGrowing(isHiring: boolean, isScalingAds: boolean): number {
    if (isHiring && isScalingAds) return 40;
    if (isHiring || isScalingAds) return 20;
    return 0;
  }

  /**
   * Funding Event Score (0-30)
   * Recent Series A, B, etc.
   */
  static scoreFundingEvent(daysSinceFunding?: number): number {
    if (!daysSinceFunding) return 0;

    const baseScore = 30;
    return Math.round(baseScore * this.applyDecay(daysSinceFunding) * 100) / 100;
  }

  /**
   * Leadership Change Score (0-20)
   */
  static scoreLeadershipChange(daysSinceChange?: number): number {
    if (!daysSinceChange) return 0;

    const baseScore = 20;
    return Math.round(baseScore * this.applyDecay(daysSinceChange) * 100) / 100;
  }

  /**
   * Calculate Momentum Score (0-100)
   * Measures growth velocity
   */
  static calculateMomentumScore(
    hiringVelocity: number,        // 0-30
    contentVelocity: number,       // 0-20
    adVelocity: number,            // 0-30
    trafficGrowth: number          // 0-20
  ): number {
    const total = hiringVelocity + contentVelocity + adVelocity + trafficGrowth;
    return Math.min(100, total);
  }

  /**
   * Hiring Velocity (0-30)
   * Increase in job postings
   */
  static scoreHiringVelocity(jobPostingsInLast30Days: number): number {
    if (jobPostingsInLast30Days >= 3) return 30;
    if (jobPostingsInLast30Days >= 2) return 20;
    if (jobPostingsInLast30Days >= 1) return 10;
    return 0;
  }

  /**
   * Content Velocity (0-20)
   */
  static scoreContentVelocity(blogPostsInLast30Days: number): number {
    if (blogPostsInLast30Days >= 4) return 20;
    if (blogPostsInLast30Days >= 2) return 15;
    if (blogPostsInLast30Days >= 1) return 10;
    return 0;
  }

  /**
   * Ad Velocity (0-30)
   */
  static scoreAdVelocity(percentageIncreaseInSpend: number): number {
    if (percentageIncreaseInSpend >= 50) return 30;
    if (percentageIncreaseInSpend >= 25) return 20;
    if (percentageIncreaseInSpend >= 10) return 10;
    return 0;
  }

  /**
   * Traffic Growth (0-20)
   * Month-over-month growth estimate
   */
  static scoreTrafficGrowth(percentageGrowth: number): number {
    if (percentageGrowth >= 30) return 20;
    if (percentageGrowth >= 15) return 15;
    if (percentageGrowth >= 5) return 10;
    return 0;
  }

  /**
   * Apply exponential decay to signal weight
   * Decay Factor = e^(-λt) where λ = 0.03 per day
   * After 30 days: ~41% of original weight
   * After 60 days: ~16% of original weight
   * After 90 days: ~6% of original weight
   */
  private static applyDecay(days: number): number {
    return Math.exp(-this.DECAY_LAMBDA * days);
  }

  /**
   * Generate human-readable explanation of score
   */
  static generateExplanation(
    components: ScoreComponents,
    signals: DetectedSignal[]
  ): ScoreExplanation {
    return {
      icpBreakdown: [
        `ICP Fit: ${Math.round(components.icpFit)}%`,
        "Structural alignment with target profile",
      ],
      intentSignals: [
        `Intent Score: ${Math.round(components.intent)}%`,
        `Found ${signals.filter(s => s.type === "hiring").length} hiring signals`,
        `Found ${signals.filter(s => s.type === "website_change").length} website changes`,
      ],
      timingFactors: [
        `Timing Score: ${Math.round(components.timing)}%`,
        "Moment of friction detected",
      ],
      momentumIndicators: [
        `Momentum Score: ${Math.round(components.momentum)}%`,
        "Growth velocity indicators",
      ],
    };
  }
}
