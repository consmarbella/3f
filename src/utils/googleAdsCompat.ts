/**
 * Compatibility Layer: adapta lo que genera la plataforma a lo que
 * pide/permite Google Ads API antes y durante el publish.
 *
 * Funciones puras (sin I/O) para poder probar el mapeo con conteos reales.
 */

export interface CompatCorrection {
  area: string;
  field: string;
  before: string;
  after: string;
  reason: string;
}

export interface CompatOmission {
  area: string;
  item: string;
  reason: string;
}

export interface NormalizeReport {
  data: any;
  correctionsApplied: CompatCorrection[];
  omittedItems: CompatOmission[];
}

function cleanText(v: any, max: number): string {
  return String(v ?? "").slice(0, max).trim();
}

function short(v: any): string {
  return String(v ?? "").slice(0, 120);
}

/**
 * Preflight normalization de campaignData:
 * bids válidos, límites de caracteres, mínimos RSA, match types,
 * separación de negativas, MANUAL_CPC, Display OFF, Partners OFF.
 */
export function normalizeCampaignData(input: any): NormalizeReport {
  const correctionsApplied: CompatCorrection[] = [];
  const omittedItems: CompatOmission[] = [];
  const data = JSON.parse(JSON.stringify(input || {}));
  const fix = (area: string, field: string, before: any, after: any, reason: string) => {
    if (short(before) !== short(after)) {
      correctionsApplied.push({ area, field, before: short(before), after: short(after), reason });
    }
  };

  // 1. Bidding MANUAL_CPC obligatorio (sin estrategias de conversión)
  const stratBefore = data.settings?.bidStrategyType;
  if (!data.settings || typeof data.settings !== "object") data.settings = {};
  if (stratBefore !== "MANUAL_CPC") {
    data.settings.bidStrategyType = "MANUAL_CPC";
    fix("bidding", "bidStrategyType", stratBefore, "MANUAL_CPC", "Publish solo MANUAL_CPC: sin Smart Bidding ni tracking de conversiones");
  }

  // 2. Budget: número válido, mínimo 1 unidad de moneda
  let budget = Number(data.settings.dailyBudget);
  if (!Number.isFinite(budget) || budget <= 0) {
    fix("budget", "dailyBudget", data.settings.dailyBudget, 25, "Presupuesto inválido");
    budget = 25;
  }
  if (budget < 1) {
    fix("budget", "dailyBudget", budget, 1, "Mínimo 1 unidad de moneda (monto inválido para Google)");
    budget = 1;
  }
  data.settings.dailyBudget = Math.round(budget * 100) / 100;

  // 3. Red: Display OFF, Partners OFF (no permitidos por defecto)
  const net = data.settings.networkSettings;
  const netObj = net && typeof net === "object" ? net : {};
  if (netObj.searchPartners === true) {
    fix("network", "searchPartners", true, false, "Partner Search rechazado por Google (CANNOT_TARGET_PARTNER_SEARCH_NETWORK)");
  }
  if (netObj.displayNetwork === true) {
    fix("network", "displayNetwork", true, false, "Display OFF en campañas Search (regla Premier Partner)");
  }
  data.settings.networkSettings = {
    searchNetwork: netObj.searchNetwork !== false,
    searchPartners: false,
    displayNetwork: false,
  };

  // 4. AdGroups: nombres, dedupe de keywords/negativas, límites y mínimos RSA
  if (!Array.isArray(data.adGroups) || data.adGroups.length === 0) {
    data.adGroups = [{ name: "Grupo Principal - Search", userIntent: "", keywords: [], negatives: [], ads: [] }];
    omittedItems.push({ area: "adGroups", item: "(vacío)", reason: "Sin grupos en campaignData: se usa grupo genérico" });
  }
  data.adGroups.forEach((g: any, gi: number) => {
    const gname = String(g?.name || `Grupo de Anuncios ${gi + 1}`);
    if (gname.length > 100) fix("adGroups", `groups[${gi}].name`, `${gname.length} chars`, "100 chars", "Límite Google");
    g.name = gname.slice(0, 100);

    const dedupe = (arr: any): { out: any[]; dup: number } => {
      const seen = new Set<string>();
      const out: any[] = [];
      let dup = 0;
      for (const k of Array.isArray(arr) ? arr : []) {
        const key = String(k ?? "").trim();
        if (!key) continue;
        if (seen.has(key)) {
          dup++;
          continue;
        }
        seen.add(key);
        out.push(k);
      }
      return { out, dup };
    };
    const kd = dedupe(g.keywords);
    g.keywords = kd.out;
    if (kd.dup > 0) fix("criteria", `groups[${gi}].keywords`, `${kd.dup} duplicadas`, "eliminadas", "Deduplicadas");
    const nd = dedupe(g.negatives);
    g.negatives = nd.out;
    if (nd.dup > 0) fix("criteria", `groups[${gi}].negatives`, `${nd.dup} duplicadas`, "eliminadas", "Deduplicadas");

    const ads = Array.isArray(g.ads) ? g.ads : [];
    const validAds: any[] = [];
    ads.forEach((a: any, ai: number) => {
      const h = (Array.isArray(a?.headlines) ? a.headlines : []).map((v: any) => cleanText(v, 30)).filter(Boolean);
      const d = (Array.isArray(a?.descriptions) ? a.descriptions : []).map((v: any) => cleanText(v, 90)).filter(Boolean);
      const rawH = Array.isArray(a?.headlines) ? a.headlines.length : 0;
      const rawD = Array.isArray(a?.descriptions) ? a.descriptions.length : 0;
      if (h.length < 3 || d.length < 2) {
        omittedItems.push({
          area: "ads",
          item: `${g.name} / ad #${ai + 1}`,
          reason: `RSA incompleto (${h.length} titulares, ${d.length} descripciones; mínimo Google 3+2)`,
        });
        return;
      }
      if (rawH !== h.length || rawD !== d.length) {
        fix("ads", `${g.name} / ad #${ai + 1}`, `${rawH}/${rawD} textos`, `${h.length}/${d.length} textos`, "Límites 30/90 chars");
      }
      validAds.push({
        headlines: h,
        descriptions: d,
        path1: cleanText(a?.path1, 15),
        path2: cleanText(a?.path2, 15),
      });
    });
    g.ads = validAds;
  });

  // 5. Assets: solo válidos (texto presente), con límites
  const sl = Array.isArray(data.sitelinks) ? data.sitelinks : [];
  const okSl: any[] = [];
  sl.forEach((s: any, i: number) => {
    const t = cleanText(s?.text, 25);
    if (!t) {
      omittedItems.push({ area: "assets", item: `sitelink #${i + 1}`, reason: "Sin texto" });
      return;
    }
    okSl.push({ text: t, description1: cleanText(s?.description1, 35), description2: cleanText(s?.description2, 35) });
  });
  data.sitelinks = okSl;
  const co = Array.isArray(data.callouts) ? data.callouts : [];
  const okCo: string[] = [];
  co.forEach((c: any, i: number) => {
    const t = cleanText(c, 25);
    if (!t) {
      omittedItems.push({ area: "assets", item: `callout #${i + 1}`, reason: "Vacío" });
      return;
    }
    okCo.push(t);
  });
  data.callouts = okCo;

  // 6. Website debe ser URL válida para finalUrls
  const ws = String(data.website || "").trim();
  if (ws && !/^https?:\/\//i.test(ws)) {
    fix("ads", "website", ws, "(fallback https://google.com)", "URL inválida para finalUrls");
    data.website = undefined;
  }

  return { data, correctionsApplied, omittedItems };
}

