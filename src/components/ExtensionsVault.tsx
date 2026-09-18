import React, { useState } from "react";
import { Sitelink } from "../types";
import { validateSitelink } from "../utils/googleAdsUtils";
import { Link2, MessageSquare, Plus, Trash2, Copy, Check, ShieldCheck } from "lucide-react";

interface ExtensionsVaultProps {
  sitelinks: Sitelink[];
  callouts: string[];
  onUpdateSitelinks: (sitelinks: Sitelink[]) => void;
  onUpdateCallouts: (callouts: string[]) => void;
}

export const ExtensionsVault: React.FC<ExtensionsVaultProps> = ({
  sitelinks,
  callouts,
  onUpdateSitelinks,
  onUpdateCallouts,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleSitelinkChange = (index: number, field: keyof Sitelink, value: string) => {
    const updated = [...sitelinks];
    updated[index] = { ...updated[index], [field]: value };
    onUpdateSitelinks(updated);
  };

  const handleCalloutChange = (index: number, value: string) => {
    const updated = [...callouts];
    updated[index] = value;
    onUpdateCallouts(updated);
  };

  const handleAddCallout = () => {
    if (callouts.length < 8) {
      onUpdateCallouts([...callouts, "Nuevo Texto Destacado"]);
    }
  };

  const handleRemoveCallout = (index: number) => {
    if (callouts.length > 2) {
      onUpdateCallouts(callouts.filter((_, i) => i !== index));
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div id="extensions-vault-container" className="space-y-6">
      {/* Sitelinks Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <div className="flex items-center space-x-2">
            <Link2 className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-lg font-bold text-white">Extensiones de Enlace de Sitio (Sitelinks)</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Exactamente 4 Sitelinks estructurados. Texto (máx 25) y 2 Descripciones (máx 35 c/u).
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
            Aumenta el CTR un +15%
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sitelinks.map((sitelink, idx) => {
            const v = validateSitelink(sitelink);
            return (
              <div
                key={idx}
                className={`bg-slate-950 border rounded-xl p-4 space-y-3 transition-all ${
                  v.isFullyValid ? "border-slate-800" : "border-red-500/50 bg-red-950/10"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    Sitelink #{idx + 1}
                  </span>
                  <button
                    onClick={() =>
                      handleCopyText(
                        `${sitelink.text}\n${sitelink.description1}\n${sitelink.description2}`,
                        `sitelink-${idx}`
                      )
                    }
                    className="text-xs text-slate-400 hover:text-white flex items-center space-x-1 cursor-pointer"
                  >
                    {copiedField === `sitelink-${idx}` ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Text Field */}
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Texto del Enlace</span>
                    <span className={v.textValid ? "text-slate-400" : "text-red-400 font-bold"}>
                      {v.textCount} / 25
                    </span>
                  </div>
                  <input
                    type="text"
                    value={sitelink.text}
                    onChange={(e) => handleSitelinkChange(idx, "text", e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>

                {/* Desc 1 Field */}
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Línea descriptiva 1</span>
                    <span className={v.desc1Valid ? "text-slate-400" : "text-red-400 font-bold"}>
                      {v.desc1Count} / 35
                    </span>
                  </div>
                  <input
                    type="text"
                    value={sitelink.description1}
                    onChange={(e) => handleSitelinkChange(idx, "description1", e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>

                {/* Desc 2 Field */}
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Línea descriptiva 2</span>
                    <span className={v.desc2Valid ? "text-slate-400" : "text-red-400 font-bold"}>
                      {v.desc2Count} / 35
                    </span>
                  </div>
                  <input
                    type="text"
                    value={sitelink.description2}
                    onChange={(e) => handleSitelinkChange(idx, "description2", e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Callouts Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-lg font-bold text-white">Extensiones de Texto Destacado (Callouts)</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Frases de alto valor corto (máx 25 caracteres cada una).
              </p>
            </div>
          </div>

          <button
            onClick={handleAddCallout}
            disabled={callouts.length >= 8}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-medium flex items-center space-x-1 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Añadir Callout</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {callouts.map((callout, idx) => {
            const isValid = callout.length <= 25;
            return (
              <div
                key={idx}
                className={`bg-slate-950 border rounded-xl p-3 flex flex-col justify-between space-y-2 ${
                  isValid ? "border-slate-800" : "border-red-500"
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-semibold text-slate-500">Callout #{idx + 1}</span>
                  <span className={isValid ? "text-slate-400" : "text-red-400 font-bold"}>
                    {callout.length}/25
                  </span>
                </div>

                <input
                  type="text"
                  value={callout}
                  onChange={(e) => handleCalloutChange(idx, e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                />

                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => handleRemoveCallout(idx)}
                    className="text-slate-500 hover:text-red-400 p-1 cursor-pointer"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
