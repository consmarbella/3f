/**
 * Bridge: convierte el campaignData de la plataforma (CampaignStrategy,
 * camelCase, notación [exact]/"frase"/-negativa) al GoogleAdsGenerationSpec
 * de la spec v3 (snake_case API, enums explícitos).
 *
 * No valida ni decide: solo traduce formas. La validación es runPreflight().
 */
import type {
  GoogleAdsGenerationSpec,
  KeywordSpec,
  RSASpec,
  AssetSpec,
} from "./google-ads-search-manual-cpc-spec-v3.js";
import { parseCriterion } from "./googleAdsCompat.js";

export interface BridgeInput {
  customerId: string;
  currencyCode: string;
  website?: string;
}

function cleanText(v: unknown, max: number): string {
  return String(v ?? "").slice(0, max).trim();
}

export function toGenerationSpec(campaignData: any, opts: BridgeInput): GoogleAdsGenerationSpec {
  const cd = campaignData || {};
  const groups = Array.isArray(cd.adGroups) ? cd.adGroups : [];
  const website = String(opts.website || cd.website || "").trim();

  const keywordsOf = (list: unknown, forceNegative: boolean): KeywordSpec[] => {
    const out: KeywordSpec[] = [];
    for (const raw of Array.isArray(list) ? list : []) {
      const p = parseCriterion(raw);
      if (!p) continue;
      out.push({
        text: p.text,
        matchType: p.matchType as KeywordSpec["matchType"],
        negative: forceNegative || p.negative,
      });
    }
    return out;
  };

  return {
    customerId: String(opts.customerId || "").replace(/[^0-9]/g, ""),
    currencyCode: String(opts.currencyCode || "").toUpperCase(),
    budget: {
      // Micros crudos: runPreflight los pisa al múltiplo de la unidad (floor).
      amountMicros: Math.round(Number(cd.settings?.dailyBudget || 0) * 1_000_000),
      explicitlyShared: false,
    },
    campaign: {
      name: String(cd.campaignName || "Campaign"),
      status: "PAUSED",
      advertisingChannelType: "SEARCH",
      manualCpc: { enhancedCpcEnabled: false },
      networkSettings: {
        target_google_search: true,
        target_search_network: cd.settings?.networkSettings?.searchNetwork !== false,
        target_content_network: false,
        target_partner_search_network: false,
      },
    },
    // La plataforma no genera geo-RNs ni negativas de campaña: vacío explícito.
    targeting: { locations: [], campaignNegativeKeywords: [] },
    assets: [
      ...(Array.isArray(cd.sitelinks) ? cd.sitelinks : []).map((s: any): AssetSpec => ({
        type: "SITELINK",
        linkText: cleanText(s?.text, 25),
        finalUrl: website,
        descriptionLine1: cleanText(s?.description1, 35) || undefined,
        descriptionLine2: cleanText(s?.description2, 35) || undefined,
      })),
      ...(Array.isArray(cd.callouts) ? cd.callouts : []).map((c: any): AssetSpec => ({
        type: "CALLOUT",
        text: cleanText(c, 25),
      })),
    ],
    adGroups: groups.map((g: any, gi: number) => ({
      adGroup: {
        name: String(g?.name || `Grupo de Anuncios ${gi + 1}`),
        status: "PAUSED" as const,
        type: "SEARCH_STANDARD" as const,
        // Sin bid: preflight aplica default CONFIG (= 1 unidad facturable).
        ...(g?.defaultCpcBidMicros !== undefined ? { cpcBidMicros: Number(g.defaultCpcBidMicros) } : {}),
      },
      keywords: [
        ...keywordsOf(g?.keywords, false),
        ...keywordsOf(g?.negatives, true),
      ],
      ads: (Array.isArray(g?.ads) ? g.ads : []).map((a: any) => ({
        finalUrls: [website],
        headlines: (Array.isArray(a?.headlines) ? a.headlines : []).map((h: any) => ({ text: String(h ?? "") })),
        descriptions: (Array.isArray(a?.descriptions) ? a.descriptions : []).map((d: any) => ({ text: String(d ?? "") })),
        ...(a?.path1 ? { path1: String(a.path1) } : {}),
        ...(a?.path2 ? { path2: String(a.path2) } : {}),
        status: "PAUSED" as const,
      })),
    })),
  };
}