// --- Retry de errores conocidos (una vez por etapa) ---

function collectErrorCodes(data: any): string[] {
  const codes: string[] = [];
  try {
    const details = data?.error?.details || [];
    const walk = (o: any) => {
      if (!o || typeof o !== "object") return;
      for (const [k, v] of Object.entries(o)) {
        if (k === "requestId") continue;
        if (typeof v === "string" && /error/i.test(k)) codes.push(v);
        else if (typeof v === "object") walk(v);
      }
    };
    details.forEach(walk);
  } catch {}
  return codes;
}

function errorText(data: any): string {
  try {
    const details = data?.error?.details?.[0]?.errors || [];
    const msgs = details.map((e: any) => e.message).filter(Boolean);
    if (msgs.length > 0) return msgs.join(" | ");
  } catch {}
  return data?.error?.message || "";
}

/**
 * Si el fallo es un error conocido con arreglo automático, muta operations
 * in-place y devuelve la descripción del arreglo. Null = no reintentable.
 */
export function matchRetryFix(service: string, operations: any[], data: any): string | null {
  const codes = collectErrorCodes(data);
  const msg = errorText(data).toLowerCase();

  if (
    service === "campaigns" &&
    codes.some((c) => c.includes("PARTNER_SEARCH"))
  ) {
    operations.forEach((op: any) => {
      if (op?.create?.networkSettings) op.create.networkSettings.targetPartnerSearchNetwork = false;
    });
    return "targetPartnerSearchNetwork=false (reintento tras CANNOT_TARGET_PARTNER_SEARCH_NETWORK)";
  }

  if (
    service === "campaignBudgets" &&
    (codes.some((c) => c.includes("BUDGET") && (c.includes("LOW") || c.includes("MIN"))) ||
      /budget.*(too low|minimum|too small)/.test(msg))
  ) {
    operations.forEach((op: any) => {
      if (op?.create && Number(op.create.amountMicros || 0) < 1000000) {
        op.create.amountMicros = "1000000";
      }
    });
    return "amountMicros=1000000 mínimo (reintento tras error de monto)";
  }

  return null;
}

