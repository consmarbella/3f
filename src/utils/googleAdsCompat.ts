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
