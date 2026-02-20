import { prisma } from "../lib/prisma";
import { Account, TechStack } from "@prisma/client";
import { ScrapedAccount, TechStackData } from "../types";

export class AccountRepository {
  /**
   * Create or update an account
   */
  static async upsertAccount(
    scrapeData: ScrapedAccount
  ): Promise<Account> {
    // First, upsert the account itself
    const account = await prisma.account.upsert({
      where: { domain: scrapeData.domain },
      update: {
        name: scrapeData.name,
        website: scrapeData.website,
        industry: scrapeData.industry,
        companySize: scrapeData.companySize,
        revenue: scrapeData.revenue,
        location: scrapeData.location,
        lastScrapedAt: new Date(),
      },
      create: {
        name: scrapeData.name,
        domain: scrapeData.domain,
        website: scrapeData.website,
        industry: scrapeData.industry,
        companySize: scrapeData.companySize,
        revenue: scrapeData.revenue,
        location: scrapeData.location,
        lastScrapedAt: new Date(),
      },
    });

    // Upsert tech stack if provided
    if (scrapeData.techStack) {
      await prisma.techStack.upsert({
        where: { accountId: account.id },
        update: scrapeData.techStack,
        create: {
          accountId: account.id,
          ...scrapeData.techStack,
        },
      });
    }

    return account;
  }

  /**
   * Get account by domain
   */
  static async getAccountByDomain(domain: string): Promise<Account | null> {
    return prisma.account.findUnique({
      where: { domain },
      include: {
        techStack: true,
        hiringSignals: true,
        signals: true,
      },
    });
  }

  /**
   * Get account by ID with full details
   */
  static async getAccountById(id: string): Promise<Account | null> {
    return prisma.account.findUnique({
      where: { id },
      include: {
        techStack: true,
        hiringSignals: true,
        signals: true,
        leads: true,
      },
    });
  }

  /**
   * Get multiple accounts (for batch processing)
   */
  static async getAccountsByIds(ids: string[]): Promise<Account[]> {
    return prisma.account.findMany({
      where: { id: { in: ids } },
      include: {
        techStack: true,
        hiringSignals: true,
      },
    });
  }

  /**
   * Create tech stack record
   */
  static async createTechStack(accountId: string, data: TechStackData): Promise<TechStack> {
    return prisma.techStack.create({
      data: {
        accountId,
        ...data,
      },
    });
  }

  /**
   * Update tech stack record
   */
  static async updateTechStack(accountId: string, data: Partial<TechStackData>): Promise<TechStack> {
    return prisma.techStack.update({
      where: { accountId },
      data,
    });
  }

  /**
   * Get accounts by industry
   */
  static async getAccountsByIndustry(industry: string, limit: number = 100): Promise<Account[]> {
    return prisma.account.findMany({
      where: {
        industry: {
          contains: industry,
          mode: "insensitive",
        },
      },
      include: {
        techStack: true,
      },
      take: limit,
    });
  }

  /**
   * Get accounts by location
   */
  static async getAccountsByLocation(location: string, limit: number = 100): Promise<Account[]> {
    return prisma.account.findMany({
      where: {
        location: {
          contains: location,
          mode: "insensitive",
        },
      },
      include: {
        techStack: true,
      },
      take: limit,
    });
  }

  /**
   * Get accounts by company size range
   */
  static async getAccountsBySizeRange(
    minSize: number,
    maxSize: number,
    limit: number = 100
  ): Promise<Account[]> {
    return prisma.account.findMany({
      where: {
        companySize: {
          gte: minSize,
          lte: maxSize,
        },
      },
      include: {
        techStack: true,
      },
      take: limit,
    });
  }

  /**
   * Get accounts with specific tech stack
   */
  static async getAccountsWithTech(techName: string, limit: number = 100): Promise<Account[]> {
    const techLower = techName.toLowerCase();

    return prisma.account.findMany({
      where: {
        techStack: {
          OR: [
            { isShopify: techLower === "shopify" },
            { isWooCommerce: techLower === "woocommerce" },
            { isBigCommerce: techLower === "bigcommerce" },
            { klaviyoDetected: techLower === "klaviyo" },
            { mailchimpDetected: techLower === "mailchimp" },
            { metaPixelDetected: techLower === "meta_pixel" },
          ],
        },
      },
      include: {
        techStack: true,
      },
      take: limit,
    });
  }

  /**
   * Get accounts with Shopify + Klaviyo (high intent for ecom)
   */
  static async getAccountsWithShopifyAndKlaviyo(limit: number = 100): Promise<Account[]> {
    return prisma.account.findMany({
      where: {
        techStack: {
          AND: [
            { isShopify: true },
            { klaviyoDetected: true },
          ],
        },
      },
      include: {
        techStack: true,
      },
      take: limit,
    });
  }

  /**
   * Get recently scraped accounts
   */
  static async getRecentlyScrapedAccounts(
    daysAgo: number = 7,
    limit: number = 100
  ): Promise<Account[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

    return prisma.account.findMany({
      where: {
        lastScrapedAt: {
          gte: cutoffDate,
        },
      },
      orderBy: {
        lastScrapedAt: "desc",
      },
      include: {
        techStack: true,
      },
      take: limit,
    });
  }

  /**
   * Get accounts that haven't been scraped recently
   */
  static async getStaleAccounts(
    daysWithoutScrape: number = 30,
    limit: number = 100
  ): Promise<Account[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysWithoutScrape);

    return prisma.account.findMany({
      where: {
        OR: [
          { lastScrapedAt: null },
          {
            lastScrapedAt: {
              lt: cutoffDate,
            },
          },
        ],
      },
      orderBy: {
        lastScrapedAt: "asc",
      },
      take: limit,
    });
  }

  /**
   * Count total accounts
   */
  static async countAccounts(): Promise<number> {
    return prisma.account.count();
  }

  /**
   * Get accounts by multiple criteria (for complex filtering)
   */
  static async searchAccounts(filters: {
    industry?: string;
    location?: string;
    minSize?: number;
    maxSize?: number;
    hasShopify?: boolean;
    hasKlaviyo?: boolean;
    limit?: number;
  }): Promise<Account[]> {
    const {
      industry,
      location,
      minSize,
      maxSize,
      hasShopify,
      hasKlaviyo,
      limit = 100,
    } = filters;

    return prisma.account.findMany({
      where: {
        ...(industry && {
          industry: {
            contains: industry,
            mode: "insensitive",
          },
        }),
        ...(location && {
          location: {
            contains: location,
            mode: "insensitive",
          },
        }),
        ...(minSize || maxSize) && {
          companySize: {
            ...(minSize && { gte: minSize }),
            ...(maxSize && { lte: maxSize }),
          },
        },
        ...(hasShopify || hasKlaviyo) && {
          techStack: {
            ...(hasShopify && { isShopify: true }),
            ...(hasKlaviyo && { klaviyoDetected: true }),
          },
        },
      },
      include: {
        techStack: true,
      },
      take: limit,
    });
  }
}
