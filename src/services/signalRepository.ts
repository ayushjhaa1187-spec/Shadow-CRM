import { prisma } from "../lib/prisma";
import { Signal, HiringSignal } from "@prisma/client";
import { DetectedSignal } from "../types";

export class SignalRepository {
  /**
   * Store a detected signal
   */
  static async createSignal(
    clientId: string,
    accountId: string,
    signal: DetectedSignal
  ): Promise<Signal> {
    return prisma.signal.create({
      data: {
        clientId,
        accountId,
        type: signal.type,
        subType: signal.subType,
        confidence: signal.confidence,
        weight: signal.weight,
        decayValue: signal.weight, // Initial decay value = weight
        rawData: signal.data,
        detectedAt: signal.detectedAt,
      },
    });
  }

  /**
   * Create hiring signal
   */
  static async createHiringSignal(
    accountId: string,
    jobTitle: string,
    jobLevel: string,
    source: string,
    jobUrl?: string,
    confidence?: number
  ): Promise<HiringSignal> {
    return prisma.hiringSignal.create({
      data: {
        accountId,
        jobTitle,
        jobLevel,
        source,
        jobUrl,
        confidence: confidence || 0.8,
      },
    });
  }

  /**
   * Get signals for an account
   */
  static async getSignalsByAccount(
    accountId: string,
    limit: number = 100
  ): Promise<Signal[]> {
    return prisma.signal.findMany({
      where: { accountId },
      orderBy: { detectedAt: "desc" },
      take: limit,
    });
  }

  /**
   * Get hiring signals for an account
   */
  static async getHiringSignalsByAccount(
    accountId: string,
    limit: number = 50
  ): Promise<HiringSignal[]> {
    return prisma.hiringSignal.findMany({
      where: { accountId },
      orderBy: { scrapedAt: "desc" },
      take: limit,
    });
  }

  /**
   * Get signals by type
   */
  static async getSignalsByType(
    type: string,
    limit: number = 100
  ): Promise<Signal[]> {
    return prisma.signal.findMany({
      where: { type },
      orderBy: { detectedAt: "desc" },
      take: limit,
    });
  }

  /**
   * Get recent signals (last N days)
   */
  static async getRecentSignals(daysAgo: number = 7, limit: number = 100): Promise<Signal[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

    return prisma.signal.findMany({
      where: {
        detectedAt: {
          gte: cutoffDate,
        },
      },
      orderBy: { detectedAt: "desc" },
      take: limit,
    });
  }

  /**
   * Get high-confidence signals
   */
  static async getHighConfidenceSignals(
    minConfidence: number = 0.7,
    limit: number = 100
  ): Promise<Signal[]> {
    return prisma.signal.findMany({
      where: {
        confidence: {
          gte: minConfidence,
        },
      },
      orderBy: {
        confidence: "desc",
      },
      take: limit,
    });
  }

  /**
   * Update signal decay value (called periodically)
   */
  static async updateSignalDecay(signalId: string, decayFactor: number): Promise<Signal> {
    return prisma.signal.update({
      where: { id: signalId },
      data: { decayValue: decayFactor },
    });
  }

  /**
   * Apply decay to all signals for an account
   */
  static async applyDecayToAccountSignals(accountId: string): Promise<void> {
    const signals = await prisma.signal.findMany({
      where: { accountId },
    });

    const DECAY_LAMBDA = 0.03;

    for (const signal of signals) {
      const daysSince = Math.floor(
        (Date.now() - signal.detectedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      const decayFactor = Math.exp(-DECAY_LAMBDA * daysSince);
      const newDecayValue = signal.weight * decayFactor;

      await prisma.signal.update({
        where: { id: signal.id },
        data: { decayValue: newDecayValue },
      });
    }
  }

  /**
   * Get signals for a client (across all accounts)
   */
  static async getSignalsByClient(
    clientId: string,
    type?: string,
    limit: number = 100
  ): Promise<Signal[]> {
    return prisma.signal.findMany({
      where: {
        clientId,
        ...(type && { type }),
      },
      orderBy: { detectedAt: "desc" },
      include: {
        account: true,
      },
      take: limit,
    });
  }

  /**
   * Get signal summary for an account
   */
  static async getSignalSummary(accountId: string): Promise<{
    totalSignals: number;
    byType: Record<string, number>;
    recentCount24h: number;
    averageConfidence: number;
  }> {
    const signals = await prisma.signal.findMany({
      where: { accountId },
      select: { type: true, confidence: true, detectedAt: true },
    });

    const byType: Record<string, number> = {};
    let totalConfidence = 0;

    for (const signal of signals) {
      byType[signal.type] = (byType[signal.type] || 0) + 1;
      totalConfidence += signal.confidence;
    }

    const cutoff24h = new Date();
    cutoff24h.setHours(cutoff24h.getHours() - 24);
    const recentCount = signals.filter(s => s.detectedAt >= cutoff24h).length;

    return {
      totalSignals: signals.length,
      byType,
      recentCount24h: recentCount,
      averageConfidence:
        signals.length > 0 ? Math.round((totalConfidence / signals.length) * 100) / 100 : 0,
    };
  }

  /**
   * Delete old signals (data cleanup)
   */
  static async deleteOldSignals(olderThanDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await prisma.signal.deleteMany({
      where: {
        detectedAt: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }

  /**
   * Bulk create hiring signals
   */
  static async bulkCreateHiringSignals(
    accountId: string,
    signals: Array<{
      jobTitle: string;
      jobLevel: string;
      source: string;
      jobUrl?: string;
      confidence?: number;
    }>
  ): Promise<HiringSignal[]> {
    return Promise.all(
      signals.map(signal =>
        this.createHiringSignal(
          accountId,
          signal.jobTitle,
          signal.jobLevel,
          signal.source,
          signal.jobUrl,
          signal.confidence
        )
      )
    );
  }
}
