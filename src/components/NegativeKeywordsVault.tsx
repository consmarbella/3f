import React, { useState } from "react";
import { CampaignStrategy } from "../types";
import { ShieldAlert, Copy, Check, Filter, Layers, Download } from "lucide-react";

interface NegativeKeywordsVaultProps {
  campaign: CampaignStrategy;
}

export const NegativeKeywordsVault: React.FC<NegativeKeywordsVaultProps> = ({ campaign }) => {
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  // Consolidate all negative keywords from ad groups
  const allNegatives: string[] = Array.from(
    new Set(campaign.adGroups.flatMap((group) => group.negatives || []))
  );

  const handleCopyFormatted = (format: "plain" | "phrase" | "exact") => {
    let formattedText = "";
    if (format === "plain") {
      formattedText = allNegatives.join("\n");
    } else if (format === "phrase") {
      formattedText = allNegatives.map((n) => `"${n.replace(/^["'\[\]-]/g, "")}"`).join("\n");
    } else if (format === "exact") {
      formattedText = allNegatives.map((n) => `[${n.replace(/^["'\[\]-]/g, "")}]`).join("\n");
    }

    navigator.clipboard.writeText(formattedText);
    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  return (
    <div id="negative-keywords-vault-container" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Bóveda de Keywords Negativas Estratégicas</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {allNegatives.length} palabras negativas consolidadas para evitar clics irrelevantes y maximizar el ROI.
            </p>
          </div>
        </div>

        {/* Copy Format Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleCopyFormatted("plain")}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 flex items-center space-x-1.5 cursor-pointer transition-colors"
          >
            {copiedFormat === "plain" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Texto Plano</span>
          </button>

          <button
            onClick={() => handleCopyFormatted("phrase")}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 flex items-center space-x-1.5 cursor-pointer transition-colors"
          >
            {copiedFormat === "phrase" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Frase " "</span>
          </button>

          <button
            onClick={() => handleCopyFormatted("exact")}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 flex items-center space-x-1.5 cursor-pointer transition-colors"
          >
            {copiedFormat === "exact" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Exacta [ ]</span>
          </button>
        </div>
      </div>

      {/* Grid of Negatives */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[360px] overflow-y-auto pr-1">
        {allNegatives.map((neg, idx) => (
          <div
            key={idx}
            className="bg-slate-950 border border-red-900/30 rounded-xl px-3 py-2 text-xs font-mono text-red-300 flex items-center justify-between hover:border-red-500/40 transition-colors"
          >
            <span className="truncate mr-2">{neg}</span>
            <span className="text-[9px] font-bold uppercase text-red-400/60 bg-red-500/10 px-1.5 py-0.5 rounded">
              Filtrar
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
