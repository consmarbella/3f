import React, { useState } from "react";
import { BriefInput, PresetTemplate } from "../types";
import { PRESETS } from "../data/presets";
import { Sparkles, Building2, Globe, DollarSign, Target, ShieldAlert, FileText, Check, Wand2, X, AlertTriangle, Zap } from "lucide-react";

interface BriefingFormProps {
  onSubmit: (brief: BriefInput) => void;
  isLoading: boolean;
  initialBrief?: BriefInput;
  onClose?: () => void;
  error?: string | null;
  onInstantGenerate?: (brief: BriefInput) => void;
}

export const BriefingForm: React.FC<BriefingFormProps> = ({
  onSubmit,
  isLoading,
  initialBrief,
  onClose,
  error,
  onInstantGenerate,
}) => {
  const [formData, setFormData] = useState<BriefInput>(
    initialBrief || {
      businessName: "Torres Abogados",
      website: "www.torreslegal.com",
      mainProduct: "Abogados de Accidentes de Tráfico",
      location: "Miami, Florida, USA",
      dailyBudget: 150,
      brandTone: "Serio, Empático y Agresivo en defensa",
      clientType: "B2C",
      coreValueProp: "No cobramos si no ganamos su caso",
      primaryGoal: "Generación de leads calificados por teléfono y WhatsApp",
      excludedServices: "Divorcios, penalista, asesoría mercantil, casos menores gratis",
      languagePreference: "Español",
      customNotes: "Campañas de alta intención con extensiones de llamada directa en móviles.",
    }
  );

  const [selectedPresetId, setSelectedPresetId] = useState<string>("");

  const handleSelectPreset = (preset: PresetTemplate) => {
    setSelectedPresetId(preset.id);
    setFormData(preset.brief);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "dailyBudget" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div id="briefing-form-container" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl max-w-4xl mx-auto text-slate-100">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800 relative">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="absolute -top-2 -right-2 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <div className="pr-8 md:pr-0">
          <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Wand2 className="w-4 h-4" />
            <span>Consultoría de $5,000 USD / Configuración de Campaña</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Brief Estratégico de Google Ads</h2>
          <p className="text-sm text-slate-400 mt-1">
            Proporciona los datos reales o carga una plantilla preconfigurada para generar un plan de rendimiento internacional.
          </p>
        </div>

        {/* Quick Presets Dropdown / Buttons */}
        <div className="flex flex-col space-y-1.5">
          <label className="text-xs font-medium text-slate-300 flex items-center space-x-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Cargar Plantilla de Éxito:</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 border cursor-pointer ${
                  selectedPresetId === preset.id
                    ? "bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md shadow-amber-500/20"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                }`}
              >
                <span>{preset.flag}</span>
                <span>{preset.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        {/* Row 1: Business Name & Website */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Nombre del Negocio <span className="text-amber-400">*</span>
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                required
                placeholder="Ej: Torres Abogados"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Sitio Web / Landing Page
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                name="website"
                value={formData.website}
                onChange={handleChange}
                placeholder="Ej: www.torreslegal.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Row 2: Product/Service & Location */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Servicio / Producto Principal <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              name="mainProduct"
              value={formData.mainProduct}
              onChange={handleChange}
              required
              placeholder="Ej: Abogados de Accidentes de Tráfico"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Ubicación Objetivo (Ciudad / País) <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
              placeholder="Ej: Miami, Florida, USA"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
            />
          </div>
        </div>

        {/* Row 3: Budget, Client Type & Language */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Presupuesto Diario (USD)
            </label>
            <div className="relative">
              <DollarSign className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="number"
                name="dailyBudget"
                value={formData.dailyBudget}
                onChange={handleChange}
                min="10"
                max="50000"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Tipo de Cliente / Modelo
            </label>
            <select
              name="clientType"
              value={formData.clientType}
              onChange={handleChange}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
            >
              <option value="B2C">B2C (Consumidor Final)</option>
              <option value="B2B">B2B (Empresas)</option>
              <option value="Lujo">Lujo / High Net Worth</option>
              <option value="Servicios Locales">Servicios Locales / Urgencia</option>
              <option value="SaaS">SaaS / Software Tech</option>
              <option value="Legal/Médico">Legal / Médico / Profesional</option>
              <option value="E-commerce">E-commerce / Ventas Directas</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Idioma de Anuncios
            </label>
            <input
              type="text"
              name="languagePreference"
              value={formData.languagePreference}
              onChange={handleChange}
              placeholder="Ej: Español, Inglés"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
            />
          </div>
        </div>

        {/* Row 4: Value Prop & Goal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Propuesta de Valor Única (Diferenciador)
            </label>
            <input
              type="text"
              name="coreValueProp"
              value={formData.coreValueProp}
              onChange={handleChange}
              placeholder="Ej: No cobramos si no ganamos su caso / Envío gratis en 24h"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Objetivo Principal de Conversión
            </label>
            <input
              type="text"
              name="primaryGoal"
              value={formData.primaryGoal}
              onChange={handleChange}
              placeholder="Ej: Llamadas telefónicas inmediatas / Demos agendadas"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
            />
          </div>
        </div>

        {/* Row 5: Tone & Excluded Services */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Tono de Marca & Personalidad
            </label>
            <input
              type="text"
              name="brandTone"
              value={formData.brandTone}
              onChange={handleChange}
              placeholder="Ej: Serio, Empático, Sofisticado, Directo"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center space-x-1">
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              <span>Servicios / Términos a Excluir</span>
            </label>
            <input
              type="text"
              name="excludedServices"
              value={formData.excludedServices}
              onChange={handleChange}
              placeholder="Ej: Divorcios, penalista, empleo, gratis, cursos"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
            />
          </div>
        </div>

        {/* Row 6: Custom Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center space-x-1">
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            <span>Notas Estratégicas Adicionales</span>
          </label>
          <textarea
            name="customNotes"
            value={formData.customNotes || ""}
            onChange={handleChange}
            rows={2}
            placeholder="Añade contexto sobre competidores locales, promociones activas o particularidades del cliente..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 resize-none"
          />
        </div>

        {/* Error Alert inside modal */}
        {error && (
          <div className="p-4 bg-red-950/80 border border-red-500/50 rounded-xl space-y-2.5 text-xs text-red-200">
            <div className="flex items-center gap-2 font-bold text-red-300">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>Aviso de Generación AI</span>
            </div>
            <p className="leading-relaxed text-red-200/90">{error}</p>
            {onInstantGenerate && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => onInstantGenerate(formData)}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md"
                >
                  <Zap className="w-3.5 h-3.5 fill-slate-950" />
                  <span>Generar Inmediatamente con Motor Certificado Local (Sin Esperas)</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Submit Action Buttons */}
        <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {onInstantGenerate && (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => onInstantGenerate(formData)}
              className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-semibold text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              title="Generación instantánea y determinista sin depender de APIs externas"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Generar con Motor Local (Instantáneo)</span>
            </button>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-base transition-all shadow-xl shadow-amber-500/25 flex items-center justify-center space-x-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed sm:ml-auto"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Ejecutando Análisis Estratégico AI...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-slate-950" />
                <span>Generar Arquitectura de Campaña $50M+</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