// --- Builders campaignData -> operaciones Google Ads API (spec Manual Search) ---

/**
 * Corta al límite exacto de Google Ads (30 titulares / 90 descripciones).
 * Lanza si no hay mínimos RSA (3 + 2).
 */
export function sanitizeGoogleAdsPayload(
  headlines: string[],
  descriptions: string[]
): { cleanHeadlines: string[]; cleanDescriptions: string[] } {
  const cleanHeadlines = (headlines || [])
    .map((h) => (typeof h === "string" ? h.slice(0, 30).trim() : ""))
    .filter((h) => h.length > 0);

  const cleanDescriptions = (descriptions || [])
    .map((d) => (typeof d === "string" ? d.slice(0, 90).trim() : ""))
    .filter((d) => d.length > 0);

  if (cleanHeadlines.length < 3) {
    throw new Error("Se requieren al menos 3 titulares válidos.");
  }
  if (cleanDescriptions.length < 2) {
    throw new Error("Se requieren al menos 2 descripciones válidas.");
  }

  return { cleanHeadlines, cleanDescriptions };
}

// Notación de la plataforma: [exacta] -> EXACT, "frase" -> PHRASE,
// resto -> BROAD; prefijo "-" -> negativa.
export function parseCriterion(raw: any): { text: string; matchType: string; negative: boolean } | null {
  let s = String(raw || "").trim();
  if (!s) return null;
  let negative = false;
  if (s.startsWith("-")) {
    negative = true;
    s = s.slice(1).trim();
  }
  let matchType = "BROAD";
  if (s.startsWith("[") && s.endsWith("]") && s.length >= 2) {
    matchType = "EXACT";
    s = s.slice(1, -1).trim();
  } else if (s.startsWith('"') && s.endsWith('"') && s.length >= 2) {
    matchType = "PHRASE";
    s = s.slice(1, -1).trim();
  }
  if (!s) return null;
  return { text: s.slice(0, 80), matchType, negative };
}

