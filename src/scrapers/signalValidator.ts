import { DetectedSignal, ScrapedAccount } from "../types";
import { SignalNormalizer } from "./signalNormalizer";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  score: number; // 0-100 data quality score
}

export class SignalValidator {
  /**
   * Validate a single signal
   */
  static validateSignal(signal: DetectedSignal): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    // Check required fields
    if (!signal.type || signal.type.trim() === "") {
      errors.push("Signal type is required");
      score -= 20;
    }

    if (!signal.subType || signal.subType.trim() === "") {
      errors.push("Signal subType is required");
      score -= 20;
    }

    if (typeof signal.confidence !== "number" || signal.confidence < 0 || signal.confidence > 1) {
      errors.push("Confidence must be a number between 0 and 1");
      score -= 15;
    }

    if (typeof signal.weight !== "number" || signal.weight < 0 || signal.weight > 1) {
      errors.push("Weight must be a number between 0 and 1");
      score -= 15;
    }

    if (!signal.data || typeof signal.data !== "object") {
      errors.push("Signal data must be an object");
      score -= 20;
    }

    if (!signal.detectedAt || !(signal.detectedAt instanceof Date)) {
      errors.push("detectedAt must be a valid Date");
      score -= 15;
    }

    // Warnings (non-blocking)
    if (signal.confidence < 0.5) {
      warnings.push("Low confidence signal (< 0.5) - may be unreliable");
      score -= 10;
    }

    if (!signal.data || Object.keys(signal.data).length === 0) {
      warnings.push("Signal has empty data object");
      score -= 5;
    }

    // Check detectedAt is recent (not older than 1 year)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    if (signal.detectedAt < oneYearAgo) {
      warnings.push("Signal is older than 1 year - may be stale");
      score -= 15;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, score),
    };
  }

  /**
   * Validate multiple signals
   */
  static validateSignals(signals: DetectedSignal[]): {
    valid: DetectedSignal[];
    invalid: { signal: DetectedSignal; result: ValidationResult }[];
    summary: {
      total: number;
      valid: number;
      invalid: number;
      avgQualityScore: number;
    };
  } {
    const valid: DetectedSignal[] = [];
    const invalid: { signal: DetectedSignal; result: ValidationResult }[] = [];
    let totalScore = 0;

    for (const signal of signals) {
      const result = this.validateSignal(signal);
      totalScore += result.score;

      if (result.isValid) {
        valid.push(signal);
      } else {
        invalid.push({ signal, result });
      }
    }

    return {
      valid,
      invalid,
      summary: {
        total: signals.length,
        valid: valid.length,
        invalid: invalid.length,
        avgQualityScore: signals.length > 0 ? Math.round(totalScore / signals.length) : 0,
      },
    };
  }

  /**
   * Validate a scraped account
   */
  static validateAccount(account: ScrapedAccount): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    // Required fields
    if (!account.name || account.name.trim() === "") {
      errors.push("Account name is required");
      score -= 20;
    }

    if (!account.domain || account.domain.trim() === "") {
      errors.push("Account domain is required");
      score -= 20;
    }

    // Domain format validation
    if (!this.isValidDomain(account.domain)) {
      errors.push("Invalid domain format");
      score -= 20;
    }

    // Warnings
    if (!account.industry) {
      warnings.push("Account industry not detected");
      score -= 5;
    }

    if (!account.companySize) {
      warnings.push("Account company size not detected");
      score -= 5;
    }

    if (!account.location) {
      warnings.push("Account location not detected");
      score -= 5;
    }

    if (!account.techStack || Object.keys(account.techStack).length === 0) {
      warnings.push("No tech stack detected");
      score -= 10;
    }

    if (!account.signals || account.signals.length === 0) {
      warnings.push("No signals extracted from account");
      score -= 15;
    }

    // Validate signals if present
    if (account.signals && account.signals.length > 0) {
      const signalValidation = this.validateSignals(account.signals);
      if (signalValidation.invalid.length > 0) {
        warnings.push(
          `${signalValidation.invalid.length} signals failed validation`
        );
        score -= signalValidation.invalid.length * 2;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, score),
    };
  }

  /**
   * Check if domain is valid
   */
  private static isValidDomain(domain: string): boolean {
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    return domainRegex.test(domain);
  }

  /**
   * Validate signal against expected ICP for scoring
   */
  static validateSignalForScoring(
    signal: DetectedSignal,
    expectedTypes: string[]
  ): ValidationResult {
    const baseValidation = this.validateSignal(signal);

    if (!expectedTypes.includes(signal.type)) {
      baseValidation.warnings.push(
        `Signal type "${signal.type}" not expected for this scoring context`
      );
      baseValidation.score -= 10;
    }

    return baseValidation;
  }

  /**
   * Data quality score breakdown
   */
  static getQualityScoreBreakdown(account: ScrapedAccount): {
    completeness: number; // 0-100: how complete is the account data
    signalQuality: number; // 0-100: quality of signals
    dataFreshness: number; // 0-100: how recent is the data
    overall: number; // 0-100: overall quality
  } {
    let completeScore = 0;
    let completeWeight = 0;

    // Check for key fields
    if (account.name) { completeScore += 20; }
    if (account.domain) { completeScore += 20; }
    if (account.industry) { completeScore += 15; }
    if (account.companySize) { completeScore += 15; }
    if (account.location) { completeScore += 15; }
    if (account.techStack && Object.keys(account.techStack).length > 0) { completeScore += 15; }

    completeWeight = 100;

    // Signal quality
    let signalQuality = 0;
    if (account.signals && account.signals.length > 0) {
      const validation = this.validateSignals(account.signals);
      signalQuality = (validation.summary.valid / account.signals.length) * 100;
    }

    // Data freshness (we can assume recent scrapes = 100)
    const dataFreshness = 95; // Assume fresh data from scraper

    const overall = Math.round(
      (completeScore / completeWeight) * 0.4 +
      signalQuality * 0.4 +
      dataFreshness * 0.2
    );

    return {
      completeness: Math.round((completeScore / completeWeight) * 100),
      signalQuality: Math.round(signalQuality),
      dataFreshness,
      overall: Math.min(100, overall),
    };
  }

  /**
   * Suggest improvements for low-quality signals
   */
  static suggestImprovements(signals: DetectedSignal[]): string[] {
    const suggestions: string[] = [];
    const validation = this.validateSignals(signals);

    if (validation.invalid.length > validation.valid.length) {
      suggestions.push(
        "Most signals are invalid - check extractor logic for data quality issues"
      );
    }

    const lowConfidence = signals.filter(s => s.confidence < 0.5);
    if (lowConfidence.length > signals.length * 0.3) {
      suggestions.push(
        "High number of low-confidence signals - consider improving extraction accuracy"
      );
    }

    const byType = this.groupByType(signals);
    const emptyTypes = Object.entries(byType)
      .filter(([_, sigs]) => sigs.length === 0)
      .map(([type]) => type);

    if (emptyTypes.length > 0) {
      suggestions.push(
        `Missing signal types: ${emptyTypes.join(", ")} - consider adding more scrapers`
      );
    }

    return suggestions;
  }

  /**
   * Group signals by type for analysis
   */
  private static groupByType(signals: DetectedSignal[]): Record<string, DetectedSignal[]> {
    const grouped: Record<string, DetectedSignal[]> = {};

    for (const signal of signals) {
      if (!grouped[signal.type]) {
        grouped[signal.type] = [];
      }
      grouped[signal.type].push(signal);
    }

    return grouped;
  }
}
