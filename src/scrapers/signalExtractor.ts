import { DetectedSignal } from "../types";
import { ParsedWebsite } from "./websiteScraper";
import { JobPosting } from "./jobBoardScraper";
import { TechStackData } from "../types";

export class SignalExtractor {
  /**
   * Extract signals from parsed website data
   */
  static extractWebsiteSignals(parsed: ParsedWebsite, domain: string): DetectedSignal[] {
    const signals: DetectedSignal[] = [];

    // Revenue signals
    if (parsed.revenueSignals.length > 0) {
      signals.push({
        type: "revenue_claim",
        subType: "website_claim",
        confidence: 0.7,
        weight: 1.0,
        data: {
          claims: parsed.revenueSignals,
          source: "website_text",
        },
        detectedAt: new Date(),
      });
    }

    // Case study signals (indicates success, likely open to buying services)
    if (parsed.caseStudies.length > 0) {
      signals.push({
        type: "social_proof",
        subType: "case_studies",
        confidence: 0.8,
        weight: 0.8,
        data: {
          caseStudies: parsed.caseStudies,
          count: parsed.caseStudies.length,
        },
        detectedAt: new Date(),
      });
    }

    // Team size signals
    if (parsed.teamSizeClues.length > 0) {
      signals.push({
        type: "company_info",
        subType: "team_size",
        confidence: 0.6,
        weight: 0.5,
        data: {
          clues: parsed.teamSizeClues,
        },
        detectedAt: new Date(),
      });
    }

    // Website freshness signal (recent updates = active growth)
    signals.push({
      type: "website_change",
      subType: "recent_scrape",
      confidence: 0.9,
      weight: 0.3,
      data: {
        title: parsed.title,
        hasDescription: !!parsed.description,
        headingCount: parsed.headings.length,
      },
      detectedAt: new Date(),
    });

    return signals;
  }

  /**
   * Extract signals from job postings
   */
  static extractHiringSignals(jobs: JobPosting[]): DetectedSignal[] {
    const signals: DetectedSignal[] = [];

    if (jobs.length === 0) return signals;

    // Group by job type
    const performanceMarketingJobs = jobs.filter(j =>
      j.jobTitle.toLowerCase().includes("performance") ||
      j.jobTitle.toLowerCase().includes("paid media") ||
      j.jobTitle.toLowerCase().includes("ppc")
    );

    const growthJobs = jobs.filter(j =>
      j.jobTitle.toLowerCase().includes("growth") ||
      j.jobTitle.toLowerCase().includes("demand")
    );

    // Performance marketing hiring = high intent
    if (performanceMarketingJobs.length > 0) {
      signals.push({
        type: "hiring",
        subType: "performance_marketing",
        confidence: 0.95,
        weight: 1.0,
        data: {
          count: performanceMarketingJobs.length,
          positions: performanceMarketingJobs.map(j => ({
            title: j.jobTitle,
            level: j.jobLevel,
            source: j.source,
            postedDate: j.postedDate.toISOString(),
          })),
          mostRecentPostDate: new Date(
            Math.max(...performanceMarketingJobs.map(j => j.postedDate.getTime()))
          ).toISOString(),
        },
        detectedAt: new Date(),
      });
    }

    // Growth hiring
    if (growthJobs.length > 0) {
      signals.push({
        type: "hiring",
        subType: "growth_role",
        confidence: 0.85,
        weight: 0.9,
        data: {
          count: growthJobs.length,
          positions: growthJobs.map(j => ({
            title: j.jobTitle,
            level: j.jobLevel,
          })),
        },
        detectedAt: new Date(),
      });
    }

    // Hiring velocity signal (multiple positions = expansion)
    if (jobs.length >= 2) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentJobs = jobs.filter(j => j.postedDate >= thirtyDaysAgo);

      if (recentJobs.length >= 2) {
        signals.push({
          type: "momentum",
          subType: "hiring_velocity",
          confidence: 0.8,
          weight: 0.7,
          data: {
            jobCount30days: recentJobs.length,
            totalJobCount: jobs.length,
            sources: [...new Set(jobs.map(j => j.source))],
          },
          detectedAt: new Date(),
        });
      }
    }