export function buildCriteriaOperations(
  adGroupsToCreate: any[],
  adGroupResourceNames: string[]
): { operations: any[]; sourceCount: number } {
  const operations: any[] = [];
  let sourceCount = 0;
  adGroupsToCreate.forEach((group: any, gi: number) => {
    const agResource = adGroupResourceNames[gi];
    if (!agResource) return;
    const positives = Array.isArray(group.keywords) ? group.keywords : [];
    const negatives = Array.isArray(group.negatives) ? group.negatives : [];
    sourceCount += positives.length + negatives.length;
    positives.forEach((kw: any) => {
      const p = parseCriterion(kw);
      if (!p) return;
      operations.push({
        create: {
          adGroup: agResource,
          // Las negativas no admiten PAUSED en Google Ads
          status: p.negative ? "ENABLED" : "PAUSED",
          keyword: { text: p.text, matchType: p.matchType },
          ...(p.negative ? { negative: true } : {}),
        },
      });
    });
    negatives.forEach((kw: any) => {
      const p = parseCriterion(kw);
      if (!p) return;
      operations.push({
        create: {
          adGroup: agResource,
          status: "ENABLED",
          negative: true,
          keyword: { text: p.text, matchType: p.matchType },
        },
      });
    });
  });
  return { operations, sourceCount };
}

export function buildAdOperations(
  adGroupsToCreate: any[],
  adGroupResourceNames: string[],
  website: string
): any[] {
  const adOperations: any[] = [];
  adGroupResourceNames.forEach((agResource: string, index: number) => {
    const sourceGroup = adGroupsToCreate[index] || {};
    const sourceAds =
      Array.isArray(sourceGroup.ads) && sourceGroup.ads.length > 0 ? sourceGroup.ads : [];
    sourceAds.forEach((sourceAd: any) => {
      let cleanHeadlines: string[] = [];
      let cleanDescriptions: string[] = [];

      try {
        const sanitized = sanitizeGoogleAdsPayload(sourceAd.headlines || [], sourceAd.descriptions || []);
        cleanHeadlines = sanitized.cleanHeadlines;
        cleanDescriptions = sanitized.cleanDescriptions;
      } catch {
        cleanHeadlines = (sourceAd.headlines || [])
          .map((h: string) => String(h || "").slice(0, 30).trim())
          .filter(Boolean);
        cleanDescriptions = (sourceAd.descriptions || [])
          .map((d: string) => String(d || "").slice(0, 90).trim())
          .filter(Boolean);
      }

      // Mínimos exigidos por Google para un RSA: 3 titulares + 2 descripciones
      if (cleanHeadlines.length < 3 || cleanDescriptions.length < 2) return;

      adOperations.push({
        create: {
          adGroup: agResource,
          status: "PAUSED",
          ad: {
            responsiveSearchAd: {
              headlines: cleanHeadlines.map((text: string) => ({ text })),
              descriptions: cleanDescriptions.map((text: string) => ({ text })),
              path1: (sourceAd.path1 || "").slice(0, 15),
              path2: (sourceAd.path2 || "").slice(0, 15),
            },
            finalUrls: [website],
          },
        },
      });
    });
  });
  return adOperations;
}

export function buildAssetCreates(
  campaignData: any,
  cleanCampaignName: string,
  website: string
): Array<{ kind: "SITELINK" | "CALLOUT"; create: any }> {
  const sitelinks = Array.isArray(campaignData.sitelinks) ? campaignData.sitelinks : [];
  const callouts = Array.isArray(campaignData.callouts) ? campaignData.callouts : [];
  const assetCreates: Array<{ kind: "SITELINK" | "CALLOUT"; create: any }> = [];
  sitelinks.forEach((s: any, i: number) => {
    const linkText = String(s?.text || "").slice(0, 25).trim();
    if (!linkText) return;
    assetCreates.push({
      kind: "SITELINK",
      create: {
        name: `Sitelink ${i + 1} ${cleanCampaignName}`.slice(0, 100),
        type: "SITELINK",
        sitelinkAsset: {
          linkText,
          description1: String(s?.description1 || "").slice(0, 35),
          description2: String(s?.description2 || "").slice(0, 35),
          finalUrls: [website],
        },
      },
    });
  });
  callouts.forEach((c: any, i: number) => {
    const calloutText = String(c || "").slice(0, 25).trim();
    if (!calloutText) return;
    assetCreates.push({
      kind: "CALLOUT",
      create: {
        name: `Callout ${i + 1} ${cleanCampaignName}`.slice(0, 100),
        type: "CALLOUT",
        calloutAsset: { calloutText },
      },
    });
  });
  return assetCreates;
}
