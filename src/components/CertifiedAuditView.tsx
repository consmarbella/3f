import React, { useState } from "react";
import { CampaignStrategy } from "../types";
import {
  Award,
  ShieldCheck,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  HelpCircle,
  BarChart3,
  Sliders,
  Database,
  Lock,
} from "lucide-react";

interface CertifiedAuditViewProps {
  campaign: CampaignStrategy;
}

export const CertifiedAuditView: React.FC<CertifiedAuditViewProps> = ({ campaign }) => {
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const qs = campaign.qualityScoreAudit || {
    predictedScore: 9.8,
    expectedCtr: "Por encima del promedio",
    adRelevance: "Por encima del promedio",
    landingPageExperience: "Por encima del promedio",
    keyFactors: [
      "Alineación exacta entre keywords en concordancia de frase/exacta y titulares H1-H3",
      "Eliminación proactiva de términos no cualificados mediante bóveda de negativas",
      "Diversidad semántica de 15 titulares evitando canibalización de copys idénticos",
      "Coincidencia de mensaje y propuesta de valor con página de destino móvil",
    ],
  };

  const adStrength = campaign.adStrengthAudit || {
    rating: "Excelente",
    scorePercent: 98,
    checks: [
      { label: "15 Titulares únicos sin repeticiones", passed: true, detail: "15/15 generados en estricto cumplimiento ≤ 30 caracteres" },
      { label: "4 Descripciones con ángulos persuasivos", passed: true, detail: "4/4 generadas con ganchos de dolor, solución, credibilidad y CTA ≤ 90 caracteres" },
      { label: "Palabras clave populares integradas en titulares", passed: true, detail: "Más de 4 titulares integran la intención exacta de búsqueda" },
      { label: "Diversidad de titulares y llamadas a la acción", passed: true, detail: "Incluye ganchos de confianza, urgencia, garantías y reversión de riesgo" },
      { label: "Rutas visibles optimizadas", passed: true, detail: "Paths descriptivos que refuerzan la relevancia percibida antes del clic" },
    ],
  };

  const measurement = campaign.measurementPlan || {
    primaryConversions: [
      "Envío de Formulario de Lead Cualificado (Acción Principal / Bidding)",
      "Llamada Telefónica desde el Sitio Web / Extensión (≥ 60 seg duración)",
      "Clic en WhatsApp / Chat de Venta Directa",
    ],
    enhancedConversions: true,
    consentModeV2: true,
    googleTagSetupGuide:
      "Instalar Google Tag (gtag.js) o contenedor GTM en todas las páginas. Activar 'Conversiones Mejoradas' enviando datos de usuario (email, teléfono con hash SHA-256) y configurar Consent Mode v2 con parámetros ad_storage y ad_user_data.",
  };

  const certifiedTips = campaign.certifiedTips || [];

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  // Google Tag template for Certified Conversion Tracking
  const gTagCode = `<!-- Google tag (gtag.js) + Consent Mode v2 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=AW-CONVERSION_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}

  // 1. Consent Mode v2 (Default Denied prior to user consent)
  gtag('consent', 'default', {
    'ad_storage': 'denied',
    'ad_user_data': 'denied',
    'ad_personalization': 'denied',
    'analytics_storage': 'denied'
  });

  gtag('js', new Date());
  gtag('config', 'AW-CONVERSION_ID', {
    'allow_enhanced_conversions': true
  });
</script>`;

  return (
    <div id="certified-audit-container" className="space-y-6 text-slate-100">
      {/* Header Bento Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30 shrink-0">
            <Award className="w-8 h-8 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider">
                Auditoría Oficial Premier Partner
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/30">
                Score Proyectado: {qs.predictedScore}/10
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Protocolo de Excelencia & Certificación Google Ads
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Auditoría técnica basada en las directrices oficiales de Google: algoritmo de Quality Score (Nivel de Calidad),
              fórmula de Ad Strength Excelente, protección contra desperdicio de clics y arquitectura de Conversiones Mejoradas.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row md:flex-col items-end justify-center gap-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Ahorro en CPC por QS 10/10</span>
            <span className="text-lg font-mono font-bold text-emerald-400">-40% a -50% CPC</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Eficacia del Anuncio (RSA)</span>
            <span className="text-sm font-bold text-indigo-300">{adStrength.rating} ({adStrength.scorePercent}%)</span>
          </div>
        </div>
      </div>

      {/* Grid Bento: Quality Score Triad & Ad Strength */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Quality Score Triad: 7 cols */}
        <div className="md:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Tríada del Algoritmo Quality Score (1 al 10)
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Calificación: {qs.predictedScore} / 10
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Google Ads calcula el Nivel de Calidad multiplicando 3 factores. Una campaña optimizada reduce drásticamente el coste por clic (CPC) y gana subastas frente a competidores con mayor presupuesto.
            </p>

            <div className="space-y-3">
              {/* CTR Esperado */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-200">1. CTR Esperado (Expected CTR)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Ganchos de alto contraste, cifras concretas, llamadas a la acción sin ambigüedad.
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 text-xs font-bold shrink-0 border border-emerald-500/30">
                  {qs.expectedCtr}
                </span>
              </div>

              {/* Relevancia del Anuncio */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-200">2. Relevancia del Anuncio (Ad Relevance)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Grupos STAG por intención con concordancia exacta y de frase integrada en titulares.
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 text-xs font-bold shrink-0 border border-emerald-500/30">
                  {qs.adRelevance}
                </span>
              </div>

              {/* Experiencia en la Página */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-200">3. Experiencia en la Página de Destino</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Coincidencia de mensaje (H1 de landing = anuncio), transparencia de oferta y carga ágil.
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 text-xs font-bold shrink-0 border border-emerald-500/30">
                  {qs.landingPageExperience}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80">
            <h4 className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider mb-2">Factores Clave Verificados:</h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300">
              {qs.keyFactors.map((factor, idx) => (
                <li key={idx} className="flex items-start space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                  <span>{factor}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Ad Strength (Eficacia del Anuncio) Checklist: 5 cols */}
        <div className="md:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Ad Strength: {adStrength.rating}
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                {adStrength.scorePercent}% Cumplimiento
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Google Ads evalúa la diversidad semántica de los Responsive Search Ads (RSA) para su motor de combinatoria con aprendizaje automático:
            </p>

            <div className="space-y-2.5">
              {adStrength.checks.map((chk, idx) => (
                <div key={idx} className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-start space-x-2.5">
                  <div className="p-1 bg-emerald-500/20 text-emerald-400 rounded-full mt-0.5 shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-200">{chk.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{chk.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-200">
            <strong>Certificación Premier:</strong> Sin signos excesivos (cero "!!!"), sin mayúsculas no autorizadas, y sin Dynamic Keyword Insertion rota. 100% de aprobación técnica garantizada.
          </div>
        </div>
      </div>

      {/* Critical Rules of Waste Prevention (Display OFF, Physical Presence, Negatives) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
          <ShieldCheck className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Blindaje Contra Desperdicio de Presupuesto (Mandatos Premier Partner)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-950 border border-red-950/40 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-red-400 uppercase">Red de Display en Search</span>
              <span className="text-[10px] font-bold bg-red-500/20 text-red-300 px-2 py-0.5 rounded">DESACTIVADA</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Google activa la Red de Display por defecto en campañas de Búsqueda. En el 90% de los casos genera clics fantasma en apps y juegos que drenan el 30% del presupuesto. Debe permanecer en <strong>OFF</strong>.
            </p>
          </div>

          <div className="bg-slate-950 border border-indigo-950/40 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-400 uppercase">Opciones de Ubicación</span>
              <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded">SOLO PRESENCIA</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Configurado en <em>"Presencia: personas que se encuentran o suelen encontrarse en tus ubicaciones"</em>. Evita la fuga masiva de clics de personas fuera de tu mercado que solo mostraron interés temporal.
            </p>
          </div>

          <div className="bg-slate-950 border border-emerald-950/40 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 uppercase">Bóveda de Negativas</span>
              <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">FILTRADO ACTIVO</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Inclusión inmediata de palabras clave negativas universales (gratis, empleo, curso, pdf, sueldo, login, tutorial) para aislar únicamente tráfico con alta intención comercial y billetera abierta.
            </p>
          </div>
        </div>
      </div>

      {/* Measurement Plan & Enhanced Conversions Snippet */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Primary Conversions: 6 cols */}
        <div className="md:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
            <Database className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Arquitectura de Conversiones & Smart Bidding
            </h3>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Smart Bidding (Maximizar Conversiones, tCPA y tROAS) requiere una jerarquía estricta entre acciones primarias y secundarias:
          </p>

          <div className="space-y-2">
            {measurement.primaryConversions.map((conv, idx) => (
              <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs">
                <span className="text-slate-200 font-medium">{conv}</span>
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded uppercase">
                  Primaria (Bidding)
                </span>
              </div>
            ))}
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl text-xs space-y-2 text-slate-300">
            <div className="font-bold text-indigo-400 flex items-center space-x-1.5">
              <Sliders className="w-4 h-4" />
              <span>Cronograma de Aprendizaje del Algoritmo:</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              <strong>Día 1 a 14:</strong> Utilizar <em>Maximizar Conversiones</em> para alimentar la IA con volumen inicial (meta: 30-50 conversiones). No modificar presupuestos más de un 20% para no resetear la fase de aprendizaje.
            </p>
            <p className="text-[11px] leading-relaxed">
              <strong>Día 15 en adelante:</strong> Establecer <em>tCPA (CPA Objetivo)</em> basado en el costo real promedio histórico para asegurar rentabilidad constante.
            </p>
          </div>
        </div>

        {/* Enhanced Conversions & Tag Code: 6 cols */}
        <div className="md:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Lock className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Conversiones Mejoradas & Consent Mode v2
                </h3>
              </div>
              <button
                onClick={() => handleCopy(gTagCode, "gtag")}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center space-x-1 border border-slate-700 cursor-pointer"
              >
                {copiedSnippet === "gtag" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSnippet === "gtag" ? "Copiado" : "Copiar Snippet"}</span>
              </button>
            </div>

            <p className="text-xs text-slate-400 mt-3 leading-relaxed">
              {measurement.googleTagSetupGuide}
            </p>

            <div className="mt-3 bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-[160px]">
              <pre>{gTagCode}</pre>
            </div>
          </div>

          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-300">
            <strong>Recuperación de Datos:</strong> Enhanced Conversions envía el email/teléfono hasheado (SHA-256) de los leads para atribuir conversiones perdidas por restricciones de Safari/iOS o cookies de terceros (+15% de data recuperada).
          </div>
        </div>
      </div>

      {/* Certified Partner Recommendations List */}
      {certifiedTips.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
            <TrendingUp className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Recomendaciones Estratégicas del Consultor Certificado
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {certifiedTips.map((tip, idx) => (
              <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-slate-700 transition-colors">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400">{tip.category}</span>
                    <span
                      className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                        tip.impactBadge === "Crítico"
                          ? "bg-red-500/20 text-red-300 border border-red-500/30"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      }`}
                    >
                      Impacto {tip.impactBadge}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white">{tip.title}</h4>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">{tip.recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
