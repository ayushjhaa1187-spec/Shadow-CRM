// @ts-nocheck
import axios from "axios";
import * as cheerio from "cheerio";

export interface ParsedWebsite {
  title?: string;
  description?: string;
  headings: string[];
  caseStudies: string[];
  revenueSignals: string[];
  teamSizeClues: string[];
  socialLinks: Map<string, string>;
  emails: string[];
}

export class WebsiteScraper {
  /**
   * Scrape and parse a company website
   */
  static async parseWebsite(url: string, timeout: number = 10000): Promise<ParsedWebsite> {
    try {
      const response = await axios.get(url, {
        timeout,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      const $ = cheerio.load(response.data);

      // Extract title and meta description
      const title = $("title").text() || $('meta[property="og:title"]').attr("content");
      const description =
        $('meta[name="description"]').attr("content") ||
        $('meta[property="og:description"]').attr("content");

      // Extract all headings
      const headings: string[] = [];
      $("h1, h2, h3").each((_, el) => {
        const text = $(el).text().trim();
        if (text) headings.push(text);
      });

      // Look for case studies
      const caseStudies = this.extractCaseStudies($);

      // Look for revenue signals
      const revenueSignals = this.extractRevenueSignals($);

      // Look for team size clues
      const teamSizeClues = this.extractTeamSizeClues($);

      // Extract social links
      const socialLinks = this.extractSocialLinks($, url);

      // Extract emails
      const emails = this.extractEmails(response.data);

      return {
        title,
        description,
        headings,
        caseStudies,
        revenueSignals,
        teamSizeClues,
        socialLinks,
        emails,
      };
    } catch (error) {
      console.error(`Error parsing website ${url}:`, error);
      throw error;
    }
  }

  /**
   * Extract case study indicators
   */
  private static extractCaseStudies($: cheerio.CheerioAPI): string[] {
    const caseStudies: string[] = [];
    const keywords = ["case study", "case studies", "customer success", "success story", "real results"];

    $("h1, h2, h3, a, div").each((_, el) => {
      const text = $(el).text().toLowerCase();
      if (keywords.some(kw => text.includes(kw))) {
        caseStudies.push($(el).text().trim());
      }
    });

    return [...new Set(caseStudies)].slice(0, 10);
  }

  /**
   * Extract revenue/growth signals
   */
  private static extractRevenueSignals($: cheerio.CheerioAPI): string[] {
    const signals: string[] = [];
    const patterns = [
      /\$?\d+([,.])\d{3}([,.])\d{3}|\$?\d+[mk]/gi, // $1M, $100K, etc
      /\d+\s*%\s*(growth|increase|rise)/gi, // X% growth
      /(million|billion|thousand|k|m)\s*(dollar|revenue|ayb|arr)/gi,
      /scaled to.*\$?[\d.]+\s*(million|k|m)?/gi,
      /from.*to.*\$?[\d.]+\s*(million|k|m)?/gi,
    ];

    $("p, span, div").each((_, el) => {
      const text = $(el).text();
      patterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) {
          signals.push(...matches);
        }
      });
    });

    return [...new Set(signals)].slice(0, 10);
  }

  /**
   * Extract team size clues
   */
  private static extractTeamSizeClues($: cheerio.CheerioAPI): string[] {
    const clues: string[] = [];
    const patterns = [
      /\b(\d+)\s*(employees?|team members?|people|staff)/gi,
      /team of\s+(\d+)/gi,
      /(\d+)\+\s*(engineers|developers|marketers|designers)/gi,
    ];

    $("p, span, div, li").each((_, el) => {
      const text = $(el).text();
      patterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) {
          clues.push($(el).text().trim());
        }
      });
    });

    return [...new Set(clues)].slice(0, 5);
  }

  /**
   * Extract social links
   */
  private static extractSocialLinks($: cheerio.CheerioAPI, baseUrl: string): Map<string, string> {
    const socialLinks = new Map<string, string>();
    const platforms = {
      linkedin: /linkedin\.com\/company\//,
      twitter: /twitter\.com\//,
      facebook: /facebook\.com\//,
      instagram: /instagram\.com\//,
      github: /github\.com\//,
      crunchbase: /crunchbase\.com\//,
    };

    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      for (const [platform, regex] of Object.entries(platforms)) {
        if (regex.test(href)) {
          socialLinks.set(platform, href);
        }
      }
    });

    return socialLinks;
  }

  /**
   * Extract email addresses
   */
  private static extractEmails(html: string): string[] {
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const matches = html.match(emailPattern) || [];
    // Filter out common bots, no-reply
    return [...new Set(matches)].filter(
      email => !email.includes("noreply") && !email.includes("no-reply")
    ).slice(0, 10);
  }
}
