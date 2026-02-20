// Core types for Shadow CRM

export interface ScoreComponents {
  icpFit: number;      // 0-100
  intent: number;      // 0-100
  timing: number;      // 0-100
  momentum: number;    // 0-100
}

export interface LeadScore {
  final: number;       // 0-100
  components: ScoreComponents;
  tier: "A" | "B" | "C"; // A (80-100), B (65-79), C (50-64)
  explanation: ScoreExplanation;
}

export interface ScoreExplanation {
  icpBreakdown: string[];
  intentSignals: string[];
  timingFactors: string[];
  momentumIndicators: string[];
}

export interface DetectedSignal {
  type: "hiring" | "website_change" | "ad_activity" | "tech_stack_change" | "funding" | "leadership_change";
  subType: string;
  confidence: number;
  weight: number;
  data: Record<string, any>;
  detectedAt: Date;
}

export interface ScrapedAccount {
  name: string;
  domain: string;
  website?: string;
  industry?: string;
  companySize?: number;
  revenue?: string;
  location?: string;
  techStack?: TechStackData;
  signals?: DetectedSignal[];
}

export interface TechStackData {
  isShopify?: boolean;
  isWooCommerce?: boolean;
  isBigCommerce?: boolean;
  klaviyoDetected?: boolean;
  mailchimpDetected?: boolean;
  googleAnalytics?: boolean;
  metaPixelDetected?: boolean;
  customTechs?: string[];
}

export interface IcpProfile {
  industryMatch: string[];
  minEmployees?: number;
  maxEmployees?: number;
  geoMatch: string[];
  minRevenue?: string;
  maxRevenue?: string;
  requiredTechs: string[];
  preferredTechs: string[];
  minimumFitScore: number;
}

export interface HubSpotWebhook {
  eventId: number;
  timestamp: number;
  userId: string;
  action: string;
  changeSource: string;
  sourceId: string;
  objectId: string;
  propertyName: string;
  propertyValue: string | number | boolean;
  reason: string;
  initiatingUserId: number;
  changedByUserId: number;
  classId: string;
  portalId: number;
}

export interface PipedriveWebhook {
  action: string;
  object: {
    type: string;
    id: string;
  };
  meta: {
    timestamp: number;
    userId: string;
  };
  data: Record<string, any>;
}
