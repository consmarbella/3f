export interface Sitelink {
  text: string;
  description1: string;
  description2: string;
}

export interface Ad {
  headlines: string[];
  descriptions: string[];
  path1: string;
  path2: string;
}

export interface AdGroup {
  name: string;
  userIntent: string; // e.g., 'Transaccional', 'Comercial', 'Informativo'
  keywords: string[];
  negatives: string[];
  ads: Ad[];
}

export interface CampaignSettings {
  dailyBudget: number;
  bidStrategyType: string;
  targetLanguages: string[];
  targetLocations: string[];
  locationPresenceMode?: string; // e.g., "Presencia: Personas en tus ubicaciones (Recomendado Certified)"
  networkSettings?: {
    searchNetwork: boolean;
    searchPartners: boolean;
    displayNetwork: boolean; // Must be false for Search
  };
}

export interface QualityScoreAudit {
  predictedScore: number; // 1 to 10 scale (e.g., 9.8)
  expectedCtr: string; // 'Por encima del promedio'
  adRelevance: string; // 'Por encima del promedio'
  landingPageExperience: string; // 'Por encima del promedio'
  keyFactors: string[];
}

export interface AdStrengthAudit {
  rating: 'Excelente' | 'Bueno';
  scorePercent: number; // 95 - 100
  checks: {
    label: string;
    passed: boolean;
    detail: string;
  }[];
}

export interface MeasurementPlan {
  primaryConversions: string[];
  enhancedConversions: boolean;
  consentModeV2: boolean;
  googleTagSetupGuide: string;
}

export interface CertifiedExpertTip {
  category: 'Quality Score' | 'Smart Bidding' | 'Políticas & Compliance' | 'Negativas & Ahorro' | 'Medición';
  title: string;
  recommendation: string;
  impactBadge: string;
}

export interface BentoStats {
  consultancyValue: string;
  wastedSpendProtected: string;
  estimatedCtrUplift: string;
  adStrengthScore: string;
}

export interface CampaignStrategy {
  campaignName: string;
  campaignGoal: string;
  campaignOverview: string;
  strategicRationale: string;
  culturalAnalysis?: string;
  language: string;
  website?: string; // finalUrls de RSA y sitelinks en publish
  settings: CampaignSettings;
  sitelinks: Sitelink[];
  callouts: string[];
  adGroups: AdGroup[];
  manualConfigInstructions: string[];
  // Google Ads Certified Architect additions:
  qualityScoreAudit?: QualityScoreAudit;
  adStrengthAudit?: AdStrengthAudit;
  measurementPlan?: MeasurementPlan;
  certifiedTips?: CertifiedExpertTip[];
  bentoStats?: BentoStats;
}

export interface BriefInput {
  businessName: string;
  website: string;
  mainProduct: string;
  location: string;
  dailyBudget: number;
  brandTone: string;
  clientType: 'B2C' | 'B2B' | 'Lujo' | 'Servicios Locales' | 'SaaS' | 'Legal/Médico' | 'E-commerce';
  coreValueProp: string;
  primaryGoal: string;
  excludedServices: string;
  languagePreference: string;
  customNotes?: string;
}

export interface PresetTemplate {
  id: string;
  name: string;
  industry: string;
  flag: string;
  location: string;
  brief: BriefInput;
}

