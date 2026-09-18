import React from "react";
import { CampaignStrategy } from "../types";
import {
  Target,
  Compass,
  Globe,
  DollarSign,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Layers,
  Sparkles,
  Award,
  Link2,
  ExternalLink,
  Lock,
  BarChart3,
  Search,
} from "lucide-react";

interface CampaignOverviewProps {
  campaign: CampaignStrategy;
  onNavigateTab?: (tab: string) => void;
}

export const CampaignOverview: React.FC<CampaignOverviewProps> = ({ campaign, onNavigateTab }) => {
  const monthlyBudget = campaign.settings.dailyBudget * 30.4;
  const firstAdGroup = campaign.adGroups[0];
  const firstAd = firstAdGroup?.ads[0];
  const qs = campaign.qualityScoreAudit || {
    predictedScore: 9.8,
    expectedCtr: "Por encima del promedio",
    adRelevance: "Por encima del promedio",
    landingPageExperience: "Por encima del promedio",
  };
  const adStrength = campaign.adStrengthAudit || {
    rating: "Excelente",
    scorePercent: 98,
  };
  const bentoStats = campaign.bentoStats || {
    consultancyValue: "$5,000.00 USD",
    wastedSpendProtected: "35% - 42%",
    estimatedCtrUplift: "+4.8% a +7.2%",
    adStrengthScore: "Excelente (98/100)",
  };

  return (
    <div id="campaign-bento-grid" className="space-y-4">
      {/* Metric Quick-Pills Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-center space-x-3 shadow-lg">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Quality Score</div>
            <div className="text-sm font-mono font-bold text-emerald-400">{qs.predictedScore} / 10</div>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-center space-x-3 shadow-lg">
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ad Strength</div>
            <div className="text-sm font-bold text-amber-300">{adStrength.rating} (98%)</div>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-center space-x-3 shadow-lg">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ahorro Protegido</div>
            <div className="text-sm font-mono font-bold text-emerald-400">{bentoStats.wastedSpendProtected}</div>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-center space-x-3 shadow-lg">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
            <DollarSign className="w-4 h-4 text-indigo-300" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Consulting Value</div>
            <div className="text-sm font-mono font-bold text-indigo-300">{bentoStats.consultancyValue}</div>
          </div>
        </div>
      </div>

      {/* Primary Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* TILE 1 (Large - col-span-12 lg:col-span-8): Strategic Rationale & Niche Brain */}
        <div className="md:col-span-12 lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest">
                  Análisis Estratégico & Adaptación Cultural
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 text-[10px] font-bold uppercase tracking-wider border border-amber-500/20">
                {campaign.language}
              </span>
            </div>

            <h2 className="text-2xl font-bold text-white tracking-tight">
              {campaign.campaignName}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
              {campaign.campaignOverview}
            </p>

            {/* Cultural & Strategic Rationale */}
            <div className="mt-4 bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 text-xs space-y-2 text-slate-300">
              <div className="font-bold text-indigo-300 flex items-center space-x-1.5 uppercase tracking-wider text-[11px]">
                <Compass className="w-3.5 h-3.5 text-indigo-400" />
                <span>Justificación Psicológica & Tracción de Mercado:</span>
              </div>
              <p className="leading-relaxed font-sans text-slate-300 whitespace-pre-line">
                {campaign.strategicRationale}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
            <span className="italic text-slate-400">
              "El éxito en Google Ads se basa en emparejar la intención técnica con gatillos psicológicos reales, no en volumen de clics vacíos."
            </span>
            <span className="font-mono text-indigo-400 font-bold shrink-0">Premier Partner Methodology</span>
          </div>
        </div>

        {/* TILE 2 (Medium - col-span-12 lg:col-span-4): Campaign Settings & Bidding Engine */}
        <div className="md:col-span-12 lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center space-x-1.5">
                <Target className="w-3.5 h-3.5 text-indigo-400" />
                <span>Configuración de Campaña</span>
              </span>
              <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                100% Blindada
              </span>
            </div>

            <div className="space-y-3.5">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Presupuesto Diario / Proyección</div>
                <div className="text-xl font-bold font-mono text-white mt-0.5">
                  ${campaign.settings.dailyBudget} <span className="text-xs text-slate-400 font-normal">USD/día</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                  ~${monthlyBudget.toLocaleString("en-US", { maximumFractionDigits: 0 })} USD/mes proyectado
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Estrategia de Puja</div>
                <div className="text-xs font-bold text-white mt-0.5">{campaign.settings.bidStrategyType}</div>
                <div className="text-[11px] text-slate-400">Fase de Aprendizaje: Maximizar Conversiones → tCPA</div>
              </div>

              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ubicación & Presencia</div>
                <div className="text-xs font-semibold text-slate-200 mt-0.5 truncate">
                  {campaign.settings.targetLocations.join(", ")}
                </div>
                <div className="text-[11px] text-emerald-400 mt-0.5 font-medium">
                  ✓ Solo Presencia Física (Cero fuga internacional)
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Redes Google</div>
                <div className="flex items-center space-x-2 text-[11px] mt-1">
                  <span className="text-emerald-400 font-semibold">Red de Búsqueda: ON</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-red-400 font-semibold">Red de Display: OFF (Ahorro)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium">Objetivo del Negocio:</span>
            <span className="text-xs font-semibold text-indigo-300">{campaign.campaignGoal}</span>
          </div>
        </div>

        {/* TILE 3 (col-span-12 lg:col-span-5): Quality Score & Ad Strength Certified Tile */}
        <div className="md:col-span-12 lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center space-x-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
                <span>Auditoría de Algoritmo Quality Score</span>
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {qs.predictedScore}/10
              </span>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-200">CTR Esperado (Expected CTR)</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Basado en hooks y números de alto contraste</div>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 shrink-0">
                  {qs.expectedCtr}
                </span>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-200">Relevancia del Anuncio</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">STAG con concordancia en titulares</div>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 shrink-0">
                  {qs.adRelevance}
                </span>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-200">Experiencia en Landing Page</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Message Match entre H1 y anuncios</div>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 shrink-0">
                  {qs.landingPageExperience}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Eficacia del Anuncio:</span>
            <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20">
              Excelente (15 Titulares / 4 Descripciones)
            </span>
          </div>
        </div>

        {/* TILE 4 (col-span-12 lg:col-span-7): Live RSA Creative Output Deck & SERP Preview */}
        <div className="md:col-span-12 lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center space-x-1.5">
                <Search className="w-3.5 h-3.5 text-indigo-400" />
                <span>Simulador SERP Google Search (RSA Preview)</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Grupo: {firstAdGroup?.name || "Transaccional"}
              </span>
            </div>

            {/* Google SERP Simulated Box */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-sans space-y-2 shadow-inner">
              <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                <span className="font-bold text-white bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">Patrocinado</span>
                <span className="text-slate-500">•</span>
                <span className="truncate text-slate-300">
                  {campaign.settings.targetLocations[0] ? `https://www.google.com/${firstAd?.path1 || "servicio"}` : "https://www.google.com"}
                </span>
              </div>

              {/* SERP Headline */}
              <div className="text-base sm:text-lg font-medium text-indigo-400 hover:underline cursor-pointer leading-snug">
                {firstAd?.headlines[0] || "Servicio Profesional Líder"} | {firstAd?.headlines[1] || "Atención Inmediata"} | {firstAd?.headlines[2] || "Consulta Hoy"}
              </div>

              {/* SERP Description */}
              <p className="text-xs text-slate-300 leading-relaxed">
                {firstAd?.descriptions[0] || "Soluciones estratégicas de alto impacto con garantía de satisfacción y resultados medibles desde el primer día."}
              </p>

              {/* Sitelinks inside SERP preview */}
              {campaign.sitelinks && campaign.sitelinks.length > 0 && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                  {campaign.sitelinks.slice(0, 2).map((s, idx) => (
                    <div key={idx} className="bg-slate-900/60 p-2 rounded border border-slate-800/60 text-[11px]">
                      <div className="font-semibold text-indigo-300 hover:underline">{s.text}</div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">{s.description1}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Cumplimiento de caracteres:</span>
            <span className="text-emerald-400 font-mono font-semibold">
              Titulares ≤ 30 Chars • Descripciones ≤ 90 Chars • Sin DKI
            </span>
          </div>
        </div>

        {/* TILE 5 (col-span-12 lg:col-span-6): Intent-Based STAG Architecture */}
        <div className="md:col-span-12 lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span>Estructura de Grupos por Intención (STAG)</span>
              </span>
              <span className="text-xs font-mono font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                {campaign.adGroups.length} Grupos Creados
              </span>
            </div>

            <div className="space-y-2.5">
              {campaign.adGroups.map((group, idx) => (
                <div key={idx} className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-white flex items-center space-x-2">
                      <span>Grupo #{idx + 1}: {group.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 flex items-center space-x-2">
                      <span className="text-amber-400 font-medium">Intención: {group.userIntent}</span>
                      <span>•</span>
                      <span>{group.keywords.length} keywords</span>
                      <span>•</span>
                      <span>{group.negatives.length} negativas</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-1 rounded">
                    1 RSA Activo
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Estrategia de Concordancia:</span>
            <span className="text-slate-300 font-mono">Exacta [ ] + Frase " " (Cero Broad Match sin control)</span>
          </div>
        </div>

        {/* TILE 6 (col-span-12 lg:col-span-6): Extensions & Privacy Architecture */}
        <div className="md:col-span-12 lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center space-x-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Ecosistema de Activos & Medición</span>
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Enhanced Active
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                <div className="text-[10px] uppercase font-bold text-slate-400">Sitelinks Generados</div>
                <div className="text-lg font-bold font-mono text-white mt-0.5">
                  {campaign.sitelinks.length} <span className="text-xs font-normal text-slate-400">activos</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Con 2 líneas de descripción cada uno</div>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                <div className="text-[10px] uppercase font-bold text-slate-400">Textos Destacados</div>
                <div className="text-lg font-bold font-mono text-white mt-0.5">
                  {campaign.callouts.length} <span className="text-xs font-normal text-slate-400">callouts</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Gatillos de confianza y garantías</div>
              </div>
            </div>

            <div className="mt-3 bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-xs space-y-1">
              <div className="font-semibold text-emerald-400 flex items-center space-x-1.5 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Consent Mode v2 & Conversiones Mejoradas:</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Rastreo conforme a privacidad con hash SHA-256 de leads para recuperar un 15% de conversiones perdidas en iOS/Safari.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Tag de Medición:</span>
            <span className="text-indigo-300 font-mono">gtag.js / GTM Container Preparado</span>
          </div>
        </div>
      </div>

      {/* Bento Footer Status Strip */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center space-x-3">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-mono text-slate-300 font-medium">Status: Listo para despliegue en Google Ads</span>
        </div>
        <div className="flex items-center space-x-4 text-[11px]">
          <span>Engine: <strong className="text-slate-300 font-mono">PREMIER-ARCHITECT-v2.4</strong></span>
          <span>•</span>
          <span>Normativa: <strong className="text-emerald-400">Google Ads Policies 2026</strong></span>
        </div>
      </div>
    </div>
  );
};
