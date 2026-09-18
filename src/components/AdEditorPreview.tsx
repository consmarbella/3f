import React, { useState } from "react";
import { Ad, Sitelink } from "../types";
import { validateHeadline, validateDescription, sanitizeGoogleAdsPayload } from "../utils/googleAdsUtils";
import { Smartphone, Monitor, Shuffle, CheckCircle2, AlertTriangle, Copy, Check, Pin, Sparkles, Edit3, ShieldCheck, Code2 } from "lucide-react";

interface AdEditorPreviewProps {
  ad: Ad;
  sitelinks: Sitelink[];
  callouts: string[];
  websiteUrl: string;
  onUpdateAd: (updatedAd: Ad) => void;
}

export const AdEditorPreview: React.FC<AdEditorPreviewProps> = ({
  ad,
  sitelinks,
  callouts,
  websiteUrl,
  onUpdateAd,
}) => {
  const [deviceMode, setDeviceMode] = useState<"desktop" | "mobile">("desktop");
  const [activeTab, setActiveTab] = useState<"editor" | "mockup">("editor");

  // Cycle combination states for live mockup testing
  const [h1Idx, setH1Idx] = useState<number>(0);
  const [h2Idx, setH2Idx] = useState<number>(1);
  const [h3Idx, setH3Idx] = useState<number>(2);
  const [d1Idx, setD1Idx] = useState<number>(0);
  const [d2Idx, setD2Idx] = useState<number>(1);

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [sanitizeStatus, setSanitizeStatus] = useState<string | null>(null);

  const handleHeadlineChange = (index: number, newText: string) => {
    const newHeadlines = [...ad.headlines];
    newHeadlines[index] = newText;
    onUpdateAd({ ...ad, headlines: newHeadlines });
  };

  const handleDescriptionChange = (index: number, newText: string) => {
    const newDescriptions = [...ad.descriptions];
    newDescriptions[index] = newText;
    onUpdateAd({ ...ad, descriptions: newDescriptions });
  };

  const handlePathChange = (field: "path1" | "path2", newText: string) => {
    onUpdateAd({ ...ad, [field]: newText.slice(0, 15) });
  };

  const handleShufflePreview = () => {
    const totalH = ad.headlines.length || 15;
    const totalD = ad.descriptions.length || 4;
    setH1Idx(Math.floor(Math.random() * totalH));
    setH2Idx((Math.floor(Math.random() * totalH) + 1) % totalH);
    setH3Idx((Math.floor(Math.random() * totalH) + 2) % totalH);
    setD1Idx(Math.floor(Math.random() * totalD));
    setD2Idx((Math.floor(Math.random() * totalD) + 1) % totalD);
  };

  const handleCopyText = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Check character compliance for all headlines & descriptions
  const headlineValidations = ad.headlines.map(validateHeadline);
  const descriptionValidations = ad.descriptions.map(validateDescription);

  const invalidHeadlinesCount = headlineValidations.filter((v) => !v.isValid).length;
  const invalidDescriptionsCount = descriptionValidations.filter((v) => !v.isValid).length;
  const isFullyCompliant = invalidHeadlinesCount === 0 && invalidDescriptionsCount === 0;

  // Auto-trim & sanitize Google Ads payload strictly
  const handleAutoTrimOverlength = () => {
    try {
      const { cleanHeadlines, cleanDescriptions } = sanitizeGoogleAdsPayload(ad.headlines, ad.descriptions);
      // Map all existing while maintaining positions if already valid
      const trimmedHeadlines = ad.headlines
        .map((h) => (h ? h.slice(0, 30).trim() : ""))
        .filter(Boolean);
      const trimmedDescriptions = ad.descriptions
        .map((d) => (d ? d.slice(0, 90).trim() : ""))
        .filter(Boolean);

      onUpdateAd({
        ...ad,
        headlines: trimmedHeadlines.length >= 3 ? trimmedHeadlines : cleanHeadlines,
        descriptions: trimmedDescriptions.length >= 2 ? trimmedDescriptions : cleanDescriptions,
      });

      setSanitizeStatus("Payload sanitizado: Titulares cortados a ≤ 30 chars y descripciones a ≤ 90 chars.");
      setTimeout(() => setSanitizeStatus(null), 4000);
    } catch (err: any) {
      setSanitizeStatus(`Error de validación: ${err.message}`);
      setTimeout(() => setSanitizeStatus(null), 4000);
    }
  };

  // Extract display domain for ad mockup
  const displayDomain = websiteUrl
    ? websiteUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "")
    : "www.ejemplo.com";

  return (
    <div id="ad-editor-preview-container" className="space-y-6">
      {/* Top Controls Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-xl font-bold text-white">Anuncio de Búsqueda Adaptable (RSA)</h3>
            {isFullyCompliant ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>100% Cumplimiento Google Ads</span>
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Exceso de Caracteres ({invalidHeadlinesCount + invalidDescriptionsCount})</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Exactamente 15 Titulares (máx 30) y 4 Descripciones (máx 90). Edita directamente y visualiza el mockup en tiempo real.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleAutoTrimOverlength}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer border ${
              !isFullyCompliant
                ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
            }`}
            title="Aplica sanitize_google_ads_payload: corta a 30 caracteres titulares y 90 descripciones"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Sanitizar Payload (≤30 / ≤90)</span>
          </button>

          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center space-x-1">
            <button
              onClick={() => setActiveTab("editor")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === "editor"
                  ? "bg-amber-500 text-slate-950 font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Editor de Copy
            </button>
            <button
              onClick={() => setActiveTab("mockup")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === "mockup"
                  ? "bg-amber-500 text-slate-950 font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Vista Previa Google Search
            </button>
          </div>
        </div>
      </div>

      {sanitizeStatus && (
        <div className="bg-indigo-950/70 border border-indigo-500/40 rounded-xl p-3 text-xs text-indigo-200 flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-mono">{sanitizeStatus}</span>
          </div>
          <button
            onClick={() => setSanitizeStatus(null)}
            className="text-xs text-indigo-400 hover:text-white ml-2"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Main Split Content: Left Editor Grid, Right Google Mockup */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Headlines & Descriptions Editor (7 cols) */}
        <div className={`${activeTab === "mockup" ? "hidden lg:block lg:col-span-6" : "lg:col-span-7"} space-y-6`}>
          {/* Paths Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
              Ruta de la URL Visible (Display Paths - máx 15 chars c/u)
            </h4>
            <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800 font-mono">
              <span className="text-slate-500">https://{displayDomain}/</span>
              <input
                type="text"
                value={ad.path1 || ""}
                onChange={(e) => handlePathChange("path1", e.target.value)}
                placeholder="oferta"
                maxLength={15}
                className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-amber-300 focus:outline-none focus:border-amber-500 font-mono"
              />
              <span className="text-slate-500">/</span>
              <input
                type="text"
                value={ad.path2 || ""}
                onChange={(e) => handlePathChange("path2", e.target.value)}
                placeholder="contacto"
                maxLength={15}
                className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-amber-300 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          {/* Headlines Editor (15 Headlines) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-bold text-white">
                  15 Titulares Exactos (Headlines ≤ 30 Chars)
                </h4>
              </div>
              <span className="text-xs font-medium text-slate-400">
                Total: <strong className="text-amber-400">{ad.headlines.length}/15</strong>
              </span>
            </div>

            <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
              {ad.headlines.map((headline, idx) => {
                const validation = headlineValidations[idx] || validateHeadline(headline);
                const isOver = !validation.isValid;

                return (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border transition-all ${
                      isOver
                        ? "bg-red-950/20 border-red-500/50"
                        : "bg-slate-950 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-400">Titular #{idx + 1}</span>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`font-mono font-bold text-[11px] ${
                            isOver ? "text-red-400" : "text-slate-400"
                          }`}
                        >
                          {validation.charCount} / 30
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(headline, `h-${idx}`)}
                          className="text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
                          title="Copiar Titular"
                        >
                          {copiedField === `h-${idx}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <input
                      type="text"
                      value={headline}
                      onChange={(e) => handleHeadlineChange(idx, e.target.value)}
                      className={`w-full bg-slate-900 border rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none font-medium ${
                        isOver
                          ? "border-red-500 focus:ring-1 focus:ring-red-500"
                          : "border-slate-700 focus:border-amber-500"
                      }`}
                    />
                    {isOver && (
                      <p className="text-[10px] text-red-400 mt-1">
                        Excede el límite de Google Ads por {validation.charCount - 30} caracteres.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Descriptions Editor (4 Descriptions) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-indigo-400" />
                <h4 className="text-sm font-bold text-white">
                  4 Descripciones Exactas (Descriptions ≤ 90 Chars)
                </h4>
              </div>
              <span className="text-xs font-medium text-slate-400">
                Total: <strong className="text-indigo-400">{ad.descriptions.length}/4</strong>
              </span>
            </div>

            <div className="space-y-3">
              {ad.descriptions.map((desc, idx) => {
                const validation = descriptionValidations[idx] || validateDescription(desc);
                const isOver = !validation.isValid;

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border transition-all ${
                      isOver
                        ? "bg-red-950/20 border-red-500/50"
                        : "bg-slate-950 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-400">Descripción #{idx + 1}</span>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`font-mono font-bold text-[11px] ${
                            isOver ? "text-red-400" : "text-slate-400"
                          }`}
                        >
                          {validation.charCount} / 90
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(desc, `d-${idx}`)}
                          className="text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
                        >
                          {copiedField === `d-${idx}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <textarea
                      value={desc}
                      onChange={(e) => handleDescriptionChange(idx, e.target.value)}
                      rows={2}
                      className={`w-full bg-slate-900 border rounded-lg p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none font-medium resize-none ${
                        isOver
                          ? "border-red-500 focus:ring-1 focus:ring-red-500"
                          : "border-slate-700 focus:border-indigo-500"
                      }`}
                    />
                    {isOver && (
                      <p className="text-[10px] text-red-400 mt-1">
                        Excede el límite de Google Ads por {validation.charCount - 90} caracteres.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Google Search Ad Mockup (5 or 6 cols wide) */}
        <div className={`${activeTab === "editor" ? "hidden lg:block lg:col-span-5" : "lg:col-span-12"} space-y-4`}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl sticky top-20">
            {/* Mockup Header Controls */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase text-slate-300">Simulador de Anuncio Google Search</span>
              </div>

              <div className="flex items-center space-x-2">
                {/* Device Selector */}
                <div className="bg-slate-950 p-1 rounded-lg border border-slate-800 flex items-center space-x-1">
                  <button
                    onClick={() => setDeviceMode("desktop")}
                    className={`p-1.5 rounded text-xs cursor-pointer ${
                      deviceMode === "desktop" ? "bg-slate-800 text-amber-400" : "text-slate-500"
                    }`}
                    title="Vista Desktop"
                  >
                    <Monitor className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeviceMode("mobile")}
                    className={`p-1.5 rounded text-xs cursor-pointer ${
                      deviceMode === "mobile" ? "bg-slate-800 text-amber-400" : "text-slate-500"
                    }`}
                    title="Vista Móvil"
                  >
                    <Smartphone className="w-4 h-4" />
                  </button>
                </div>

                {/* Shuffle Combination Button */}
                <button
                  onClick={handleShufflePreview}
                  className="px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium flex items-center space-x-1 cursor-pointer transition-colors"
                  title="Simular combinación de titulares y descripciones de Google Ads"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Probar Mezcla</span>
                </button>
              </div>
            </div>

            {/* Simulated Google Search Results Card */}
            <div className={`mx-auto bg-white rounded-2xl p-4 sm:p-5 text-slate-900 shadow-2xl font-sans border border-slate-200 transition-all ${
              deviceMode === "mobile" ? "max-w-[360px]" : "w-full"
            }`}>
              {/* Sponsored Tag + Domain */}
              <div className="flex items-center space-x-2 text-xs mb-1">
                <span className="font-bold text-slate-900 bg-slate-200 px-1.5 py-0.5 rounded text-[11px]">Anuncio</span>
                <span className="text-slate-600 truncate font-normal">
                  https://{displayDomain}
                  {ad.path1 ? ` › ${ad.path1}` : ""}
                  {ad.path2 ? ` › ${ad.path2}` : ""}
                </span>
              </div>

              {/* Main Headline Combination (H1 | H2 | H3) */}
              <h3 className="text-blue-800 hover:underline text-lg sm:text-xl font-medium leading-snug cursor-pointer my-1.5">
                {ad.headlines[h1Idx] || ad.headlines[0] || "Titular 1 Principal"} | {" "}
                {ad.headlines[h2Idx] || ad.headlines[1] || "Titular 2 Beneficio"} | {" "}
                {ad.headlines[h3Idx] || ad.headlines[2] || "Titular 3 Llamado a la Acción"}
              </h3>

              {/* Descriptions Combination */}
              <p className="text-slate-700 text-xs sm:text-sm leading-relaxed my-1">
                {ad.descriptions[d1Idx] || ad.descriptions[0] || "Descripción 1 enfocada en la propuesta de valor del cliente."}{" "}
                {ad.descriptions[d2Idx] || ad.descriptions[1] || "Descripción 2 con prueba social y gatillos de urgencia."}
              </p>

              {/* Callout Extensions snippet */}
              {callouts && callouts.length > 0 && (
                <div className="text-xs text-slate-600 mt-2 flex flex-wrap gap-x-2 gap-y-1">
                  {callouts.slice(0, 4).map((callout, idx) => (
                    <span key={idx} className="after:content-['•'] after:ml-2 after:text-slate-400 last:after:content-none">
                      {callout}
                    </span>
                  ))}
                </div>
              )}

              {/* Sitelinks Extensions Grid */}
              {sitelinks && sitelinks.length > 0 && (
                <div className="mt-3.5 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {sitelinks.slice(0, 4).map((site, idx) => (
                    <div key={idx} className="group cursor-pointer">
                      <div className="text-blue-800 font-medium group-hover:underline text-xs flex items-center space-x-1">
                        <span>{site.text}</span>
                      </div>
                      <div className="text-slate-500 text-[11px] leading-tight line-clamp-1">
                        {site.description1}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Combination Tester Info */}
            <div className="mt-4 bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
              <div>
                Probando combinación de Titulares: <span className="text-amber-400 font-mono font-bold">#{h1Idx + 1}, #{h2Idx + 1}, #{h3Idx + 1}</span>
              </div>
              <button
                onClick={handleShufflePreview}
                className="text-indigo-400 hover:underline font-semibold cursor-pointer"
              >
                Cambiar mezcla
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
