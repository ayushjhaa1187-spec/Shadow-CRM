import { ScrapedAccount } from "../types";
import { WebsiteScraper } from "./websiteScraper";
import { TechStackDetector } from "./techStackDetector";
import { JobBoardScraper } from "./jobBoardScraper";
import { SignalExtractor } from "./signalExtractor";
import { SignalNormalizer } from "./signalNormalizer";
import { SignalValidator } from "./signalValidator";

export interface ScraperConfig {
  scrapeWebsite?: boolean;
  detectTechStack?: boolean;
  scrapeJobs?: boolean;
  extractWebsiteSignals?: boolean;
  extractHiringSignals?: boolean;
  normalizeSignals?: boolean;
  validateSignals?: boolean;
  timeout?: number;
}

export const DEFAULT_SCRAPER_CONFIG: ScraperConfig = {
  scrapeWebsite: true,
  detectTechStack: true,
  scrapeJobs: true,
  extractWebsiteSignals: true,
  extractHiringSignals: true,
  normalizeSignals: true,
  validateSignals: true,
  timeout: 10000,
};

export interface ScrapeSummary {
  domainScraped: boolean;
  techStackDetected: boolean;
  jobsFound: number;
  signalsExtracted: number;
  signalsNormalized?: number;
  dataQualityScore?: number;
}

export class CompanyScraperOrchestrator {
  /**
   * Scrape a company by domain - orchestrates all scrapers
   */
  static async scrapeCompany(
    domain: string,
    companyName: string,
    config: ScraperConfig = DEFAULT_SCRAPER_CONFIG
  ): Promise<ScrapedAccount> {
    const website = `https://${domain}`;
    const account: ScrapedAccount = {
      name: companyName,
      domain,
      website,
    };

    try {
      // Step 1: Scrape website
      if (config.scrapeWebsite) {
        console.log(`[${domain}] Scraping website...`);
        try {
          const parsed = await WebsiteScraper.parseWebsite(website);
          account.techStack = account.techStack || {};

          // Extract basic company info from website
          if (!account.industry && parsed.description) {
            if (
              parsed.description.toLowerCase().includes("ecommerce") ||
              parsed.description.toLowerCase().includes("shopify")
            ) {
              account.industry = "ecommerce";
            }
          }

          // Store parsed website data for signal extraction
          (account as any)._parsedWebsite = parsed;
        } catch (error) {
          console.error(`Failed to scrape website ${website}:`, error);
        }
      }

      // Step 2: Detect tech stack
      if (config.detectTechStack) {
        console.log(`[${domain}] Detecting tech stack...`);
        try {
          const techStack = await TechStackDetector.detectTechStack(website);
          account.techStack = techStack;
        } catch (error) {
          console.error(`Failed to detect tech stack for ${domain}:`, error);
        }
      }

      // Step 3: Scrape job boards
      let hiringSignals = [];
      if (config.scrapeJobs) {
        console.log(`[${domain}] Scraping job boards...`);
        try {
          const [linkedInJobs, wellfoundJobs, indeedJobs] = await Promise.all([
            JobBoardScraper.getLinkedInJobsForCompany(companyName),
            JobBoardScraper.getWellfoundJobs(companyName),
            JobBoardScraper.getIndeedJobs(companyName),
          ]);

          hiringSignals = [...linkedInJobs, ...wellfoundJobs, ...indeedJobs];
          (account as any)._jobPostings = hiringSignals;
        } catch (error) {
          console.error(`Failed to scrape job boards for ${companyName}:`, error);
        }
      }

      // Step 4: Extract signals from all sources
      let signals = [];

      if (config.extractWebsiteSignals && (account as any)._parsedWebsite) {
        const websiteSignals = SignalExtractor.extractWebsiteSignals(
          (account as any)._parsedWebsite,
          domain
        );
        signals.push(...websiteSignals);
      }

      if (config.extractHiringSignals && hiringSignals.length > 0) {
        const hireSignals = SignalExtractor.extractHiringSignals(hiringSignals);
        signals.push(...hireSignals);
      }

      if (account.techStack) {
        const techSignals = SignalExtractor.extractTechStackSignals(account.techStack);
        signals.push(...techSignals);
      }

      // Step 5: Normalize signals
      if (config.normalizeSignals && signals.length > 0) {
        console.log(`[${domain}] Normalizing ${signals.length} signals...`);
        signals = SignalNormalizer.normalizeMany(signals);
        // Remove duplicates after normalization
        signals = SignalNormalizer.dedup(signals);
      }

      // Step 6: Validate signals
      if (config.validateSignals && signals.length > 0) {
        console.log(`[${domain}] Validating signals...`);
        const validation = SignalValidator.validateSignals(signals);
        signals = validation.valid;

        if (validation.invalid.length > 0) {
          console.warn(
            `[${domain}] ${validation.invalid.length} signals failed validation`
          );
        }

        // Log validation summary
        console.log(`[${domain}] Signal validation summary:`, validation.summary);
      }

      // Combine signals
      account.signals = SignalNormalizer.sortByRelevance(signals);

      // Add quality score
      const qualityScore = SignalValidator.getQualityScoreBreakdown(account);
      (account as any)._qualityScore = qualityScore;

      return account;
    } catch (error) {
      console.error(`Error scraping company ${domain}:`, error);
      return account;
    }
  }

  /**
   * Batch scrape multiple companies
   */
  static async scrapeCompanies(
    companies: Array<{ domain: string; name: string }>,
    config?: ScraperConfig,
    concurrency: number = 3
  ): Promise<ScrapedAccount[]> {
    const results: ScrapedAccount[] = [];

    for (let i = 0; i < companies.length; i += concurrency) {
      const batch = companies.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(c => this.scrapeCompany(c.domain, c.name, config))
      );
      results.push(...batchResults);

      // Rate limiting
      if (i + concurrency < companies.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Get scrape status - shows what succeeded/failed
   */
  static getScrapeSummary(account: ScrapedAccount): ScrapeSummary {
    const qualityScore = (account as any)._qualityScore;

    return {
      domainScraped: !!(account as any)._parsedWebsite,
      techStackDetected: !!(account.techStack && Object.keys(account.techStack).length > 0),
      jobsFound: ((account as any)._jobPostings || []).length,
      signalsExtracted: (account.signals || []).length,
      signalsNormalized: account.signals
        ? SignalNormalizer.filterByConfidence(account.signals, 0).length
        : 0,
      dataQualityScore: qualityScore ? qualityScore.overall : undefined,
    };
  }
}
