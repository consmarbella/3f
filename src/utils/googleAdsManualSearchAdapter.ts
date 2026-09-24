/**
 * GoogleAdsManualSearchAdapter.
 *
 * Contrato permanente del publish, derivado de la documentación oficial
 * Google Ads API (v25). Convierte campaignData SIEMPRE a una campaña
 * Search + PAUSED + Manual CPC válida, sin parches por error.
 *
 * Fuentes (contrato):
 * - Search campaigns getting started (recursos obligatorios + orden):
 *   https://developers.google.com/google-ads/api/docs/campaigns/search-campaigns/getting-started
 *   Obligatorios: CampaignBudget, Campaign, AdGroup, AdGroupAd, AdGroupCriterion.
 *   "Set the campaign to PAUSED when creating it".
 * - Responsive Search Ads (mínimos):
 *   https://developers.google.com/google-ads/api/docs/responsive-search-ads/overview
 *   https://developers.google.com/google-ads/api/docs/responsive-search-ads/create-responsive-search-ads
 *   "at least three headlines, at least two descriptions, and at least one final URL".
 * - Manual bidding:
 *   https://developers.google.com/google-ads/api/docs/campaigns/bidding/set-bids
 *   https://developers.google.com/google-ads/api/docs/campaigns/bidding/strategy-types
 *   MANUAL_CPC (Standard, "Focus on clicks"); bids a nivel de ad group
 *   (cpc_bid_micros); ManualCpc solo tiene enhanced_cpc_enabled.
 * - Mutate:
 *   https://developers.google.com/google-ads/api/rest/common/mutate
 *   operations[] con create (sin resourceName).
 */

import {
  normalizeCampaignData,
  buildCriteriaOperations,
  buildAdOperations,
  buildAssetCreates,
  CompatCorrection,
  CompatOmission,
} from "./googleAdsCompat.js";

export const MANUAL_SEARCH_SPEC = {
  apiVersion: "v25",
  channel: "SEARCH",
  status: "PAUSED",
  bidding: {
    strategy: "MANUAL_CPC",
    manualCpc: { enhancedCpcEnabled: false },
  },
  budget: {
    deliveryMethod: "STANDARD",
    explicitlyShared: false,
    // Piso defensivo en micros (1 unidad de moneda)
    minAmountMicros: "1000000",
  },
  network: {
    targetGoogleSearch: true,
    targetSearchNetwork: true,
    targetContentNetwork: false,
    targetPartnerSearchNetwork: false,
  },
  adGroup: {
    type: "SEARCH_STANDARD",
    status: "PAUSED",
    defaultCpcBidMicros: "1500000",
  },
  rsa: {
    minHeadlines: 3,
    maxHeadlines: 15,
    headlineMaxChars: 30,
    minDescriptions: 2,
    maxDescriptions: 4,
    descriptionMaxChars: 90,
    pathMaxChars: 15,
    finalUrlsRequired: true,
  },
  criterion: {
    positiveStatus: "PAUSED",
    // Las negativas no admiten PAUSED en Google Ads
    negativeStatus: "ENABLED",
  },
  asset: {
    sitelinkTextMax: 25,
    sitelinkDescriptionMax: 35,
    calloutMax: 25,
    linkStatus: "PAUSED",
  },
  euPoliticalAdvertising: "DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING",
} as const;

export interface ManualSearchPlan {
  /** campaignData ya normalizado por la spec (lo que realmente se publica) */
  normalized: any;
  correctionsApplied: CompatCorrection[];
  omittedItems: CompatOmission[];
  /** Operación final de budget (sin dependencias) */
  budgetOperations: any[];
  campaignName: string;
  website: string;
  /** Construye la operación de campaña una vez existe el budget */
  buildCampaignOperation: (budgetResourceName: string) => any;
  /** Construye las operaciones de ad groups una vez existe la campaña */
  buildAdGroupOperations: (campaignResourceName: string) => any[];
  /** Construye criteria con los resource names REALES de ad groups */
  buildCriteriaOperationsFor: (adGroupResourceNames: string[]) => { operations: any[]; sourceCount: number };
  /** Construye RSAs con los resource names REALES de ad groups */
  buildAdOperationsFor: (adGroupResourceNames: string[]) => any[];
  /** Creates de assets (finales; el link a campaña se arma en el publish) */
  assetCreates: Array<{ kind: "SITELINK" | "CALLOUT"; create: any }>;
  /** Nombres visibles de grupos (trazabilidad) */
  adGroupsToCreate: any[];
  counts: {
    adGroups: number;
    criteriaSource: number;
    criteriaOperations: number;
    ads: number;
    assets: number;
    sitelinks: number;
    callouts: number;
  };
}

