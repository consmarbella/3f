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
    // Bid PEDIDO por defecto (USD 1.50). NUNCA se envía tal cual: siempre pasa
    // por normalizeCpcBidMicros() con la moneda real de la cuenta antes del mutate.
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
  /** Construye las operaciones de ad groups una vez existe la campaña.
   *  Requiere la moneda real de la cuenta: cada cpc se normaliza a la
   *  billable unit antes de enviarse (jamás se envía el default directo). */
  buildAdGroupOperations: (campaignResourceName: string, currencyCode: string) => {
    operations: any[];
    bidDetails: NormalizedBid[];
  };
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

// --- Billable units por moneda (evita VALUE_NOT_MULTIPLE_OF_BILLABLE_UNIT) ---
//
// Google exige que los montos en micros sean múltiplos de la unidad facturable
// de la moneda de la cuenta (ej: CLP no admite centavos). Regla base: dígitos
// decimales ISO 4217 -> unidad = 10^(6 - minorDigits) micros.
// Excepciones documentadas van en BILLABLE_UNIT_MICROS_OVERRIDE.

const CURRENCY_MINOR_DIGITS: Record<string, number> = {
  USD: 2, EUR: 2, GBP: 2, CAD: 2, AUD: 2, NZD: 2, CHF: 2, MXN: 2, BRL: 2,
  ARS: 2, COP: 2, PEN: 2, UYU: 2, BOB: 2, SGD: 2, HKD: 2, CNY: 2, INR: 2,
  SEK: 2, NOK: 2, DKK: 2, PLN: 2, CZK: 2, HUF: 2, ILS: 2, ZAR: 2, NGN: 2,
  EGP: 2, TRY: 2, AED: 2, SAR: 2, QAR: 2, THB: 2, MYR: 2, IDR: 2, PHP: 2,
  TWD: 2,
  CLP: 0, JPY: 0, KRW: 0, PYG: 0, VND: 0,
  KWD: 3, BHD: 3, OMD: 3, JOD: 3, TND: 3,
};

/** Overrides configurables (micros por unidad facturable). Vacío = regla ISO. */
const BILLABLE_UNIT_MICROS_OVERRIDE: Record<string, number> = {};

/** Mínimo de CPC configurable por moneda (micros). Vacío = 1 unidad facturable. */
const CPC_MINIMUM_MICROS_OVERRIDE: Record<string, number> = {};

export function resolveBillableUnitMicros(currencyCode: string): number {
  const code = String(currencyCode || "").toUpperCase();
  if (BILLABLE_UNIT_MICROS_OVERRIDE[code]) return BILLABLE_UNIT_MICROS_OVERRIDE[code];
  const minor = CURRENCY_MINOR_DIGITS[code] ?? 2;
  return Math.pow(10, 6 - minor);
}

export function resolveMinCpcBidMicros(currencyCode: string): number {
  const code = String(currencyCode || "").toUpperCase();
  if (CPC_MINIMUM_MICROS_OVERRIDE[code]) return CPC_MINIMUM_MICROS_OVERRIDE[code];
  return resolveBillableUnitMicros(code);
}

export interface NormalizedBid {
  adGroup: string;
  currencyCode: string;
  requestedBidMicros: number;
  billableUnitMicros: number;
  normalizedBidMicros: number;
  appliedMinimum: boolean;
}

/**
 * normalized = floor(requestedBid / billableUnit) * billableUnit.
 * Si da 0, usa el mínimo permitido configurable de la moneda.
 */
export function normalizeCpcBidMicros(requestedMicros: any, currencyCode: string): NormalizedBid {
  const code = String(currencyCode || "USD").toUpperCase();
  const unit = resolveBillableUnitMicros(code);
  const requested = Math.floor(Number(requestedMicros) || 0);
  let normalized = Math.floor(requested / unit) * unit;
  let appliedMinimum = false;
  if (normalized <= 0) {
    normalized = resolveMinCpcBidMicros(code);
    appliedMinimum = true;
  }
  return {
    adGroup: "",
    currencyCode: code,
    requestedBidMicros: requested,
    billableUnitMicros: unit,
    normalizedBidMicros: normalized,
    appliedMinimum,
  };
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

  const buildAdGroupOperations = (campaignResourceName: string, currencyCode: string) => {
    const operations: any[] = [];
    const bidDetails: NormalizedBid[] = [];
    adGroupsToCreate.forEach((group: any, idx: number) => {
      const name = `${group.name || `Grupo de Anuncios ${idx + 1}`}`.slice(0, 100);
      // Bid pedido: override del grupo o default de la spec. El valor ENVIADO
      // es siempre el normalizado a la billable unit (nunca el default directo).
      const requested = group.defaultCpcBidMicros ?? spec.adGroup.defaultCpcBidMicros;
      const bid = normalizeCpcBidMicros(requested, currencyCode);
      bid.adGroup = name;
      bidDetails.push(bid);
      operations.push({
        create: {
          name,
          campaign: campaignResourceName,
          status: spec.adGroup.status,
          type: spec.adGroup.type,
          cpcBidMicros: String(bid.normalizedBidMicros),
        },
      });
    });
    return { operations, bidDetails };
  };

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
