/**
 * GoogleAdsGenerationSpec v3 — NÚCLEO DE PRODUCTO (no librería aislada).
 *
 * Contexto de diseño (explícito):
 *   1. Un LLM genera campañas completas de Google Ads (Search + Manual CPC + PAUSED).
 *   2. La plataforma normaliza TODO antes de tocar el API.
 *   3. La plataforma publica SOLO lo compatible.
 *   4. El usuario NUNCA debe recibir cientos de errores de Google Ads por campos
 *      incompatibles: cada problema de contenido se corrige o se omite aquí.
 *
 * La spec es la ÚNICA fuente de verdad de tres roles:
 *   (a) GENERATION  -> getGenerationContract()  (restricciones inyectadas al prompt del LLM)
 *   (b) NORMALIZE   -> runPreflight()          (corrige / omite / clasifica)
 *   (c) PUBLISH     -> buildPublishPlan()      (payloads v25 completos, sin defaults por inventar)
 *
 * Clasificación de errores (regla de producto):
 *   STRUCTURAL -> bloquea el publish (rompe la estructura mínima de campaña).
 *                 NO se autocorrige, NO se omite: requiere intervención/regeneración.
 *   CONTENT    -> se corrige (normalize) o se omite (omittedItems). NUNCA bloquea.
 *
 * El adapter NO reinterpretta reglas, NO inventa defaults, NO re-valida:
 * consume PublishPlan tal cual (métodos REST, orden, payloads y resource names resueltos).
 *
 * Tres niveles de regla (nunca mezclar):
 *   [OFFICIAL] regla dura publicada por Google (fuente citada).
 *   [PLATFORM] default seguro de esta plataforma; Google no publica el límite.
 *   [CONFIG]   configurable por cuenta/moneda/tenant; la spec no inventa el valor.
 *
 * Fuentes oficiales (verificadas 2026-09-24):
 *  - https://developers.google.com/google-ads/api/docs/best-practices/system-limits
 *  - https://developers.google.com/google-ads/api/docs/common-errors
 *  - https://developers.google.com/google-ads/api/docs/responsive-search-ads/create-responsive-search-ads
 *  - https://developers.google.com/google-ads/api/docs/mutating/best-practices
 *  - https://developers.google.com/google-ads/api/reference/rpc/v25/Campaign
 *  - https://developers.google.com/google-ads/api/reference/rpc/v25/CampaignBudget
 *  - https://developers.google.com/google-ads/api/reference/rpc/v25/AdGroup
 *  - https://support.google.com/google-ads/answer/7684791
 *  - https://developers.google.com/google-ads/api/docs/targeting/location-targeting
 */

// ============================================================
// 0. Configuración (PLATFORM + CONFIG)
// ============================================================

export interface SpecConfig {
  keyword: {
    /** [CONFIG] Google NO publica límite exacto de palabras. Default 10. Ajustable. */
    maxWords: number;
    /** [PLATFORM] Sanitización extra a los chars oficiales (! @ % *). */
    extendedInvalidChars: RegExp;
    /** [CONFIG] Comas -> espacio. Default true. */
    stripCommas: boolean;
    dedupeCaseInsensitive: boolean;
  };
  money: {
    /** [CONFIG] Unidad facturable EN MICROS, leída de la cuenta. Ej: USD cent = 10_000; CLP = 1_000_000. */
    billableUnitMicros: number;
    /** [PLATFORM] Bid mínimo por defecto si el LLM no entrega bid (en múltiplos de unidad). */
    defaultAdGroupBidMicros: number;
  };
  rsa: { truncateText: boolean };
  naming: {
    /** [PLATFORM] Suavizar colisiones de nombres (DUPLICATE_CAMPAIGN_NAME / DUPLICATE_ADGROUP_NAME). */
    uniqueSuffixStrategy: 'timestamp' | 'uuid' | 'none';
  };
}