function buildCampaignName(rawName: string): string {
  return `${String(rawName || "Campaign").slice(0, 110)} [${new Date().toISOString().slice(0, 10)}]`;
}

/**
 * Adapta campaignData completo a la spec fija Manual Search.
 * Nunca emite bidding automático ni campos incompatibles: la spec manda.
 */
export function adaptCampaignForManualSearch(input: any): ManualSearchPlan {
  const { data: normalized, correctionsApplied, omittedItems } = normalizeCampaignData(input);
  const spec = MANUAL_SEARCH_SPEC;

  const dailyBudget = Number(normalized.settings?.dailyBudget) || 25;
  const amountMicros = String(
    Math.max(Math.round(dailyBudget * 1000000), Number(spec.budget.minAmountMicros))
  );
  const budgetOperations = [
    {
      create: {
        name: `Presupuesto ${String(normalized.campaignName || "Campaign").slice(0, 45)} [${Date.now().toString().slice(-6)}]`,
        amountMicros,
        deliveryMethod: spec.budget.deliveryMethod,
        explicitlyShared: spec.budget.explicitlyShared,
      },
    },
  ];

  const campaignName = buildCampaignName(normalized.campaignName);
  const website = String(normalized.website || "https://google.com");

  const buildCampaignOperation = (budgetResourceName: string) => ({
    create: {
      name: campaignName,
      status: spec.status,
      advertisingChannelType: spec.channel,
      campaignBudget: budgetResourceName,
      manualCpc: { ...spec.bidding.manualCpc },
      networkSettings: { ...spec.network },
      containsEuPoliticalAdvertising: spec.euPoliticalAdvertising,
    },
  });

  const adGroupsToCreate =
    Array.isArray(normalized.adGroups) && normalized.adGroups.length > 0
      ? normalized.adGroups
      : [{ name: "Grupo Principal - Search", userIntent: "", keywords: [], negatives: [], ads: [] }];

  const buildAdGroupOperations = (campaignResourceName: string) =>
    adGroupsToCreate.map((group: any, idx: number) => ({
      create: {
        name: `${group.name || `Grupo de Anuncios ${idx + 1}`}`.slice(0, 100),
        campaign: campaignResourceName,
        status: spec.adGroup.status,
        type: spec.adGroup.type,
        cpcBidMicros: spec.adGroup.defaultCpcBidMicros,
      },
    }));

  const buildCriteriaOperationsFor = (adGroupResourceNames: string[]) =>
    buildCriteriaOperations(adGroupsToCreate, adGroupResourceNames);

  const buildAdOperationsFor = (adGroupResourceNames: string[]) =>
    buildAdOperations(adGroupsToCreate, adGroupResourceNames, website);

  const assetCreates = buildAssetCreates({ ...normalized, campaignName }, campaignName, website);

  // Conteos del plan (con resource names provisorios: los conteos no dependen de ellos)
  const provisionalGroups = adGroupsToCreate.map(
    (_: any, i: number) => `customers/0/adGroups/-${i + 1}`
  );
  const criteriaPreview = buildCriteriaOperations(adGroupsToCreate, provisionalGroups);
  const adsPreview = buildAdOperations(adGroupsToCreate, provisionalGroups, website);

  const sitelinks = assetCreates.filter((a) => a.kind === "SITELINK").length;
  const callouts = assetCreates.filter((a) => a.kind === "CALLOUT").length;

  return {
    normalized,
    correctionsApplied,
    omittedItems,
    budgetOperations,
    campaignName,
    website,
    buildCampaignOperation,
    buildAdGroupOperations,
    buildCriteriaOperationsFor,
    buildAdOperationsFor,
    assetCreates,
    adGroupsToCreate,
    counts: {
      adGroups: adGroupsToCreate.length,
      criteriaSource: criteriaPreview.sourceCount,
      criteriaOperations: criteriaPreview.operations.length,
      ads: adsPreview.length,
      assets: assetCreates.length,
      sitelinks,
      callouts,
    },
  };
}
