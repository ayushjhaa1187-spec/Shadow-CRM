import { DetectedSignal } from "../types";
import * as Joi from "joi";

/**
 * Normalized signal schema - all signals conform to this
 */
export const SIGNAL_SCHEMA = Joi.object({
  type: Joi.string()
    .valid(
      "hiring",
      "website_change",
      "ad_activity",
      "tech_stack_change",
      "social_proof",
      "ad_activity",
      "company_info",
      "revenue_claim",
      "funding",
      "leadership_change",
      "tech_stack",
      "momentum"
    )
    .required(),
  subType: Joi.string().required(),
  confidence: Joi.number().min(0).max(1).required(),
  weight: Joi.number().min(0).max(1).required(),
  data: Joi.object().required(),
  detectedAt: Joi.date().required(),
});

/**
 * Signal normalization rules per source type
 */
export interface SignalNormalizationRule {
  sourceType: string;
  normalize: (raw: any) => DetectedSignal[];
  validate: (signal: any) => boolean;
}

export class SignalNormalizer {
  /**
   * Normalize a signal - ensure consistency across all sources
   */
  static normalize(signal: DetectedSignal): DetectedSignal {
    // Validate against schema
    const { error, value } = SIGNAL_SCHEMA.validate(signal, {
      stripUnknown: true,
    });

    if (error) {
      console.warn(`Signal validation failed:`, error.message);
      // Return signal with defaults to keep going
      return {
        ...signal,
        confidence: Math.max(0, Math.min(1, signal.confidence || 0.5)),
        weight: Math.max(0, Math.min(1, signal.weight || 0.5)),
      };
    }

    return value;
  }

  /**
   * Normalize multiple signals
   */
  static normalizeMany(signals: DetectedSignal[]): DetectedSignal[] {
    return signals.map(s => this.normalize(s));
  }

  /**
   * Deduplicate similar signals (same type+subType, different sources)
   */
  static dedup(signals: DetectedSignal[]): DetectedSignal[] {
    const seen = new Map<string, DetectedSignal>();

    for (const signal of signals.sort((a, b) => b.confidence - a.confidence)) {
      const key = `${signal.type}:${signal.subType}`;

      if (!seen.has(key)) {
        seen.set(key, signal);
      } else {
        // Keep highest confidence version
        const existing = seen.get(key)!;
        if (signal.confidence > existing.confidence) {
          seen.set(key, signal);
        }
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Enrich signal with additional context
   */
  static enrich(
    signal: DetectedSignal,
    context: {
      accountName?: string;
      domain?: string;
      extractedAt?: Date;
    }
  ): DetectedSignal {
    return {
      ...signal,
      data: {
        ...signal.data,
        ...context,
      },
    };
  }

  /**
   * Filter signals by confidence threshold
   */
  static filterByConfidence(
    signals: DetectedSignal[],
    minConfidence: number = 0.6
  ): DetectedSignal[] {
    return signals.filter(s => s.confidence >= minConfidence);
  }

  /**
   * Filter signals by type
   */
  static filterByType(signals: DetectedSignal[], type: string): DetectedSignal[] {
    return signals.filter(s => s.type === type);
  }

  /**
   * Group signals by type
   */
  static groupByType(signals: DetectedSignal[]): Record<string, DetectedSignal[]> {
    const grouped: Record<string, DetectedSignal[]> = {};

    for (const signal of signals) {
      if (!grouped[signal.type]) {
        grouped[signal.type] = [];
      }
      grouped[signal.type].push(signal);
    }

    return grouped;
  }

  /**
   * Get signal summary (count by type and confidence distribution)
   */
  static getSummary(signals: DetectedSignal[]): {
    total: number;
    byType: Record<string, number>;
    avgConfidence: number;
    highConfidence: number; // >0.8
    lowConfidence: number; // <0.6
  } {
    const byType: Record<string, number> = {};
    let totalConfidence = 0;
    let highConfidenceCount = 0;
    let lowConfidenceCount = 0;

    for (const signal of signals) {
      byType[signal.type] = (byType[signal.type] || 0) + 1;
      totalConfidence += signal.confidence;

      if (signal.confidence > 0.8) highConfidenceCount++;
      if (signal.confidence < 0.6) lowConfidenceCount++;
    }

    return {
      total: signals.length,
      byType,
      avgConfidence:
        signals.length > 0 ? Math.round((totalConfidence / signals.length) * 100) / 100 : 0,
      highConfidence: highConfidenceCount,
      lowConfidence: lowConfidenceCount,
    };
  }

  /**
   * Transform signals for scoring use (map to scoring inputs)
   */
  static transformForScoring(signals: DetectedSignal[]): {
    hiringSignals: DetectedSignal[];
    websiteChanges: DetectedSignal[];
    adActivity: DetectedSignal[];
    techStackChanges: DetectedSignal[];
    momentum: DetectedSignal[];
  } {
    return {
      hiringSignals: this.filterByType(signals, "hiring"),
      websiteChanges: this.filterByType(signals, "website_change"),
      adActivity: this.filterByType(signals, "ad_activity"),
      techStackChanges: this.filterByType(signals, "tech_stack_change"),
      momentum: this.filterByType(signals, "momentum"),
    };
  }

  /**
   * Validate signal completeness (all required fields)
   */
  static isValid(signal: any): boolean {
    return (
      signal &&
      typeof signal.type === "string" &&
      typeof signal.subType === "string" &&
      typeof signal.confidence === "number" &&
      typeof signal.weight === "number" &&
      typeof signal.data === "object" &&
      signal.detectedAt instanceof Date &&
      signal.confidence >= 0 &&
      signal.confidence <= 1 &&
      signal.weight >= 0 &&
      signal.weight <= 1
    );
  }

  /**
   * Convert legacy signal format to normalized format
   */
  static fromLegacy(legacySignal: any): DetectedSignal | null {
    try {
      // Handle different legacy formats
      if (legacySignal.signal_type && !legacySignal.type) {
        return {
          type: legacySignal.signal_type,
          subType: legacySignal.sub_type || legacySignal.signal_type,
          confidence: legacySignal.confidence ?? 0.7,
          weight: legacySignal.weight ?? 0.8,
          data: legacySignal.data || legacySignal.payload || {},
          detectedAt: legacySignal.detected_at
            ? new Date(legacySignal.detected_at)
            : new Date(),
        };
      }

      // Already normalized
      if (this.isValid(legacySignal)) {
        return legacySignal;
      }

      return null;
    } catch (error) {
      console.error("Error converting legacy signal:", error);
      return null;
    }
  }

  /**
   * Clean signals - remove invalid/incomplete ones
   */
  static clean(signals: any[]): DetectedSignal[] {
    return signals
      .map(s => {
        if (this.isValid(s)) return s;
        return this.fromLegacy(s);
      })
      .filter((s): s is DetectedSignal => s !== null);
  }

  /**
   * Sort signals by relevance (confidence × weight)
   */
  static sortByRelevance(signals: DetectedSignal[]): DetectedSignal[] {
    return signals.sort((a, b) => b.confidence * b.weight - a.confidence * a.weight);
  }

  /**
   * Get top N signals by relevance
   */
  static topN(signals: DetectedSignal[], n: number = 10): DetectedSignal[] {
    return this.sortByRelevance(signals).slice(0, n);
  }
}
