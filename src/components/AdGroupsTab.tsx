import React, { useState } from "react";
import { AdGroup } from "../types";
import { Layers, Key, ShieldMinus, Copy, Check, Filter, Sparkles } from "lucide-react";

interface AdGroupsTabProps {
  adGroups: AdGroup[];
  activeGroupIndex: number;
  onSelectGroup: (index: number) => void;
}

export const AdGroupsTab: React.FC<AdGroupsTabProps> = ({
  adGroups,
  activeGroupIndex,
  onSelectGroup,
}) => {
  const [copiedKw, setCopiedKw] = useState<boolean>(false);
  const [copiedNeg, setCopiedNeg] = useState<boolean>(false);

  const activeGroup = adGroups[activeGroupIndex] || adGroups[0];

  const handleCopyKeywords = () => {
    if (!activeGroup) return;
    const text = activeGroup.keywords.join("\n");
    navigator.clipboard.writeText(text);
    setCopiedKw(true);
    setTimeout(() => setCopiedKw(false), 2000);
  };

  const handleCopyNegatives = () => {
    if (!activeGroup) return;
    const text = activeGroup.negatives.join("\n");
    navigator.clipboard.writeText(text);
    setCopiedNeg(true);
    setTimeout(() => setCopiedNeg(false), 2000);
  };

  if (!adGroups || adGroups.length === 0) return null;

  return (
    <div id="adgroups-tab-container" className="space-y-6">
      {/* Ad Group Selector Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 flex flex-wrap gap-2">
        {adGroups.map((group, idx) => {
          const isActive = idx === activeGroupIndex;
          return (
            <button
              key={idx}
              onClick={() => onSelectGroup(idx)}
              className={`flex-1 min-w-[200px] px-4 py-3 rounded-lg text-left transition-all cursor-pointer border ${
                isActive
                  ? "bg-slate-800 border-amber-500/50 shadow-md shadow-amber-500/10 text-white"
                  : "bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/50 text-slate-400"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                  Grupo #{idx + 1}
                </span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {group.userIntent || "Intención"}
                </span>
              </div>
              <div className="font-bold text-sm mt-1 text-white truncate">{group.name}</div>
            </button>
          );
        })}
      </div>

      {/* Active Ad Group Deep Dive */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Keywords Column (2 cols wide) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center space-x-2">
                <Key className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold text-white">Keywords por Intención de Búsqueda</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Estrategia optimizada para la intención: <strong className="text-indigo-300">{activeGroup.userIntent}</strong>
              </p>
            </div>

            <button
              onClick={handleCopyKeywords}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 cursor-pointer transition-colors"
            >
              {copiedKw ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copiadas</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copiar Keywords</span>
                </>
              )}
            </button>
          </div>

          {/* Keywords List Grid */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
            {activeGroup.keywords.map((kw, idx) => {
              let matchType = "Frase Exacta";
              let badgeColor = "bg-amber-500/10 text-amber-300 border-amber-500/30";

              if (kw.startsWith("[") && kw.endsWith("]")) {
                matchType = "Exacta [ ]";
                badgeColor = "bg-emerald-500/10 text-emerald-300 border-emerald-500/30";
              } else if (kw.startsWith('"') && kw.endsWith('"')) {
                matchType = "Frase \" \"";
                badgeColor = "bg-indigo-500/10 text-indigo-300 border-indigo-500/30";
              }

              return (
                <div
                  key={idx}
                  className="bg-slate-950 border border-slate-800/80 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-sm hover:border-slate-700 transition-all"
                >
                  <span className="font-mono text-slate-200 text-xs sm:text-sm truncate mr-2">{kw}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border whitespace-nowrap ${badgeColor}`}>
                    {matchType}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Negative Keywords Box (1 col wide) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <ShieldMinus className="w-5 h-5 text-red-400" />
                <h3 className="text-lg font-bold text-white">Negativas Estratégicas</h3>
              </div>

              <button
                onClick={handleCopyNegatives}
                className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 cursor-pointer"
              >
                {copiedNeg ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copiar</span>
              </button>
            </div>

            <p className="text-xs text-slate-400 mt-3">
              Filtro de tráfico no deseado (ahorro directo de presupuesto):
            </p>

            <div className="mt-3 space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
              {activeGroup.negatives.map((neg, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950 border border-red-900/30 rounded-lg px-3 py-1.5 text-xs font-mono text-red-300/90 flex items-center justify-between"
                >
                  <span>{neg}</span>
                  <span className="text-[9px] uppercase font-bold text-red-400/60">Excluir</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center space-x-1">
            <Filter className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Mínimo 10 palabras clave negativas incluidas en este grupo.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
