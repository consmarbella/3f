import React from "react";
import { Sparkles, Target, Globe2, FileCode, Award, ShieldCheck } from "lucide-react";
import { DirectApiPublishButton } from "./DirectApiPublishButton";

interface HeaderProps {
  onOpenBrief: () => void;
  onOpenExport: () => void;
  hasCampaign: boolean;
  campaignData?: any;
}

export const Header: React.FC<HeaderProps> = ({ onOpenBrief, onOpenExport, hasCampaign, campaignData }) => {
  return (
    <header id="header-nav" className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur border-b border-slate-800 text-slate-100 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Badge */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-indigo-600 to-indigo-400 p-0.5 shadow-lg shadow-indigo-500/20 shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Target className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 bg-indigo-600 text-[10px] font-bold uppercase tracking-widest rounded text-white shadow-sm shadow-indigo-600/30">
                Certified Partner
              </span>
              <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                Performance Strategist{" "}
                <span className="text-slate-500 font-light underline decoration-indigo-500/50 underline-offset-4 text-xs sm:text-sm">
                  v2.4
                </span>
              </h1>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              $50M+ Managed Spend • Google Ads Search Certified & Premier Partner Architecture
            </p>
          </div>
        </div>

        {/* Consultancy Value & Global Action Controls */}
        <div className="flex items-center space-x-4">
          <div className="hidden lg:block text-right pr-3 border-r border-slate-800">
            <p className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold">Valor de Consultoría</p>
            <p className="text-sm font-mono text-indigo-400 font-bold">$5,000.00 USD</p>
          </div>

          <div className="hidden md:flex items-center space-x-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span className="font-semibold text-[11px]">Audit 10/10 Quality Score</span>
          </div>

          <button
            id="btn-new-brief"
            onClick={onOpenBrief}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>{hasCampaign ? "Nuevo Brief / Editar" : "Iniciar Configuración"}</span>
          </button>

          {hasCampaign && (
            <button
              id="btn-export-top"
              onClick={onOpenExport}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all border border-indigo-400/30 shadow-md shadow-indigo-600/25 cursor-pointer"
            >
              <FileCode className="w-4 h-4 text-indigo-200" />
              <span>Exportar Kit (CSV/JSON)</span>
            </button>
          )}

          {hasCampaign && campaignData && (
            <DirectApiPublishButton campaignData={campaignData} />
          )}
        </div>
      </div>
    </header>
  );
};