    return signals;
  }

  /**
   * Extract signals from tech stack detection
   */
  static extractTechStackSignals(
    techStack: TechStackData,
    previousTechStack?: TechStackData
  ): DetectedSignal[] {
    const signals: DetectedSignal[] = [];

    // High-intent tech combo: Shopify + Klaviyo
    if (techStack.isShopify && techStack.klaviyoDetected) {
      signals.push({
        type: "tech_stack",
        subType: "high_intent_ecom",
        confidence: 0.95,
        weight: 1.0,
        data: {
          technologies: ["shopify", "klaviyo"],
          meaning: "Ecommerce brand with email marketing sophistication",
        },
        detectedAt: new Date(),
      });
    }

    // Platform detection
    if (techStack.isShopify) {
      signals.push({
        type: "tech_stack",
        subType: "platform",
        confidence: 0.99,
        weight: 0.9,
        data: { platform: "shopify" },
        detectedAt: new Date(),
      });
    }

    // Ad tech (indicates performance marketing maturity)
    const hasAdTech =
      techStack.metaPixelDetected ||
      (techStack.googleTagManager && techStack.googleAnalytics);

    if (hasAdTech) {
      signals.push({
        type: "tech_stack",
        subType: "paid_advertising",
        confidence: 0.9,
        weight: 0.8,
        data: {
          technologies: [
            techStack.metaPixelDetected && "meta_pixel",
            techStack.googleTagManager && "google_tag_manager",
          ].filter(Boolean),
        },
        detectedAt: new Date(),
      });
    }

    // Tech stack change detection
    if (previousTechStack) {
      const newTechs = this.detectTechChanges(techStack, previousTechStack);
      if (newTechs.length > 0) {
        signals.push({
          type: "tech_stack_change",
          subType: "new_tools_added",
          confidence: 0.85,
          weight: 0.8,
          data: {
            newTechnologies: newTechs,
            meaningType: "buying_signals",
          },
          detectedAt: new Date(),
        });
      }
    }

    // Email marketing platform
    if (techStack.klaviyoDetected) {
      signals.push({
        type: "tech_stack",
        subType: "email_marketing",
        confidence: 0.95,
        weight: 0.6,
        data: { platform: "klaviyo" },
        detectedAt: new Date(),
      });
    }

    return signals;
  }

  /**
   * Detect which new technologies were added
   */
  private static detectTechChanges(
    newStack: TechStackData,
    oldStack: TechStackData
  ): string[] {
    const changes: string[] = [];

    if (newStack.isShopify && !oldStack.isShopify) changes.push("shopify");
    if (newStack.klaviyoDetected && !oldStack.klaviyoDetected) changes.push("klaviyo");
    if (newStack.metaPixelDetected && !oldStack.metaPixelDetected) changes.push("meta_pixel");
    if (newStack.googleAnalytics && !oldStack.googleAnalytics) changes.push("google_analytics");
    if (newStack.googleTagManager && !oldStack.googleTagManager) changes.push("google_tag_manager");

    // Custom tech comparisons
    if (newStack.customTechs && oldStack.customTechs) {
      const oldTechSet = new Set(oldStack.customTechs);
      const newTechs = newStack.customTechs.filter(t => !oldTechSet.has(t));
      changes.push(...newTechs);
    }

    return changes;
  }

  /**
   * Extract ad activity signals (requires external API integration)
   */
  static extractAdActivitySignals(adData: {
    isRunningAds: boolean;
    estimatedSpendTrend?: "increasing" | "stable" | "decreasing";
    platforms?: string[];
  }): DetectedSignal[] {
    const signals: DetectedSignal[] = [];

    if (adData.isRunningAds) {
      signals.push({
        type: "ad_activity",
        subType: "active_campaigns",
        confidence: 0.85,
        weight: 0.8,
        data: {
          isActive: true,
          trend: adData.estimatedSpendTrend || "unknown",
          platforms: adData.platforms || [],
          meaning: "Active paid advertising indicates marketing budget allocation",
        },
        detectedAt: new Date(),
      });
    }

    if (adData.estimatedSpendTrend === "increasing") {
      signals.push({
        type: "momentum",
        subType: "increasing_ad_spend",
        confidence: 0.75,
        weight: 0.9,
        data: {
          trend: "increasing",
          meaning: "Scaling paid acquisition channels - growth stage company",
        },
        detectedAt: new Date(),
      });
    }

    return signals;
  }

  /**
   * Combine all signals into comprehensive signal list
   */
  static combineSignals(...signalArrays: DetectedSignal[][]): DetectedSignal[] {
    return signalArrays
      .flat()
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 50); // Limit to 50 highest-confidence signals
  }
}
