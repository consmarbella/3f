import React, { useState } from "react";
import { BriefInput, CampaignStrategy, Ad } from "./types";
import { PRESETS } from "./data/presets";
import { Header } from "./components/Header";
import { BriefingForm } from "./components/BriefingForm";
import { CampaignOverview } from "./components/CampaignOverview";
import { AdGroupsTab } from "./components/AdGroupsTab";
import { AdEditorPreview } from "./components/AdEditorPreview";
import { ExtensionsVault } from "./components/ExtensionsVault";
import { NegativeKeywordsVault } from "./components/NegativeKeywordsVault";
import { ExportModal } from "./components/ExportModal";
import { CertifiedAuditView } from "./components/CertifiedAuditView";
import { Sparkles, LayoutDashboard, Layers, Edit3, Link2, ShieldAlert, FileCode, AlertCircle, Award } from "lucide-react";

export default function App() {
  const [brief, setBrief] = useState<BriefInput>(PRESETS[0].brief);
  const [campaign, setCampaign] = useState<CampaignStrategy | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Active view navigation: 'overview' | 'adgroups' | 'ads' | 'extensions' | 'negatives'
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Selected Ad Group & Ad for RSA Editor
  const [selectedGroupIdx, setSelectedGroupIdx] = useState<number>(0);

  // Modal controls
  const [showBriefModal, setShowBriefModal] = useState<boolean>(true);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);

  const handleGenerateCampaign = async (inputBrief: BriefInput) => {
    setIsLoading(true);
    setError(null);
    setBrief(inputBrief);

    try {
      const response = await fetch("/api/generate-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inputBrief),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Falló la generación de la estrategia de Google Ads.");
      }

      setCampaign(result.data);
      setShowBriefModal(false);
      setActiveTab("overview");
      setSelectedGroupIdx(0);
    } catch (err: any) {
      console.error("Error creating campaign strategy:", err);
      setError(err.message || "Ocurrió un error inesperado.");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to update current active ad copy
  const handleUpdateAd = (updatedAd: Ad) => {
    if (!campaign) return;
    const updatedGroups = [...campaign.adGroups];
    if (updatedGroups[selectedGroupIdx]) {
      updatedGroups[selectedGroupIdx].ads[0] = updatedAd;
      setCampaign({ ...campaign, adGroups: updatedGroups });
    }
  };

  const currentAdGroup = campaign?.adGroups[selectedGroupIdx] || campaign?.adGroups[0];
  const currentAd = currentAdGroup?.ads[0] || { headlines: [], descriptions: [], path1: "", path2: "" };

  return (
    <div id="app-root" className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950 pb-16">
      {/* Header Bar */}
      <Header
        onOpenBrief={() => setShowBriefModal(true)}
        onOpenExport={() => setShowExportModal(true)}
        hasCampaign={!!campaign}
        campaignData={campaign}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-950/80 border border-red-500/50 p-4 rounded-xl flex items-start space-x-3 text-red-200">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm">Error en la Generación</h4>
              <p className="text-xs text-red-300 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Initial Empty State / Welcome Screen if no campaign yet */}
        {!campaign && !isLoading && (
          <div className="py-12 text-center max-w-2xl mx-auto space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-indigo-600 p-1 mx-auto shadow-2xl shadow-amber-500/20">
              <div className="w-full h-full bg-slate-950 rounded-xl flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-amber-400" />
              </div>
            </div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              Estrategia de Google Ads de $50M+
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Genera campañas publicitarias de alto rendimiento con análisis cultural por país,
              grupos por intención de búsqueda, 15 titulares exactos y 4 descripciones en cumplimiento técnico de Google Ads.
            </p>
            <button
              onClick={() => setShowBriefModal(true)}
              className="px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/25 transition-all cursor-pointer"
            >
              Comenzar Configuración de Brief
            </button>
          </div>
        )}

        {/* Campaign Strategy Workspace Dashboard */}
        {campaign && (
          <div className="space-y-6">
            {/* Dashboard Sub-navigation Bar */}
            <div className="bg-slate-900 border border-slate-800 p-1.5 rounded-2xl flex flex-wrap items-center justify-between gap-2 shadow-xl">
              <div className="flex items-center space-x-1 overflow-x-auto w-full sm:w-auto">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "overview"
                      ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Visión General & Análisis</span>
                </button>

                <button
                  onClick={() => setActiveTab("adgroups")}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "adgroups"
                      ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>Grupos por Intención ({campaign.adGroups.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab("ads")}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "ads"
                      ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Anuncios RSA & Simulador</span>
                </button>

                <button
                  onClick={() => setActiveTab("extensions")}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "extensions"
                      ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Link2 className="w-4 h-4" />
                  <span>Extensiones (Sitelinks/Callouts)</span>
                </button>

                <button
                  onClick={() => setActiveTab("negatives")}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "negatives"
                      ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Keywords Negativas</span>
                </button>

                <button
                  id="tab-certified"
                  onClick={() => setActiveTab("certified")}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "certified"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-indigo-300 hover:text-white hover:bg-indigo-950/40"
                  }`}
                >
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Auditoría Certificada (QS & Ad Strength)</span>
                </button>
              </div>

              <div className="hidden lg:flex items-center space-x-2 px-3 py-1">
                <button
                  onClick={() => setShowExportModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Exportar Kit de Campaña</span>
                </button>
              </div>
            </div>

            {/* Tab Views Content */}
            {activeTab === "overview" && <CampaignOverview campaign={campaign} />}

            {activeTab === "adgroups" && (
              <AdGroupsTab
                adGroups={campaign.adGroups}
                activeGroupIndex={selectedGroupIdx}
                onSelectGroup={(idx) => setSelectedGroupIdx(idx)}
              />
            )}

            {activeTab === "ads" && (
              <div className="space-y-4">
                {/* Selector of Ad Group for RSA Editor */}
                <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center space-x-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Editando Anuncio para:
                  </span>
                  <select
                    value={selectedGroupIdx}
                    onChange={(e) => setSelectedGroupIdx(parseInt(e.target.value, 10))}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-amber-500"
                  >
                    {campaign.adGroups.map((g, idx) => (
                      <option key={idx} value={idx}>
                        Grupo #{idx + 1}: {g.name} ({g.userIntent})
                      </option>
                    ))}
                  </select>
                </div>

                <AdEditorPreview
                  ad={currentAd}
                  sitelinks={campaign.sitelinks}
                  callouts={campaign.callouts}
                  websiteUrl={brief.website}
                  onUpdateAd={handleUpdateAd}
                />
              </div>
            )}

            {activeTab === "extensions" && (
              <ExtensionsVault
                sitelinks={campaign.sitelinks}
                callouts={campaign.callouts}
                onUpdateSitelinks={(updated) => setCampaign({ ...campaign, sitelinks: updated })}
                onUpdateCallouts={(updated) => setCampaign({ ...campaign, callouts: updated })}
              />
            )}

            {activeTab === "negatives" && <NegativeKeywordsVault campaign={campaign} />}

            {activeTab === "certified" && <CertifiedAuditView campaign={campaign} />}
          </div>
        )}
      </main>

      {/* Brief Input Modal */}
      {showBriefModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto my-auto">
            <BriefingForm
              onSubmit={handleGenerateCampaign}
              isLoading={isLoading}
              initialBrief={brief}
            />
          </div>
        </div>
      )}

      {/* Export Kit Modal */}
      {showExportModal && campaign && (
        <ExportModal campaign={campaign} onClose={() => setShowExportModal(false)} />
      )}
    </div>
  );
}
