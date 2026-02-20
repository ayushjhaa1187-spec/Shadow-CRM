import axios from "axios";

export interface JobPosting {
  jobTitle: string;
  jobLevel: string;
  source: "linkedin" | "wellfound" | "indeed" | "other";
  companyName: string;
  location: string;
  jobUrl: string;
  postedDate: Date;
  description?: string;
  salary?: string;
}

export class JobBoardScraper {
  /**
   * Search LinkedIn jobs for a company (requires LinkedIn API key in production)
   * For MVP: Return mock data or use a third-party job aggregator
   */
  static async getLinkedInJobsForCompany(
    companyName: string,
    keywords: string[] = ["performance", "marketing", "growth"]
  ): Promise<JobPosting[]> {
    // In production, use LinkedIn API or RapidAPI LinkedIn scraper
    // For now, return placeholder
    console.log(`[LinkedIn] Searching jobs for ${companyName}`);
    return this.mockLinkedInJobs(companyName);
  }

  /**
   * Search Wellfound for jobs (formerly AngelList)
   */
  static async getWellfoundJobs(
    companyName: string,
    keywords: string[] = ["marketing"]
  ): Promise<JobPosting[]> {
    try {
      // Wellfound API endpoint for company jobs
      const url = `https://api.angel.co/1/jobs?startup=${encodeURIComponent(companyName)}`;

      const response = await axios.get(url, {
        timeout: 10000,
      });

      const jobs = (response.data.jobs || []).map((job: any) => ({
        jobTitle: job.title,
        jobLevel: this.inferJobLevel(job.title),
        source: "wellfound" as const,
        companyName: job.startup?.name || companyName,
        location: job.location?.display_name || "Unknown",
        jobUrl: `https://wellfound.com/jobs/${job.id}`,
        postedDate: job.created_at ? new Date(job.created_at) : new Date(),
        description: job.description,
        salary: job.salary_range,
      }));

      return jobs;
    } catch (error) {
      console.error(`Error fetching Wellfound jobs for ${companyName}:`, error);
      return [];
    }
  }

  /**
   * Search Indeed jobs for a company
   */
  static async getIndeedJobs(
    companyName: string,
    location: string = ""
  ): Promise<JobPosting[]> {
    try {
      // Indeed RapidAPI endpoint (requires API key)
      // For MVP: Using mock data
      console.log(`[Indeed] Searching jobs for ${companyName}`);
      return this.mockIndeedJobs(companyName);
    } catch (error) {
      console.error(`Error fetching Indeed jobs:`, error);
      return [];
    }
  }

  /**
   * Get hiring velocity - count jobs posted in last 30 days
   */
  static async getHiringVelocity(
    companyName: string,
    daysAgo: number = 30
  ): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - daysAgo);

    const jobs = await Promise.all([
      this.getLinkedInJobsForCompany(companyName),
      this.getWellfoundJobs(companyName),
      this.getIndeedJobs(companyName),
    ]);

    const allJobs = jobs.flat();
    const recentJobs = allJobs.filter(job => job.postedDate >= thirtyDaysAgo);

    return recentJobs.length;
  }

  /**
   * Extract job level from title
   */
  private static inferJobLevel(title: string): string {
    const titleLower = title.toLowerCase();

    if (titleLower.includes("director") || titleLower.includes("vp")) {
      return "director";
    }
    if (titleLower.includes("manager") || titleLower.includes("lead")) {
      return "manager";
    }
    if (titleLower.includes("senior") || titleLower.includes("principal")) {
      return "senior";
    }
    if (titleLower.includes("junior") || titleLower.includes("entry")) {
      return "junior";
    }

    return "individual_contributor";
  }

  /**
   * Mock LinkedIn jobs (for MVP testing)
   */
  private static mockLinkedInJobs(companyName: string): JobPosting[] {
    return [
      {
        jobTitle: "Performance Marketing Manager",
        jobLevel: "manager",
        source: "linkedin",
        companyName,
        location: "United States",
        jobUrl: "https://linkedin.com/jobs/mock",
        postedDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
        description: "Managing paid acquisition channels for ecommerce growth",
        salary: "$80K - $120K",
      },
      {
        jobTitle: "Paid Media Specialist",
        jobLevel: "individual_contributor",
        source: "linkedin",
        companyName,
        location: "United States",
        jobUrl: "https://linkedin.com/jobs/mock",
        postedDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
        description: "Managing Meta, Google, and TikTok campaigns",
      },
    ];
  }

  /**
   * Mock Indeed jobs (for MVP testing)
   */
  private static mockIndeedJobs(companyName: string): JobPosting[] {
    return [
      {
        jobTitle: "Growth Marketing Lead",
        jobLevel: "manager",
        source: "indeed",
        companyName,
        location: "Remote",
        jobUrl: "https://indeed.com/jobs/mock",
        postedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      },
    ];
  }
}