export const DEFAULT_SPEC_CONFIG: SpecConfig = {
  keyword: {
    maxWords: 10,
    extendedInvalidChars: /["'\[\]{}()<>|\\+*=~^]/gu,
    stripCommas: true,
    dedupeCaseInsensitive: true,
  },
  money: { billableUnitMicros: 10_000, defaultAdGroupBidMicros: 1_000_000 },
  rsa: { truncateText: true },
  naming: { uniqueSuffixStrategy: 'timestamp' },
};

// ============================================================
// 1. Reglas OFICIALES duras
// ============================================================

export const OFFICIAL = {
  campaignName: { maxChars: 256, error: 'StringLengthError.TOO_LONG' },
  adGroupName: { maxChars: 255, error: 'AdGroupError.INVALID_ADGROUP_NAME' },
  budgetName: { maxBytes: 255 },
  keywordText: { maxChars: 80, error: 'CriterionError.KEYWORD_TEXT_TOO_LONG' },
  keywordOfficialInvalidChars: /[!@%*]/,
  rsa: {
    headlines: { min: 3, max: 15, maxChars: 30 },
    descriptions: { min: 2, max: 4, maxChars: 90 },
    paths: { count: 2, maxChars: 15 },
    finalUrlBytes: 2084,
  },
  limits: {
    maxOperationsPerMutate: 10_000,
    sharedBudgetsPerAccount: 11_000,
    unsharedBudgetsPerAccount: 20_000,
  },
  /** Fecha de campaña v25: "yyyy-MM-dd HH:mm:ss" en TZ de la cuenta. */
  dateTimeFormat: /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/,
} as const;

// ============================================================
// 2. Tipos del spec (entrada del LLM)
// ============================================================

export type CampaignStatus = 'PAUSED' | 'ENABLED' | 'REMOVED';
export type KeywordMatchType = 'EXACT' | 'PHRASE' | 'BROAD';
export type ServedAssetFieldType =
  | 'HEADLINE_1' | 'HEADLINE_2' | 'HEADLINE_3' | 'DESCRIPTION_1' | 'DESCRIPTION_2';

export interface NetworkSettingsSpec {
  target_google_search: true;
  target_search_network: boolean;
  target_content_network: boolean;
  target_partner_search_network: false;
}

export interface BudgetSpec {
  amountMicros: number;
  deliveryMethod?: 'STANDARD';       // default STANDARD si falta
  explicitlyShared?: boolean;        // default false si falta
  name?: string;
}

export interface CampaignSpec {
  name: string;
  status: CampaignStatus;           // preflight fuerza PAUSED
  advertisingChannelType: 'SEARCH';
  manualCpc: { enhancedCpcEnabled: false };
  networkSettings: NetworkSettingsSpec;
  geoTargetTypeSetting?: { positive: 'PRESENCE_OR_INTEREST' | 'PRESENCE'; negative: 'PRESENCE' };
  startDateTime?: string;
  endDateTime?: string;
}

export interface AdGroupSpec {
  name: string;
  status: 'ENABLED' | 'PAUSED';
  type: 'SEARCH_STANDARD';
  cpcBidMicros?: number;             // default de CONFIG si falta
}

export interface KeywordSpec {
  text: string;
  matchType: KeywordMatchType;
  negative: boolean;
  status?: 'ENABLED' | 'PAUSED';    // default ENABLED
  cpcBidMicros?: number;
}

export interface AdTextAssetSpec { text: string; pinnedField?: ServedAssetFieldType; }

export interface RSASpec {
  finalUrls: string[];
  headlines: AdTextAssetSpec[];
  descriptions: AdTextAssetSpec[];
  path1?: string;
  path2?: string;
  status?: 'ENABLED' | 'PAUSED';   // default PAUSED
}

export type AssetSpec =
  | { type: 'SITELINK'; linkText: string; finalUrl: string; descriptionLine1?: string; descriptionLine2?: string }
  | { type: 'CALLOUT'; text: string }
  | { type: 'STRUCTURED_SNIPPET'; header: string; values: string[] }
  | { type: 'CALL'; countryCode: string; phone: string }
  | { type: 'PROMOTION'; promotionText: string };

export interface TargetingSpec {
  /** Resource names RESUELTOS por GeoTargetConstantService.SuggestGeoTargetConstants. NUNCA inventados. */
  locations: { geoTargetConstantResourceName: string; negative: boolean }[];
  campaignNegativeKeywords: string[];
}

export interface AdGroupUnit {
  adGroup: AdGroupSpec;
  keywords: KeywordSpec[];
  ads: RSASpec[];
}

export interface GoogleAdsGenerationSpec {
  customerId: string;      // 10 dígitos sin guiones; REQUIRED
  currencyCode: string;     // ISO 4217; se lee/verifica contra la cuenta antes del publish
  budget: BudgetSpec;
  campaign: CampaignSpec;
  targeting: TargetingSpec;
  assets: AssetSpec[];
  adGroups: AdGroupUnit[];
}

// ============================================================
// 3. Contratos de resultado
// ============================================================

/** Regla de producto: dos clases de error, NUNCA mezclar. */
export type ErrorClass = 'STRUCTURAL' | 'CONTENT';
export type Action = 'kept' | 'normalized' | 'omitted' | 'failed';
export type RuleTier = 'OFFICIAL' | 'PLATFORM' | 'CONFIG';

export interface ValidationIssue {
  field: string;
  rule: string;
  tier: RuleTier;
  errorClass: ErrorClass;   // STRUCTURAL bloquea publish; CONTENT nunca
  errorCode: string;
  action: Action;
  before?: string;
  after?: string;
}

export interface OmittedItem {
  kind: 'keyword' | 'rsa' | 'asset' | 'location' | 'adGroup';
  ref: string;
  reason: string;
  errorCode: string;
}

export interface PreflightResult {
  /** true => existe un plan publicable (aunque haya habido omisiones de contenido). */
  publishable: boolean;
  /** Estructura 100% compatible: lo único que el publish consume. */
  normalizedSpec: GoogleAdsGenerationSpec;
  /** Mutates v25 listos para el adapter (0, 1 o varios batches). */
  plan: PublishPlan | null;
  /** Auditoría completa. */
  issues: ValidationIssue[];
  correctionsApplied: ValidationIssue[];
  omittedItems: OmittedItem[];
  /** Solo errores STRUCTURAL (los que bloquearon, si hay). */
  blockingIssues: ValidationIssue[];
}

// ---------- Salida adapter-ready: el adapter NO decide nada ----------

export interface MutationRequest {
  /** Servicio gRPC/REST al que va el batch. */
  service: 'CampaignBudgetService' | 'CampaignService' | 'AdGroupService'
         | 'AdGroupCriterionService' | 'AdGroupAdService' | 'CampaignCriterionService'
         | 'AssetService' | 'CampaignAssetService';
  /** Path REST v25 listo para POST. */
  restPath: string;
  /** Operaciones JSON completas (ya normalizadas, defaults aplicados). */
  operations: Record<string, unknown>[];
}

export interface PublishPlan {
  customerId: string;
  /** Batches en ORDEN DE DEPENDENCIA. Cada batch <= limite de ops. */
  batches: MutationRequest[];
  /** Mapa de IDs temporales asignados (auditoría / debugging). */
  tempIds: Record<string, string>;
  /** Header requerido si se opera vía manager account. */
  loginCustomerId?: string;
}

// ============================================================
// 4. Normalizadores atómicos
// ============================================================

export function collapseWhitespace(s: string): string { return s.replace(/\s+/g, ' ').trim(); }
export function stripForbiddenNameChars(s: string): string { return s.replace(/[\u0000\u000A\u000D]/g, ''); }

export function sanitizeKeywordText(raw: string, cfg: SpecConfig): string | null {
  let t = collapseWhitespace(raw)
    .replace(/^[+\["]+|[+\]"]+$/g, '')
    .replace(cfg.keyword.stripCommas ? /[,]/g : '', ' ')
    .replace(OFFICIAL.keywordOfficialInvalidChars, ' ')   // [OFFICIAL] ! @ % *
    .replace(cfg.keyword.extendedInvalidChars, ' ');
  t = collapseWhitespace(t);
  return t.length > 0 ? t : null;
}

/** [CONFIG] floor SIEMPRE al múltiplo de la unidad facturable. Nunca redondeo hacia arriba. */
export function normalizeCpcBidMicros(valueMicros: number, billableUnitMicros: number): number {
  if (!Number.isFinite(valueMicros) || valueMicros <= 0 || billableUnitMicros <= 0) return 0;
  return Math.floor(valueMicros / billableUnitMicros) * billableUnitMicros;
}

/** [OFFICIAL] Doble ancho cuenta como 2 (regla RSA de soporte). */
export function charLen(s: string): number {
  let n = 0;
  for (const ch of s) { const cp = ch.codePointAt(0)!; n += cp > 0x2e7f ? 2 : 1; }
  return n;
}

// ============================================================
// 5. Validadores por entidad (corrigen, omiten o clasifican STRUCTURAL)
// ============================================================

interface Ctx { cfg: SpecConfig; issues: ValidationIssue[]; }

function issue(field: string, rule: string, tier: RuleTier, errorClass: ErrorClass, errorCode: string, action: Action, before?: string, after?: string): ValidationIssue {
  return { field, rule, tier, errorClass, errorCode, action, before, after };
}

// -------- Campaign: TODO es corregible salvo fechas malformadas --------
export function validateAndNormalizeCampaign(c: CampaignSpec, ctx: Ctx): CampaignSpec {
  const name = collapseWhitespace(stripForbiddenNameChars(c.name)).slice(0, OFFICIAL.campaignName.maxChars);
  if (name !== c.name) ctx.issues.push(issue('campaign.name', `<= ${OFFICIAL.campaignName.maxChars} chars`, 'OFFICIAL', 'CONTENT',
    'StringLengthError.TOO_LONG', 'normalized', c.name, name));
  if (c.status !== 'PAUSED') ctx.issues.push(issue('campaign.status', 'nacer PAUSED (invariante de producto)', 'PLATFORM', 'CONTENT',
    'PLATFORM_INVARIANT', 'normalized', c.status, 'PAUSED'));
  const fixed: NetworkSettingsSpec = {
    target_google_search: true,
    target_search_network: c.networkSettings?.target_search_network ?? false,
    target_content_network: c.networkSettings?.target_content_network ?? false,
    target_partner_search_network: false,
  };
  if (JSON.stringify(fixed) !== JSON.stringify(c.networkSettings ?? null)) ctx.issues.push(issue(
    'campaign.network_settings', 'target_google_search=true, target_partner_search_network=false', 'OFFICIAL', 'CONTENT',
    'OPERATION_NOT_PERMITTED', 'normalized', JSON.stringify(c.networkSettings), JSON.stringify(fixed)));
  if (c.startDateTime && !OFFICIAL.dateTimeFormat.test(c.startDateTime)) ctx.issues.push(issue(
    'campaign.start_date_time', 'yyyy-MM-dd HH:mm:ss en TZ de la cuenta', 'OFFICIAL', 'STRUCTURAL',
    'RequestError.INVALID_STRING_VALUE', 'failed', c.startDateTime));
  if (c.endDateTime && !OFFICIAL.dateTimeFormat.test(c.endDateTime)) ctx.issues.push(issue(
    'campaign.end_date_time', 'yyyy-MM-dd HH:mm:ss en TZ de la cuenta', 'OFFICIAL', 'STRUCTURAL',
    'RequestError.INVALID_STRING_VALUE', 'failed', c.endDateTime));
  if (c.startDateTime && c.endDateTime && c.endDateTime <= c.startDateTime) ctx.issues.push(issue(
    'campaign.end_date_time', 'end > start', 'OFFICIAL', 'STRUCTURAL',
    'CampaignError.INVALID_START_DATE_TIME', 'failed'));
  return {
    ...c, name, status: 'PAUSED', advertisingChannelType: 'SEARCH',
    manualCpc: { enhancedCpcEnabled: false },
    networkSettings: fixed,
  };
}

// -------- Budget: el único fail CONTENT->STRUCTURAL por dinero --------
export function validateAndNormalizeBudget(b: BudgetSpec, ctx: Ctx): BudgetSpec | null {
  const unit = ctx.cfg.money.billableUnitMicros;
  const amount = normalizeCpcBidMicros(b.amountMicros ?? 0, unit);
  if (amount < unit) {  // [OFFICIAL] no publicable sin presupuesto válido
    ctx.issues.push(issue('budget.amount_micros', `>= unidad facturable (${unit} micros)`, 'OFFICIAL', 'STRUCTURAL',
      'CampaignBudgetError.MONEY_AMOUNT_LESS_THAN_CURRENCY_MINIMUM_CPC', 'failed', String(b.amountMicros), String(amount)));
    return null;
  }
  if (amount !== b.amountMicros) ctx.issues.push(issue('budget.amount_micros', 'múltiplo de unidad facturable (floor)', 'CONFIG', 'CONTENT',
    'CampaignBudgetError.NON_MULTIPLE_OF_MINIMUM_CURRENCY_UNIT', 'normalized', String(b.amountMicros), String(amount)));
  let name: string | undefined;
  if (b.explicitlyShared) {
    name = collapseWhitespace(stripForbiddenNameChars(b.name ?? '')).slice(0, OFFICIAL.budgetName.maxBytes) || undefined;
    if (!name) ctx.issues.push(issue('budget.name', 'requerido si compartido', 'OFFICIAL', 'STRUCTURAL',
      'RequestError.REQUIRED_FIELD_MISSING', 'failed'));
  }
  return { amountMicros: amount, deliveryMethod: 'STANDARD', explicitlyShared: b.explicitlyShared ?? false, name };
}

// -------- AdGroup: bid default + nombre truncado, nunca fail --------
export function validateAndNormalizeAdGroup(g: AdGroupSpec, ctx: Ctx): AdGroupSpec {
  const name = collapseWhitespace(stripForbiddenNameChars(g.name)).slice(0, OFFICIAL.adGroupName.maxChars);
  if (name !== g.name) ctx.issues.push(issue('ad_group.name', `<= ${OFFICIAL.adGroupName.maxChars} chars`, 'OFFICIAL', 'CONTENT',
    'AdGroupError.INVALID_ADGROUP_NAME', 'normalized', g.name, name));
  let bid = g.cpcBidMicros !== undefined ? normalizeCpcBidMicros(g.cpcBidMicros, ctx.cfg.money.billableUnitMicros) : 0;
  if (g.cpcBidMicros === undefined) {
    bid = ctx.cfg.money.defaultAdGroupBidMicros;  // [PLATFORM] default, no STRUCTURAL
    ctx.issues.push(issue('ad_group.cpc_bid_micros', 'default de plataforma aplicado', 'PLATFORM', 'CONTENT',
      'PLATFORM_DEFAULT', 'normalized', String(g.cpcBidMicros), String(bid)));
  } else if (bid !== g.cpcBidMicros) {
    ctx.issues.push(issue('ad_group.cpc_bid_micros', 'múltiplo de unidad facturable (floor)', 'CONFIG', 'CONTENT',
      'BiddingError.BID_TOO_MANY_FRACTIONAL_DIGITS', 'normalized', String(g.cpcBidMicros), String(bid)));
  }
  return { name, status: g.status ?? 'ENABLED', type: 'SEARCH_STANDARD', cpcBidMicros: bid };
}

// -------- Keyword: cualquier problema -> OMITIDA (CONTENT) --------
export function validateAndNormalizeKeyword(
  k: KeywordSpec, ctx: Ctx,
): { keyword: KeywordSpec | null; omitted?: OmittedItem } {
  const text = sanitizeKeywordText(k.text, ctx.cfg);
  if (text === null) return { keyword: null,
    omitted: { kind: 'keyword', ref: k.text, reason: 'vacía tras sanitización', errorCode: 'AdGroupCriterionError.INVALID_KEYWORD_TEXT' } };
  if (text !== k.text) ctx.issues.push(issue('keyword.text', 'sanitizada (operadores, comas, chars inválidos, espacios)', 'PLATFORM', 'CONTENT',
    'CriterionError.KEYWORD_HAS_INVALID_CHARS', 'normalized', k.text, text));
  if (charLen(text) > OFFICIAL.keywordText.maxChars) return { keyword: null,
    omitted: { kind: 'keyword', ref: text, reason: `> ${OFFICIAL.keywordText.maxChars} chars`, errorCode: OFFICIAL.keywordText.error } };
  const words = text.split(' ').length;
  if (words > ctx.cfg.keyword.maxWords) return { keyword: null,
    omitted: { kind: 'keyword', ref: text, reason: `${words} palabras > max ${ctx.cfg.keyword.maxWords}`, errorCode: 'KEYWORD_MAX_WORDS(CONFIG)' } };
  let cpcBidMicros: number | undefined;
  if (k.cpcBidMicros !== undefined) {
    const b = normalizeCpcBidMicros(k.cpcBidMicros, ctx.cfg.money.billableUnitMicros);
    if (b !== k.cpcBidMicros) ctx.issues.push(issue('keyword.cpc_bid_micros', 'múltiplo de unidad (floor)', 'CONFIG', 'CONTENT',
      'BiddingError.BID_TOO_MANY_FRACTIONAL_DIGITS', 'normalized', String(k.cpcBidMicros), String(b)));
    cpcBidMicros = b;
  }
  return { keyword: { text, matchType: k.matchType, negative: k.negative, status: k.status ?? 'ENABLED', cpcBidMicros } };
}

// -------- RSA: recorta, trunca, y si no llega al mínimo -> OMITIDO --------
export function validateAndNormalizeRSA(
  a: RSASpec, ctx: Ctx,
): { ad: RSASpec | null; omitted?: OmittedItem } {
  const R = OFFICIAL.rsa;
  const clip = (arr: AdTextAssetSpec[], max: number, hardMax: number, field: string) => {
    const kept: AdTextAssetSpec[] = [];
    for (const h of arr) {
      const text = collapseWhitespace(h.text);
      if (!text) continue;
      if (charLen(text) > max) {
        const t = ctx.cfg.rsa.truncateText ? [...text].slice(0, max).join('') : text;
        if (!ctx.cfg.rsa.truncateText) continue;
        ctx.issues.push(issue(field, `<= ${max} chars`, 'OFFICIAL', 'CONTENT',
          'AdError.LINE_TOO_WIDE', 'normalized', text, t));
        kept.push({ ...h, text: t });
      } else kept.push({ ...h, text });
    }
    return kept.slice(0, hardMax);  // recorte al máximo permitido
  };
  const headlines = clip(a.headlines, R.headlines.maxChars, R.headlines.max, 'rsa.headlines[].text');
  const descriptions = clip(a.descriptions, R.descriptions.maxChars, R.descriptions.max, 'rsa.descriptions[].text');

  const url = (a.finalUrls[0] ?? '').trim();
  const urlOk = /^https?:\/\/[^\s]+$/i.test(url) && Buffer.byteLength(url, 'utf8') <= R.finalUrlBytes;
  if (!urlOk) ctx.issues.push(issue('ad.final_urls', 'protocolo http(s) y <= 2084 bytes', 'OFFICIAL', 'CONTENT',
    'UrlFieldError', 'omitted', url));
  if (headlines.length < R.headlines.min || descriptions.length < R.descriptions.min || !urlOk) {
    return { ad: null, omitted: { kind: 'rsa', ref: url || '(sin url)',
      reason: headlines.length < R.headlines.min ? `headlines < ${R.headlines.min}`
        : descriptions.length < R.descriptions.min ? `descriptions < ${R.descriptions.min}` : 'final_url inválida',
      errorCode: 'REQUIRED_FIELD_MISSING' } };
  }
  return {
    ad: {
      finalUrls: [url], headlines, descriptions,
      path1: a.path1 ? [...collapseWhitespace(a.path1)].slice(0, R.paths.maxChars).join('') : undefined,
      path2: a.path2 ? [...collapseWhitespace(a.path2)].slice(0, R.paths.maxChars).join('') : undefined,
      status: a.status ?? 'PAUSED',
    },
  };
}

// -------- Asset: inválido -> OMITIDO (CONTENT) --------
export function validateAndNormalizeAsset(a: AssetSpec, ctx: Ctx): { asset: AssetSpec | null; omitted?: OmittedItem } {
  const omit = (reason: string) => ({ asset: null, omitted: { kind: 'asset' as const, ref: JSON.stringify(a).slice(0, 80), reason, errorCode: 'ASSET_INVALID' } });
  switch (a.type) {
    case 'SITELINK': {
      const linkText = collapseWhitespace(a.linkText).slice(0, 25);  // [PLATFORM] verificar soporte
      if (!linkText) return omit('link_text vacío');
      if (!/^https?:\/\/[^\s]+$/i.test(a.finalUrl)) return omit('final_url inválida');
      return { asset: { ...a, linkText, finalUrl: a.finalUrl.trim(),
        descriptionLine1: a.descriptionLine1?.slice(0, 35), descriptionLine2: a.descriptionLine2?.slice(0, 35) } };
    }
    case 'CALLOUT': {
      const text = collapseWhitespace(a.text).slice(0, 25);          // [PLATFORM]
      if (!text) return omit('texto vacío');
      return { asset: { type: 'CALLOUT', text } };
    }
    case 'STRUCTURED_SNIPPET': {
      const values = a.values.map(v => collapseWhitespace(v).slice(0, 25)).filter(Boolean);
      if (!a.header || !values.length) return omit('header o values vacíos');
      return { asset: { type: 'STRUCTURED_SNIPPET', header: a.header, values } };
    }
    case 'CALL': {
      if (!/^\+[1-9]\d{6,15}$/.test(a.phone)) return omit('phone no E.164');
      if (!/^[A-Z]{2}$/.test(a.countryCode)) return omit('country_code ISO alpha-2');
      return { asset: { type: 'CALL', countryCode: a.countryCode, phone: a.phone } };
    }
    case 'PROMOTION': {
      const promotionText = collapseWhitespace(a.promotionText);
      if (!promotionText) return omit('promotion_text vacío');
      return { asset: { type: 'PROMOTION', promotionText } };
    }
  }
}

// ============================================================
// 6. runPreflight — normaliza, clasifica y construye el plan
// ============================================================

export function runPreflight(spec: GoogleAdsGenerationSpec, cfg: SpecConfig = DEFAULT_SPEC_CONFIG): PreflightResult {
  const issues: ValidationIssue[] = [];
  const omittedItems: OmittedItem[] = [];
  const ctx: Ctx = { cfg, issues };

  // --- STRUCTURAL: identidad de cuenta (no autocorregible) ---
  if (!/^\d{10}$/.test(spec.customerId)) issues.push(issue('spec.customerId', '10 dígitos sin guiones', 'PLATFORM', 'STRUCTURAL',
    'RequestError.INVALID_CUSTOMER_ID', 'failed', spec.customerId));
  if (!/^[A-Z]{3}$/.test(spec.currencyCode)) issues.push(issue('spec.currencyCode', 'ISO 4217 requerido (leer de la cuenta)', 'PLATFORM', 'STRUCTURAL',
    'CURRENCY_MISMATCH', 'failed', spec.currencyCode));

  const campaign = validateAndNormalizeCampaign(spec.campaign, ctx);
  const budget = validateAndNormalizeBudget(spec.budget, ctx);

  // --- Ad groups + contenido: corregir u omitir, NUNCA fail global por contenido ---
  const adGroups: AdGroupUnit[] = [];
  const nameUniquifier = cfg.naming.uniqueSuffixStrategy === 'timestamp'
    ? ` #${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}` : '';
  const adGroupNames = new Set<string>();
  for (const g of spec.adGroups) {
    let ag = validateAndNormalizeAdGroup(g.adGroup, ctx);
    if (adGroupNames.has(ag.name)) {  // [PLATFORM] desambiguación proactiva
      ag = { ...ag, name: `${ag.name}${nameUniquifier}` };
      issues.push(issue('ad_group.name', 'sufijo único aplicado (duplicado interno)', 'PLATFORM', 'CONTENT',
        'AdGroupError.DUPLICATE_ADGROUP_NAME', 'normalized', g.adGroup.name, ag.name));
    }
    adGroupNames.add(ag.name);
    const seen = new Set<string>();
    const keywords: KeywordSpec[] = [];
    for (const k of g.keywords) {
      const r = validateAndNormalizeKeyword(k, ctx);
      if (r.omitted) { omittedItems.push(r.omitted); continue; }
      const key = `${r.keyword!.negative}:${r.keyword!.matchType}:${cfg.keyword.dedupeCaseInsensitive ? r.keyword!.text.toLowerCase() : r.keyword!.text}`;
      if (seen.has(key)) {
        omittedItems.push({ kind: 'keyword', ref: r.keyword!.text, reason: 'duplicada (texto+matchType+negative)', errorCode: 'DistinctError.DUPLICATE_ELEMENT' });
        continue;
      }
      seen.add(key); keywords.push(r.keyword!);
    }
    const ads: RSASpec[] = [];
    for (const ad of g.ads) {
      const r = validateAndNormalizeRSA(ad, ctx);
      if (r.omitted) omittedItems.push(r.omitted); else ads.push(r.ad!);
    }
    if (!keywords.length || !ads.length) {  // ad group inviable -> omitido (contenido)
      omittedItems.push({ kind: 'adGroup', ref: ag.name, reason: 'sin keywords o sin ads tras preflight', errorCode: 'PLATFORM_INVARIANT' });
      continue;
    }
    adGroups.push({ adGroup: ag, keywords, ads });
  }

  // --- STRUCTURAL: sin estructura mínima no hay nada publicable ---
  if (!adGroups.length) issues.push(issue('spec.adGroups', 'ningún ad group sobrevivió al preflight', 'PLATFORM', 'STRUCTURAL',
    'NO_PUBLISHABLE_STRUCTURE', 'failed'));

  const assets: AssetSpec[] = [];
  for (const a of spec.assets) {
    const r = validateAndNormalizeAsset(a, ctx);
    if (r.omitted) omittedItems.push(r.omitted); else assets.push(r.asset!);
  }
  const locations = spec.targeting.locations.filter(l => /^geoTargetConstants\/\d+$/.test(l.geoTargetConstantResourceName));

  const normalizedSpec: GoogleAdsGenerationSpec = {
    ...spec, campaign, budget: budget ?? spec.budget, adGroups, assets,
    targeting: { locations, campaignNegativeKeywords: spec.targeting.campaignNegativeKeywords },
  };

  const blockingIssues = issues.filter(i => i.errorClass === 'STRUCTURAL');
  const publishable = blockingIssues.length === 0 && budget !== null && adGroups.length > 0;

  return {
    publishable,
    normalizedSpec,
    plan: publishable ? buildPublishPlan(normalizedSpec) : null,
    issues,
    correctionsApplied: issues.filter(i => i.action === 'normalized'),
    omittedItems,
    blockingIssues,
  };
}

// ============================================================
// 7. buildPublishPlan — output adapter-ready (el adapter NO decide)
// ============================================================

export function buildPublishPlan(spec: GoogleAdsGenerationSpec, loginCustomerId?: string): PublishPlan {
  const cid = spec.customerId;
  const tempIds: Record<string, string> = {};
  let nextTempId = 0;
  const temp = (kind: string) => {
    nextTempId -= 1;
    const rn = `customers/${cid}/${kind}/${nextTempId}`;
    return rn;
  };

  // Budget y campaign con IDs temporales (referenciados por todo lo demás)
  const budgetRn = spec.budget.explicitlyShared && spec.budget.name
    ? `customers/${cid}/campaignBudgets/${nextTempId - 1}` : temp('campaignBudgets');
  tempIds['budget'] = budgetRn;
  const campaignRn = temp('campaigns');
  tempIds['campaign'] = campaignRn;

  const batches: MutationRequest[] = [];

  // 1) CampaignBudget
  const budgetOp: Record<string, unknown> = {
    resourceName: budgetRn,
    amountMicros: String(spec.budget.amountMicros),
    deliveryMethod: spec.budget.deliveryMethod,
    explicitlyShared: spec.budget.explicitlyShared,
  };
  if (spec.budget.explicitlyShared && spec.budget.name) budgetOp.name = spec.budget.name;
  batches.push({ service: 'CampaignBudgetService',
    restPath: `/v25/customers/${cid}/campaignBudgets:mutate`, operations: [{ create: budgetOp }] });

  // 2) Campaign (PAUSED + SEARCH + manual_cpc eCPC off)
  const campaignOp: Record<string, unknown> = {
    resourceName: campaignRn,
    name: spec.campaign.name,
    advertisingChannelType: 'SEARCH',
    status: 'PAUSED',
    campaignBudget: budgetRn,
    manualCpc: { enhancedCpcEnabled: false },
    networkSettings: {
      targetGoogleSearch: true,
      targetSearchNetwork: spec.campaign.networkSettings.target_search_network,
      targetContentNetwork: spec.campaign.networkSettings.target_content_network,
      targetPartnerSearchNetwork: false,
    },
    geoTargetTypeSetting: { positiveGeoTargetType: 'PRESENCE_OR_INTEREST', negativeGeoTargetType: 'PRESENCE' },
  };
  if (spec.campaign.startDateTime) campaignOp.startDateTime = spec.campaign.startDateTime;
  if (spec.campaign.endDateTime) campaignOp.endDateTime = spec.campaign.endDateTime;
  batches.push({ service: 'CampaignService',
    restPath: `/v25/customers/${cid}/campaigns:mutate`, operations: [{ create: campaignOp }] });

  // 3) CampaignCriteria: ubicaciones (positivas/negativas) + keywords negativas de campaña
  const criterionOps: Record<string, unknown>[] = [];
  for (const loc of spec.targeting.locations) {
    criterionOps.push({ create: {
      campaign: campaignRn, negative: loc.negative,
      location: { geoTargetConstant: loc.geoTargetConstantResourceName } } });
  }
  // NOTA: NO se emite CampaignCriterion.language en Search (ContextError desde sept-2026).
  batches.push({ service: 'CampaignCriterionService',
    restPath: `/v25/customers/${cid}/campaignCriteria:mutate`, operations: criterionOps });

  // 4) Por ad group: AdGroup -> AdGroupCriteria (keywords) -> AdGroupAds (RSA)
  let adGroupCriterionOps: Record<string, unknown>[] = [];
  let adGroupAdOps: Record<string, unknown>[] = [];
  for (const g of spec.adGroups) {
    const adGroupRn = temp('adGroups');
    tempIds[`adGroup:${g.adGroup.name}`] = adGroupRn;
    batches.push({ service: 'AdGroupService',
      restPath: `/v25/customers/${cid}/adGroups:mutate`,
      operations: [{ create: {
        resourceName: adGroupRn, name: g.adGroup.name, campaign: campaignRn,
        status: g.adGroup.status, type: 'SEARCH_STANDARD',
        cpcBidMicros: String(g.adGroup.cpcBidMicros) } }] });

    for (const k of g.keywords) {
      const kwOp: Record<string, unknown> = { create: {
        adGroup: adGroupRn, status: k.status, negative: k.negative,
        keyword: { text: k.text, matchType: k.matchType } } };
      if (k.cpcBidMicros !== undefined) (kwOp.create as any).cpcBidMicros = String(k.cpcBidMicros);
      adGroupCriterionOps.push(kwOp);
    }
    for (const ad of g.ads) {
      adGroupAdOps.push({ create: {
        adGroup: adGroupRn, status: ad.status,
        ad: {
          finalUrls: ad.finalUrls,
          responsiveSearchAd: {
            headlines: ad.headlines.map(h => h.pinnedField
              ? { text: h.text, pinnedField: h.pinnedField } : { text: h.text }),
            descriptions: ad.descriptions.map(d => d.pinnedField
              ? { text: d.text, pinnedField: d.pinnedField } : { text: d.text }),
            ...(ad.path1 ? { path1: ad.path1 } : {}),
            ...(ad.path2 ? { path2: ad.path2 } : {}),
          },
        } } });
    }
  }
  batches.push({ service: 'AdGroupCriterionService',
    restPath: `/v25/customers/${cid}/adGroupCriteria:mutate`, operations: adGroupCriterionOps });
  batches.push({ service: 'AdGroupAdService',
    restPath: `/v25/customers/${cid}/adGroupAds:mutate`, operations: adGroupAdOps });

  // 5) Assets + vínculos a campaign
  if (spec.assets.length) {
    const assetOps: Record<string, unknown>[] = [];
    const linkOps: Record<string, unknown>[] = [];
    const fieldType: Record<string, string> = {
      SITELINK: 'SITELINK', CALLOUT: 'CALLOUT', STRUCTURED_SNIPPET: 'STRUCTURED_SNIPPET',
      CALL: 'CALL', PROMOTION: 'PROMOTION',
    };
    for (const a of spec.assets) {
      const assetRn = temp('assets');
      tempIds[`asset:${a.type}`] = assetRn;
      const create: Record<string, unknown> = { resourceName: assetRn };
      switch (a.type) {
        case 'SITELINK': create.sitelinkAsset = { linkText: a.linkText, finalUrls: [a.finalUrl],
          ...(a.descriptionLine1 ? { description1: a.descriptionLine1 } : {}),
          ...(a.descriptionLine2 ? { description2: a.descriptionLine2 } : {}) }; break;
        case 'CALLOUT': create.calloutAsset = { calloutText: a.text }; break;
        case 'STRUCTURED_SNIPPET': create.structuredSnippetAsset = { header: a.header, values: a.values }; break;
        case 'CALL': create.callAsset = { countryCode: a.countryCode, phone: a.phone }; break;
        case 'PROMOTION': create.promotionAsset = { promotionText: a.promotionText }; break;
      }
      assetOps.push({ create });
      linkOps.push({ create: { asset: assetRn, campaign: campaignRn, fieldType: fieldType[a.type] } });
    }
    batches.push({ service: 'AssetService',
      restPath: `/v25/customers/${cid}/assets:mutate`, operations: assetOps });
    batches.push({ service: 'CampaignAssetService',
      restPath: `/v25/customers/${cid}/campaignAssets:mutate`, operations: linkOps });
  }

  // 6) Partición por límite oficial de operaciones (adapter no necesita dividir)
  const MAX = OFFICIAL.limits.maxOperationsPerMutate;
  const partitioned: MutationRequest[] = [];
  for (const b of batches) {
    for (let i = 0; i < b.operations.length; i += MAX) {
      partitioned.push({ ...b, operations: b.operations.slice(i, i + MAX) });
    }
  }
  return { customerId: cid, batches: partitioned.filter(b => b.operations.length > 0), tempIds,
    ...(loginCustomerId ? { loginCustomerId } : {}) };
}

// ============================================================
// 8. Contrato de GENERACIÓN (para inyectar al prompt del LLM)
// ============================================================

/**
 * Devuelve las restricciones como objeto JSON-serializable.
 * Uso: system prompt del LLM = "genera un GoogleAdsGenerationSpec que cumpla
 * EXACTAMENTE estas restricciones; cualquier valor fuera de ellas será
 * corregido o eliminado por la plataforma sin preguntar".
 */
export function getGenerationContract(cfg: SpecConfig = DEFAULT_SPEC_CONFIG) {
  return {
    product: 'Google Ads Search Campaign, Manual CPC, nace PAUSED',
    hardRules: {
      campaign: {
        status: ['PAUSED'],
        advertisingChannelType: ['SEARCH'],
        manualCpc: { enhancedCpcEnabled: false },
        networkSettings: { target_google_search: true, target_partner_search_network: false,
          configurable: ['target_search_network', 'target_content_network'] },
        nameMaxChars: OFFICIAL.campaignName.maxChars,
        dateTimeFormat: 'yyyy-MM-dd HH:mm:ss',
        forbidden: ['language targeting (no aplicar: los ads matchean por idioma del anuncio)'],
      },
      budget: {
        unitMicros: cfg.money.billableUnitMicros,
        deliveryMethod: ['STANDARD'],
        explicitlySharedDefault: false,
        rule: 'amountMicros debe ser múltiplo de la unidad facturable y >= unidad mínima',
      },
      adGroup: {
        type: ['SEARCH_STANDARD'], nameMaxChars: OFFICIAL.adGroupName.maxChars,
        cpcBidMicros: 'múltiplo de unidad facturable', defaultBidMicros: cfg.money.defaultAdGroupBidMicros,
      },
      keywords: {
        matchTypes: ['EXACT', 'PHRASE', 'BROAD'],
        text: {
          maxChars: OFFICIAL.keywordText.maxChars,
          maxWords: cfg.keyword.maxWords,
          forbiddenChars: ['!', '@', '%', '*', '"', "'", '[', ']', '{', '}', '(', ')', '<', '>', '|', '\\', '+', '=', '*', '~', '^', ','],
          matchTypeRepresented: 'en el enum matchType, NUNCA con símbolos en el texto (+, "", [])',
        },
      },
      rsa: {
        headlines: { min: 3, max: 15, maxChars: 30 },
        descriptions: { min: 2, max: 4, maxChars: 90 },
        paths: { count: 2, maxChars: 15 },
        finalUrls: { min: 1, protocol: 'http(s) requerido', maxBytes: 2084 },
        statusDefault: 'PAUSED',
      },
      targeting: {
        locations: 'solo nombres de lugares; la plataforma los resuelve con SuggestGeoTargetConstants (nunca IDs inventados)',
      },
    },
    behavioralContract: {
      inRange: 'genera solo valores dentro de estos límites y enums',
      outOfRange: 'la plataforma truncará (texto), omitirá (elementos inválidos) o aplicará defaults automáticamente',
      structure: 'budget + campaign + >=1 ad group con >=1 keyword y >=1 RSA',
    },
  } as const;
}

// ============================================================
// 9. TESTS OBLIGATORIOS
// ============================================================

export interface TestResult { name: string; pass: boolean; detail: string; }

export function runSpecTests(): TestResult[] {
  const cfg: SpecConfig = { ...DEFAULT_SPEC_CONFIG, money: { billableUnitMicros: 10_000, defaultAdGroupBidMicros: 1_000_000 } };
  const t: TestResult[] = [];
  const check = (name: string, cond: boolean, detail = '') => t.push({ name, pass: cond, detail });

  { const r = validateAndNormalizeKeyword({ text: '"zapatos! baratos% [ofertas]"', matchType: 'PHRASE', negative: false }, { cfg, issues: [] } as unknown as Ctx);
    check('keyword invalid chars', r.keyword !== null && r.keyword.text === 'zapatos baratos ofertas', `got: ${r.keyword?.text}`); }
  { const cases = [
      'abogados de accidentes de tráfico y lesiones personales en miami, florida, usa',
      'abogados de accidentes de tráfico y lesiones personales cerca de mi',
      'abogados de accidentes de tráfico y lesiones personales en mi zona'];
    cases.forEach((kw, i) => { const r = validateAndNormalizeKeyword({ text: kw, matchType: 'EXACT', negative: false }, { cfg, issues: [] } as unknown as Ctx);
      check(`keyword too many words #${i + 1}`, r.keyword === null && !!r.omitted, r.omitted?.reason ?? 'no omitida'); }); }
  { const r = validateAndNormalizeKeyword({ text: 'a'.repeat(81), matchType: 'BROAD', negative: false }, { cfg, issues: [] } as unknown as Ctx);
    check('keyword too long', r.keyword === null, r.omitted?.reason ?? ''); }
  { const ctx = { cfg, issues: [] } as unknown as Ctx;
    const r = validateAndNormalizeRSA({ finalUrls: ['https://x.cl/'], headlines: [{ text: 'A'.repeat(31), pinnedField: 'HEADLINE_1' }, { text: 'b' }, { text: 'c' }], descriptions: [{ text: 'd1' }, { text: 'd2' }] }, ctx);
    check('RSA headline >30 truncado', r.ad !== null && charLen(r.ad.headlines[0].text) === 30, ''); }
  { const ctx = { cfg, issues: [] } as unknown as Ctx;
    const r = validateAndNormalizeRSA({ finalUrls: ['https://x.cl/'], headlines: [{ text: 'a' }, { text: 'b' }], descriptions: [{ text: 'd1' }, { text: 'd2' }] }, ctx);
    check('RSA insufficient headlines -> omitted (CONTENT, no fail)', r.ad === null && ctx.issues.every(i => i.errorClass === 'CONTENT'), r.omitted?.reason ?? ''); }
  { const ctx = { cfg, issues: [] } as unknown as Ctx;
    const r = validateAndNormalizeRSA({ finalUrls: ['www.no-proto.cl'], headlines: [{ text: 'a' }, { text: 'b' }, { text: 'c' }], descriptions: [{ text: 'd1' }, { text: 'd2' }] }, ctx);
    check('RSA invalid final URL -> omitted', r.ad === null && !!r.omitted, r.omitted?.reason ?? ''); }
  { check('bid 1500000 unidad 1000000 -> 1000000', normalizeCpcBidMicros(1_500_000, 1_000_000) === 1_000_000, '');
    check('bid 1555555 unidad 10000 -> 1550000', normalizeCpcBidMicros(1_555_555, 10_000) === 1_550_000, '');
    check('bid 1500000 unidad 10000 -> igual', normalizeCpcBidMicros(1_500_000, 10_000) === 1_500_000, ''); }
  { const ctx = { cfg, issues: [] } as unknown as Ctx;
    const r = validateAndNormalizeCampaign({ ...baseCampaign(), status: 'ENABLED' } as CampaignSpec, ctx);
    check('campaign status -> PAUSED (corrección, no bloqueo)', r.status === 'PAUSED' && ctx.issues.every(i => i.errorClass === 'CONTENT'), ''); }
  { const ctx = { cfg, issues: [] } as unknown as Ctx;
    const r = validateAndNormalizeCampaign({ ...baseCampaign(), networkSettings: {
      target_google_search: true, target_search_network: true, target_content_network: true, target_partner_search_network: true } } as unknown as CampaignSpec, ctx);
    check('network incompatible -> normalizado', r.networkSettings.target_partner_search_network === false, ''); }
  { const ctx = { cfg, issues: [] } as unknown as Ctx;
    const r = validateAndNormalizeBudget({ amountMicros: 500 }, ctx);
    check('budget < minimo -> STRUCTURAL (bloquea publish)', r === null && ctx.issues.some(i => i.errorClass === 'STRUCTURAL'), ''); }
  { const spec = baseSpec();
    const pr = runPreflight({ ...spec, customerId: '12-345' }, cfg);
    check('customerId invalido -> publishable=false, plan=null', pr.publishable === false && pr.plan === null,
      pr.blockingIssues.map(b => b.errorCode).join(',')); }
  { const pr = runPreflight(baseSpec(), cfg);
    check('spec valida -> publishable + plan con batches en orden', pr.publishable && !!pr.plan &&
      pr.plan!.batches[0].service === 'CampaignBudgetService' &&
      pr.plan!.batches[1].service === 'CampaignService', `batches=${pr.plan?.batches.map(b => b.service).join('>')}`); }
  { const bad = baseSpec(); bad.adGroups[0].keywords = [
      { text: 'a'.repeat(81), matchType: 'EXACT', negative: false },
      { text: 'ok keyword', matchType: 'PHRASE', negative: false }];
    const pr = runPreflight(bad, cfg);
    check('keyword inválida -> omitted + campaign sigue publicable', pr.publishable && pr.omittedItems.length === 1, pr.omittedItems[0]?.reason ?? ''); }
  return t;
}

// helpers de tests
function baseCampaign(): CampaignSpec {
  return { name: 'Search Test', status: 'PAUSED', advertisingChannelType: 'SEARCH',
    manualCpc: { enhancedCpcEnabled: false },
    networkSettings: { target_google_search: true, target_search_network: false, target_content_network: false, target_partner_search_network: false } };
}
function baseSpec(): GoogleAdsGenerationSpec {
  return {
    customerId: '1234567890', currencyCode: 'CLP',
    budget: { amountMicros: 15_000_000, explicitlyShared: false },
    campaign: baseCampaign(),
    targeting: { locations: [{ geoTargetConstantResourceName: 'geoTargetConstants/2364', negative: false }], campaignNegativeKeywords: [] },
    assets: [{ type: 'CALLOUT', text: 'Atención 24/7' }],
    adGroups: [{
      adGroup: { name: 'AG1', status: 'ENABLED', type: 'SEARCH_STANDARD', cpcBidMicros: 1_000_000 },
      keywords: [{ text: 'abogado santiago', matchType: 'EXACT', negative: false }],
      ads: [{ finalUrls: ['https://www.ejemplo.cl/'], headlines: [{ text: 'h1' }, { text: 'h2' }, { text: 'h3' }],
        descriptions: [{ text: 'd1' }, { text: 'd2' }] }],
    }],
  };
}

// ============================================================
// 10. Bulk GoogleAdsService.Mutate (ejecutor masivo, all-or-nothing)
// ============================================================
//
// Convierte los batches del PublishPlan a UNA sola secuencia bulk con
// temp resource names. La plataforma ejecuta un solo POST a
// /v25/customers/{cid}/googleAds:mutate con partialFailure:false.
// El adapter NO decide nada: solo reenvuelve operaciones ya normalizadas.

/** Campo oneof de MutateOperation por servicio (nombres JSON REST v25). */
export const BULK_OPERATION_FIELD = {
  CampaignBudgetService: 'campaignBudgetOperation',
  CampaignService: 'campaignOperation',
  CampaignCriterionService: 'campaignCriterionOperation',
  AdGroupService: 'adGroupOperation',
  AdGroupCriterionService: 'adGroupCriterionOperation',
  AdGroupAdService: 'adGroupAdOperation',
  AssetService: 'assetOperation',
  CampaignAssetService: 'campaignAssetOperation',
} as const;

export type BulkService = keyof typeof BULK_OPERATION_FIELD;

export interface BulkMutateOperation {
  [field: string]: Record<string, unknown>;
}

export interface BulkMutateRequest {
  customerId: string;
  /** POST a este path: /v25/customers/{cid}/googleAds:mutate */
  restPath: string;
  partialFailure: false;
  mutateOperations: BulkMutateOperation[];
  /** Servicio de origen por índice de operación (agrupación de resultados/errores). */
  opServices: MutationRequest['service'][];
  loginCustomerId?: string;
}

export function toBulkMutateRequest(plan: PublishPlan): BulkMutateRequest {
  const mutateOperations: BulkMutateOperation[] = [];
  const opServices: MutationRequest['service'][] = [];
  for (const b of plan.batches) {
    const field = BULK_OPERATION_FIELD[b.service];
    for (const op of b.operations) {
      mutateOperations.push({ [field]: op });
      opServices.push(b.service);
    }
  }
  return {
    customerId: plan.customerId,
    restPath: `/v25/customers/${plan.customerId}/googleAds:mutate`,
    partialFailure: false,
    mutateOperations,
    opServices,
    ...(plan.loginCustomerId ? { loginCustomerId: plan.loginCustomerId } : {}),
  };
}
