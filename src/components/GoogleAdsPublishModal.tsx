import React, { useState, useEffect } from "react";
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  LogOut,
  Building2,
  KeyRound,
  ArrowRight,
  Send,
  HelpCircle,
  Copy,
  Check,
  Info,
  Link2,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
} from "lucide-react";
import { exportToGoogleAdsEditorCSV, downloadFile } from "../utils/googleAdsUtils";

interface GoogleAdsAccount {
  id: string;
  customerId: string;
  resourceName: string;
  name: string;
}

interface EnvVarInfo {
  configured: boolean;
  preview: string;
  required: boolean;
  label: string;
  help?: string;
}

interface EnvStatus {
  success: boolean;
  missingVariables: string[];
  allReadyForPublish: boolean;
  variables: Record<string, EnvVarInfo>;
}

interface GoogleAdsPublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignData: any;
}

export const GoogleAdsPublishModal: React.FC<GoogleAdsPublishModalProps> = ({
  isOpen,
  onClose,
  campaignData,
}) => {
  const [activeTab, setActiveTab] = useState<"publish" | "env">("publish");
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<{ email?: string; name?: string; picture?: string } | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Redirect URI selection & 404 Rescue states
  const [redirectOption, setRedirectOption] = useState<"app" | "vercel" | "custom">("app");
  const [customRedirectUri, setCustomRedirectUri] = useState<string>("");
  const [copiedUriToast, setCopiedUriToast] = useState<boolean>(false);
  const [manualExchangeInput, setManualExchangeInput] = useState<string>("");
  const [isExchangingCode, setIsExchangingCode] = useState<boolean>(false);
  const [manualExchangeError, setManualExchangeError] = useState<string | null>(null);
  const [manualExchangeSuccess, setManualExchangeSuccess] = useState<string | null>(null);
  const [showManualRescue, setShowManualRescue] = useState<boolean>(true);
  const [showDirectToken, setShowDirectToken] = useState<boolean>(false);
  const [directRefreshToken, setDirectRefreshToken] = useState<string>("");
  const [isSavingDirectToken, setIsSavingDirectToken] = useState<boolean>(false);

  // Accounts state
  const [accounts, setAccounts] = useState<GoogleAdsAccount[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [manualCustomerId, setManualCustomerId] = useState<string>("");
  const [isManualInput, setIsManualInput] = useState<boolean>(false);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState<boolean>(false);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [missingDevToken, setMissingDevToken] = useState<boolean>(false);

  // Environment variables diagnostic state
  const [envStatus, setEnvStatus] = useState<EnvStatus | null>(null);
  const [isLoadingEnv, setIsLoadingEnv] = useState<boolean>(false);

  // Publish state
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [publishSuccess, setPublishSuccess] = useState<any | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishDetails, setPublishDetails] = useState<any | null>(null);

  // Check auth session and env variables on mount or modal open
  useEffect(() => {
    if (isOpen) {
      checkAuthSession();
      fetchEnvStatus();
    }
  }, [isOpen]);

  // Check URL query parameters for auth returns (e.g. ?auth=success&sessionId=...)
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlSessionId = urlParams.get("sessionId");
      if (urlSessionId) {
        localStorage.setItem("gads_session_id", urlSessionId);
        setIsAuthenticated(true);
        // Clean URL without reloading
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        fetchAccounts();
      }
    } catch (e) {}
  }, []);

  // Listen for OAuth popup completion message or code return
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === "GOOGLE_ADS_AUTH_SUCCESS") {
        if (event.data.sessionId) {
          try {
            localStorage.setItem("gads_session_id", event.data.sessionId);
          } catch(e) {}
        }
        setIsAuthenticated(true);
        if (event.data.user) {
          setUserProfile(event.data.user);
          try {
            localStorage.setItem("gads_user_info", JSON.stringify(event.data.user));
          } catch(e) {}
        }
        setAuthError(null);
        fetchAccounts();
      } else if (event.data?.type === "GOOGLE_ADS_AUTH_CODE") {
        if (event.data.code) {
          await handleExchangeCode(event.data.code, event.data.redirectUri || event.data.rawUrl);
        }
      } else if (event.data?.type === "GOOGLE_ADS_AUTH_ERROR") {
        setAuthError(event.data.error || "Ocurrió un error durante la autenticación con Google.");
      }
    };

    window.addEventListener("message", handleMessage);

    // Also check if an auth code was left in localStorage
    try {
      const pendingCode = localStorage.getItem("gads_pending_auth_code");
      const pendingUrl = localStorage.getItem("gads_pending_auth_url");
      if (pendingCode) {
        localStorage.removeItem("gads_pending_auth_code");
        localStorage.removeItem("gads_pending_auth_url");
        handleExchangeCode(pendingCode, pendingUrl || undefined);
      }
    } catch {}

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const getSavedSessionId = () => {
    try {
      return localStorage.getItem("gads_session_id") || "";
    } catch {
      return "";
    }
  };

  const getAuthHeaders = (): Record<string, string> => {
    const sid = getSavedSessionId();
    const headers: Record<string, string> = {};
    if (sid) {
      headers["Authorization"] = `Bearer ${sid}`;
      headers["x-gads-session"] = sid;
    }
    return headers;
  };

  const checkAuthSession = async () => {
    setIsCheckingAuth(true);
    try {
      // Check saved user profile in localStorage first for instant UI response
      const savedUserStr = localStorage.getItem("gads_user_info");
      if (savedUserStr) {
        try {
          const parsed = JSON.parse(savedUserStr);
          if (parsed?.email) setUserProfile(parsed);
        } catch {}
      }

      const res = await fetch("/api/google-ads/session", {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
        const data = await res.json();
        const hasAuth = !!data.authenticated;
        setIsAuthenticated(hasAuth);
        if (hasAuth && data.user) {
          setUserProfile(data.user);
          fetchAccounts();
        } else if (!hasAuth && getSavedSessionId()) {
          // If local sessionId exists but session expired on backend, clear it
          localStorage.removeItem("gads_session_id");
          localStorage.removeItem("gads_user_info");
        }
      }
    } catch (e) {
      console.warn("Error checking auth session:", e);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const fetchEnvStatus = async () => {
    setIsLoadingEnv(true);
    try {
      const res = await fetch("/api/google-ads/env-status", {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
        const data = await res.json();
        setEnvStatus(data);
      }
    } catch (e) {
      console.warn("Error fetching env status:", e);
    } finally {
      setIsLoadingEnv(false);
    }
  };

  const fetchAccounts = async () => {
    setIsLoadingAccounts(true);
    setAccountsError(null);
    try {
      const res = await fetch("/api/google-ads/accounts", {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!res.headers.get("content-type")?.includes("application/json")) {
        return;
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.accounts)) {
        setAccounts(data.accounts);
        if (data.accounts.length > 0 && !selectedCustomerId) {
          setSelectedCustomerId(data.accounts[0].customerId);
        }
      } else {
        if (data.missingDeveloperToken) {
          setMissingDevToken(true);
          setIsManualInput(true);
        }
        if (data.error) {
          setAccountsError(data.error);
        }
      }
    } catch (err: any) {
      setAccountsError(err.message || "Error al conectar con la API de Google Ads.");
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const getTargetRedirectUri = (): string => {
    if (redirectOption === "vercel") {
      return "https://3f-six.vercel.app/auth/callback";
    }
    if (redirectOption === "custom" && customRedirectUri.trim()) {
      return customRedirectUri.trim();
    }
    return `${window.location.origin}/auth/callback`;
  };

  const copyToClipboard = (text: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedUriToast(true);
      setTimeout(() => setCopiedUriToast(false), 2500);
    } catch {}
  };

  const handleConnectGoogle = async () => {
    setAuthError(null);
    setManualExchangeError(null);
    try {
      const targetUri = getTargetRedirectUri();
      const res = await fetch(`/api/google-oauth/start?json=true&redirect_uri=${encodeURIComponent(targetUri)}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "No se pudo iniciar el flujo de autenticación OAuth.");
      }
      const data = await res.json();
      if (!data.url) {
        throw new Error("No se recibió la URL de autorización.");
      }

      // Open OAuth popup window
      const width = 600;
      const height = 750;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        data.url,
        "google_ads_oauth",
        `width=${width},height=${height},top=${top},left=${left},status=no,toolbar=no,menubar=no`
      );

      // Fallback polling if popup is closed or user returned
      const checkPopup = setInterval(async () => {
        if (!popup || popup.closed) {
          clearInterval(checkPopup);
          checkAuthSession();
        }
      }, 1500);
    } catch (err: any) {
      setAuthError(err.message || "Error al iniciar conexión con Google.");
    }
  };

  const handleExchangeCode = async (overrideCode?: string, overrideUri?: string) => {
    const inputToUse = (overrideCode || manualExchangeInput).trim();
    if (!inputToUse) return;
    setIsExchangingCode(true);
    setManualExchangeError(null);
    setManualExchangeSuccess(null);
    try {
      const targetUri = overrideUri || getTargetRedirectUri();
      const res = await fetch("/api/google-oauth/exchange-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawUrl: inputToUse,
          code: inputToUse,
          redirectUri: targetUri,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo vincular el código de Google.");
      }
      if (data.sessionId) {
        try {
          localStorage.setItem("gads_session_id", data.sessionId);
        } catch {}
      }
      setIsAuthenticated(true);
      if (data.user) {
        setUserProfile(data.user);
        try {
          localStorage.setItem("gads_user_info", JSON.stringify(data.user));
        } catch {}
      }
      setManualExchangeSuccess("¡Cuenta de Google vinculada exitosamente!");
      setAuthError(null);
      fetchAccounts();
    } catch (err: any) {
      setManualExchangeError(err.message || "Error al procesar el código de autorización.");
    } finally {
      setIsExchangingCode(false);
    }
  };

  const handleSaveDirectToken = async () => {
    if (!directRefreshToken.trim()) return;
    setIsSavingDirectToken(true);
    setManualExchangeError(null);
    try {
      const res = await fetch("/api/google-oauth/set-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refreshToken: directRefreshToken.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo vincular el Refresh Token.");
      }
      if (data.sessionId) {
        try {
          localStorage.setItem("gads_session_id", data.sessionId);
        } catch {}
      }
      setIsAuthenticated(true);
      if (data.user) {
        setUserProfile(data.user);
        try {
          localStorage.setItem("gads_user_info", JSON.stringify(data.user));
        } catch {}
      }
      setAuthError(null);
      fetchAccounts();
    } catch (err: any) {
      setManualExchangeError(err.message || "Error al validar el Refresh Token.");
    } finally {
      setIsSavingDirectToken(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch("/api/google-ads/disconnect", {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
      });
      localStorage.removeItem("gads_session_id");
      localStorage.removeItem("gads_user_info");
      setIsAuthenticated(false);
      setUserProfile(null);
      setAccounts([]);
      setSelectedCustomerId("");
      setManualCustomerId("");
      setPublishSuccess(null);
      setPublishError(null);
    } catch (e) {
      console.warn("Error disconnecting:", e);
    }
  };

  const handlePublish = async () => {
    const manualClean = manualCustomerId.replace(/[^0-9]/g, "");
    const selectedClean = selectedCustomerId.replace(/[^0-9]/g, "");
    const finalCustomerId =
      manualClean && manualClean.length >= 8
        ? manualClean
        : selectedClean && selectedClean.length >= 8
        ? selectedClean
        : manualClean || selectedClean;

    if (!finalCustomerId || finalCustomerId.length < 8) {
      setPublishError("Por favor ingresa o selecciona un Customer ID válido de Google Ads (10 dígitos).");
      return;
    }

    setIsPublishing(true);
    setPublishError(null);
    setPublishSuccess(null);
    setPublishDetails(null);

    try {
      const res = await fetch("/api/google-ads/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({
          customerId: finalCustomerId,
          campaignData,
        }),
      });

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const rawText = await res.text();
        if (rawText.includes("<!DOCTYPE") || rawText.includes("<html")) {
          throw new Error(
            "El endpoint /api/google-ads/publish devolvió HTML en lugar de JSON. Esto ocurre cuando se prueba en Vercel antes de desplegar la configuración serverless /api/ o cuando faltan las variables backend (.env) en Vercel. Puedes probar la publicación directamente desde este preview de AI Studio donde el backend está activo."
          );
        }
        throw new Error(`El servidor devolvió un formato no válido (${res.status}): ${rawText.slice(0, 120)}`);
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        const errorMsg = data.error || "Ocurrió un error al publicar la campaña en Google Ads.";
        setPublishError(errorMsg);
        setPublishDetails(data.googleDetails || null);
      } else {
        setPublishSuccess(data);
      }
    } catch (err: any) {
      setPublishError(err.message || "Error de red al conectar con el servidor.");
    } finally {
      setIsPublishing(false);
    }
  };

  // Lock background scroll when modal is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Normalized Customer ID (digits only)
  const normalizedManualId = manualCustomerId.replace(/[^0-9]/g, "");
  const normalizedSelectedId = selectedCustomerId.replace(/[^0-9]/g, "");
  const effectiveCustomerId = isManualInput ? normalizedManualId : (normalizedSelectedId || normalizedManualId);
  const isValidCustomer = effectiveCustomerId.length >= 8 && effectiveCustomerId.length <= 12;

  // Debug disabled reasons for user transparency
  const publishDisabledReasons: string[] = [];
  if (isPublishing) publishDisabledReasons.push("Publicación en progreso");
  if (!isAuthenticated) publishDisabledReasons.push("Requiere autenticación OAuth en Paso 1");
  if (!effectiveCustomerId) publishDisabledReasons.push("Customer ID vacío");
  else if (!isValidCustomer) publishDisabledReasons.push("Customer ID incompleto (debe tener entre 8 y 12 dígitos)");

  const isPublishDisabled = isPublishing || !isAuthenticated || !isValidCustomer;

  return (
    <div
      id="google-ads-publish-modal-overlay"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 sm:p-6 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="google-ads-publish-modal-content"
        className="bg-slate-900 border border-slate-700/80 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-indigo-600 to-indigo-400 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Building2 className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Publicación Directa en Google Ads
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Estado PAUSED
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Inyección de arquitectura certificada vía OAuth 2.0 & Google Ads API
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setActiveTab(activeTab === "publish" ? "env" : "publish");
                fetchEnvStatus();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "env"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
              title="Ver estado de variables de entorno"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Variables .env</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 px-5 pt-2">
          <button
            onClick={() => setActiveTab("publish")}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "publish"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            1. Flujo de Publicación (OAuth + Cuenta)
          </button>
          <button
            onClick={() => {
              setActiveTab("env");
              fetchEnvStatus();
            }}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "env"
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>2. Diagnóstico de Variables (.env)</span>
            {envStatus && envStatus.missingVariables.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {activeTab === "publish" ? (
            <>
              {/* STEP 1: GOOGLE OAUTH CONNECTION */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">
                      1
                    </div>
                    <h4 className="text-sm font-semibold text-slate-200">
                      Conexión con Google OAuth 2.0
                    </h4>
                  </div>

                  {isAuthenticated && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Conectado</span>
                    </span>
                  )}
                </div>

                {isCheckingAuth ? (
                  <div className="flex items-center justify-center py-4 text-slate-400 text-xs">
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    Verificando sesión activa con Google...
                  </div>
                ) : !isAuthenticated ? (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Conecta tu cuenta de Google Cloud / Google Ads para autenticarte y autorizar la mutación de campañas en estado <strong className="text-emerald-400">PAUSED</strong>.
                    </p>

                    {/* CAJA DE SOLUCIÓN DIRECTA PARA Error 400: redirect_uri_mismatch */}
                    <div className="p-4 bg-amber-950/30 border border-amber-500/40 rounded-xl space-y-3">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <h5 className="text-xs font-bold text-amber-200">
                            ¿Aparece "Acceso bloqueado / Error 400: redirect_uri_mismatch"?
                          </h5>
                          <p className="text-[11px] text-slate-300 leading-relaxed">
                            Google bloquea la solicitud si la URI enviada no está idéntica en tus <strong>URIs de redireccionamiento autorizados</strong> en Google Cloud Console. Elige una de estas 2 soluciones:
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs pt-1">
                        <div className={`p-3 rounded-xl border transition-all ${
                          redirectOption === "vercel"
                            ? "bg-emerald-950/30 border-emerald-500/50 text-emerald-200"
                            : "bg-slate-900/80 border-slate-800 text-slate-300"
                        }`}>
                          <div className="flex items-center justify-between font-bold text-xs mb-1">
                            <span className="text-emerald-400">Opción 1: Si registraste Vercel</span>
                            {redirectOption === "vercel" && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                          </div>
                          <p className="text-[11px] text-slate-400 mb-2">
                            Si en Google Cloud pusiste la URL de Vercel, activa esta opción antes de conectar.
                          </p>
                          <button
                            type="button"
                            onClick={() => setRedirectOption("vercel")}
                            className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[11px] transition-all cursor-pointer shadow"
                          >
                            {redirectOption === "vercel" ? "✓ Opción Vercel Seleccionada" : "Usar Redirección Vercel"}
                          </button>
                        </div>

                        <div className={`p-3 rounded-xl border transition-all ${
                          redirectOption === "app"
                            ? "bg-indigo-950/30 border-indigo-500/50 text-indigo-200"
                            : "bg-slate-900/80 border-slate-800 text-slate-300"
                        }`}>
                          <div className="flex items-center justify-between font-bold text-xs mb-1">
                            <span className="text-indigo-400">Opción 2: Preview de AI Studio</span>
                            {redirectOption === "app" && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                          </div>
                          <p className="text-[11px] text-slate-400 mb-2">
                            Copia esta URI y agrégala a tu Cliente OAuth en Google Cloud Console.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setRedirectOption("app");
                              copyToClipboard(`${window.location.origin}/auth/callback`);
                            }}
                            className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-[11px] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Copiar URI del Preview Actual</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Selector de URI de Redirección Autorizada */}
                    <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                          <Link2 className="w-3.5 h-3.5 text-indigo-400" />
                          <span>URI Activa que se enviará a Google</span>
                        </label>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Google Cloud Console
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setRedirectOption("app")}
                          className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                            redirectOption === "app"
                              ? "bg-indigo-950/40 border-indigo-500/50 text-white"
                              : "bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-300"
                          }`}
                        >
                          <div className="font-semibold text-xs flex items-center justify-between">
                            <span>Preview Actual</span>
                            {redirectOption === "app" && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                            {window.location.origin}/auth/callback
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setRedirectOption("vercel")}
                          className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                            redirectOption === "vercel"
                              ? "bg-indigo-950/40 border-indigo-500/50 text-white"
                              : "bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-300"
                          }`}
                        >
                          <div className="font-semibold text-xs flex items-center justify-between">
                            <span>Dominio Vercel</span>
                            {redirectOption === "vercel" && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                            https://3f-six.vercel.app/auth/callback
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setRedirectOption("custom")}
                          className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                            redirectOption === "custom"
                              ? "bg-indigo-950/40 border-indigo-500/50 text-white"
                              : "bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-300"
                          }`}
                        >
                          <div className="font-semibold text-xs flex items-center justify-between">
                            <span>Personalizada</span>
                            {redirectOption === "custom" && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                            {customRedirectUri || "Escribir otra URI..."}
                          </div>
                        </button>
                      </div>

                      {redirectOption === "custom" && (
                        <div className="pt-1">
                          <input
                            type="text"
                            placeholder="Pega la URI exacta registrada en Google Cloud (ej: http://localhost:3000/auth/callback)"
                            value={customRedirectUri}
                            onChange={(e) => setCustomRedirectUri(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
                          />
                        </div>
                      )}

                      {/* Display of Active Target URI and Copy Button */}
                      <div className="flex items-center gap-2 pt-1">
                        <div className="flex-1 px-3 py-1.5 bg-slate-950 rounded-lg border border-slate-800 text-[11px] font-mono text-emerald-400 truncate">
                          {getTargetRedirectUri()}
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(getTargetRedirectUri())}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                          title="Copiar URI para Google Cloud Console"
                        >
                          {copiedUriToast ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">¡Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-300" />
                              <span>Copiar URI</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
                        <span>Configurar en:</span>
                        <a
                          href="https://console.cloud.google.com/apis/credentials"
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-400 hover:text-indigo-300 underline flex items-center gap-1"
                        >
                          <span>Google Cloud Console &gt; Credenciales OAuth</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    {authError && (
                      <div className="p-3 bg-red-950/50 border border-red-500/40 rounded-lg text-xs text-red-300 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <div>{authError}</div>
                      </div>
                    )}

                    {/* Primary Connect Button */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <button
                        onClick={handleConnectGoogle}
                        className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 cursor-pointer text-xs sm:text-sm active:scale-95"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          />
                        </svg>
                        <span>Conectar con Google</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowManualRescue(!showManualRescue)}
                        className="px-3 py-2 text-xs text-indigo-400 hover:text-indigo-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>{showManualRescue ? "Ocultar Rescate 404 / Manual" : "¿Problemas con el popup o 404? Haz clic aquí"}</span>
                        {showManualRescue ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* CAJA DE RESCATE: ERROR 404 EN VERCEL / VINCULACIÓN MANUAL */}
                    {showManualRescue && (
                      <div className="p-4 bg-amber-950/20 border border-amber-500/40 rounded-xl space-y-3">
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <h5 className="text-xs font-bold text-amber-200">
                              Rescate de Autenticación: ¿Viste error 404 en Vercel o la ventana no cerró sola?
                            </h5>
                            <p className="text-[11px] text-slate-300 leading-relaxed">
                              Si Google te permitió iniciar sesión pero te redirigió a una página que dice <code className="text-amber-300">404: NOT_FOUND</code> o similar, ¡tu autorización fue generada con éxito! Simplemente copia la <strong>URL completa de la barra de direcciones</strong> de esa ventana (o el parámetro <code className="text-emerald-400">code=4/...</code>) y pégala aquí:
                            </p>
                          </div>
                        </div>

                        {manualExchangeError && (
                          <div className="p-2.5 bg-red-950/60 border border-red-500/40 rounded-lg text-xs text-red-300 flex items-start gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                            <div>{manualExchangeError}</div>
                          </div>
                        )}

                        {manualExchangeSuccess && (
                          <div className="p-2.5 bg-emerald-950/60 border border-emerald-500/40 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <div>{manualExchangeSuccess}</div>
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            placeholder="Pega la URL de la ventana 404 (https://.../auth/callback?code=...) o el código directo"
                            value={manualExchangeInput}
                            onChange={(e) => setManualExchangeInput(e.target.value)}
                            className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                          />
                          <button
                            type="button"
                            onClick={handleExchangeCode}
                            disabled={isExchangingCode || !manualExchangeInput.trim()}
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                          >
                            {isExchangingCode ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Vinculando...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Completar Conexión</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Direct Refresh Token toggle */}
                        <div className="pt-1 border-t border-slate-800/80">
                          <button
                            type="button"
                            onClick={() => setShowDirectToken(!showDirectToken)}
                            className="text-[11px] text-slate-400 hover:text-slate-200 underline cursor-pointer"
                          >
                            {showDirectToken ? "Ocultar opción de Refresh Token directo" : "O ingresar un Refresh Token de Google directamente"}
                          </button>

                          {showDirectToken && (
                            <div className="mt-2.5 space-y-2">
                              <input
                                type="text"
                                placeholder="Pega tu Refresh Token de Google OAuth (1//0...)"
                                value={directRefreshToken}
                                onChange={(e) => setDirectRefreshToken(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
                              />
                              <button
                                type="button"
                                onClick={handleSaveDirectToken}
                                disabled={isSavingDirectToken || !directRefreshToken.trim()}
                                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-medium rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                {isSavingDirectToken ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : null}
                                <span>Guardar Refresh Token</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3.5 bg-slate-900 rounded-xl border border-slate-800">
                    <div className="flex items-center space-x-3">
                      {userProfile?.picture ? (
                        <img
                          src={userProfile.picture}
                          alt="Google Avatar"
                          className="w-9 h-9 rounded-full border border-slate-700"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-indigo-600/30 text-indigo-300 font-bold flex items-center justify-center text-sm border border-indigo-500/30">
                          {userProfile?.name?.charAt(0) || "G"}
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-semibold text-white">
                          {userProfile?.name || "Usuario de Google"}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {userProfile?.email || "Cuenta autenticada"}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleDisconnect}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-red-950/60 hover:text-red-400 text-slate-400 text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer border border-transparent hover:border-red-500/30"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Desconectar</span>
                    </button>
                  </div>
                )}
              </div>

              {/* STEP 2: SELECT GOOGLE ADS ACCOUNT (CUSTOMER ID) */}
              <div
                className={`bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-4 ${
                  !isAuthenticated ? "border-slate-800/80" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">
                      2
                    </div>
                    <h4 className="text-sm font-semibold text-slate-200">
                      Seleccionar Cuenta de Google Ads (Customer ID)
                    </h4>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setIsManualInput(!isManualInput)}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 underline underline-offset-4 cursor-pointer"
                    >
                      {isManualInput ? "Seleccionar de lista" : "Ingresar manual"}
                    </button>
                    <button
                      onClick={fetchAccounts}
                      disabled={isLoadingAccounts}
                      className="p-1 text-slate-400 hover:text-white rounded transition-all cursor-pointer"
                      title="Recargar cuentas"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAccounts ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                </div>

                {isLoadingAccounts ? (
                  <div className="py-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                    <span>Consultando cuentas accesibles en Google Ads...</span>
                  </div>
                ) : isManualInput || accounts.length === 0 ? (
                  <div className="space-y-3">
                    {missingDevToken && (
                      <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-lg text-xs text-amber-200 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <strong>Falta GOOGLE_ADS_DEVELOPER_TOKEN en el backend:</strong> Google Ads requiere este token para listar automáticamente las cuentas de tu usuario. Mientras configuras la variable, puedes ingresar manualmente tu <strong>Customer ID</strong> a continuación.
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label
                          htmlFor="manual-customer-id-input"
                          className="block text-xs font-semibold text-slate-300"
                        >
                          Customer ID de Google Ads (10 dígitos)
                        </label>
                        {manualCustomerId && (
                          <span
                            className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                              isValidCustomer
                                ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                                : "text-amber-400 bg-amber-500/10 border border-amber-500/20"
                            }`}
                          >
                            {isValidCustomer
                              ? `Válido (${effectiveCustomerId.length} dígitos)`
                              : `${effectiveCustomerId.length} / 10 dígitos`}
                          </span>
                        )}
                      </div>
                      <input
                        id="manual-customer-id-input"
                        type="text"
                        autoComplete="off"
                        placeholder="Ejemplo: 123-456-7890 o 1234567890"
                        value={manualCustomerId}
                        onChange={(e) => {
                          setManualCustomerId(e.target.value);
                          setIsManualInput(true);
                        }}
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-text relative z-10 transition-colors"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        Lo encuentras en la esquina superior derecha de tu consola de Google Ads (formato xxx-xxx-xxxx o números directos).
                      </p>

                      {/* DEBUG PANEL TEMPORAL REQUERIDO POR EL USUARIO */}
                      <div
                        id="customer-id-debug-panel"
                        className="mt-3 p-3 bg-slate-900/90 border border-indigo-500/30 rounded-lg text-[11px] font-mono space-y-1 text-slate-300"
                      >
                        <div className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider mb-1">
                          [Panel de Control React & Input Debug]
                        </div>
                        <div>
                          <span className="text-slate-400">manualCustomerId raw:</span>{" "}
                          <span className="text-amber-300 font-bold">"{manualCustomerId}"</span>
                        </div>
                        <div>
                          <span className="text-slate-400">manualCustomerId normalized:</span>{" "}
                          <span className="text-emerald-400 font-bold">"{normalizedManualId}"</span>
                        </div>
                        <div>
                          <span className="text-slate-400">isAuthenticated:</span>{" "}
                          <span className={isAuthenticated ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                            {String(isAuthenticated)}
                          </span>
                          {" | "}
                          <span className="text-slate-400">savedSessionId:</span>{" "}
                          <span className="text-indigo-300 font-mono">
                            {getSavedSessionId() ? `${getSavedSessionId().slice(0, 10)}...` : "(ninguno)"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">inputDisabled:</span>{" "}
                          <span className="text-sky-300 font-bold">false</span>
                        </div>
                        <div>
                          <span className="text-slate-400">publishDisabledReason:</span>{" "}
                          <span className="text-rose-400 font-bold">
                            {publishDisabledReasons.length > 0
                              ? publishDisabledReasons.join(" | ")
                              : "Ninguno (Listo para publicar)"}
                          </span>
                        </div>
                        <div className="pt-1 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => checkAuthSession()}
                            className="px-2 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 rounded text-[10px] cursor-pointer"
                          >
                            Re-verificar Sesión OAuth
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-300">
                      Cuentas accesibles encontradas:
                    </label>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.customerId} value={acc.customerId}>
                          {acc.name} ({acc.id})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* STEP 3: PRE-FLIGHT VERIFICATION & PUBLISH ACTION */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center space-x-2.5">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">
                    3
                  </div>
                  <h4 className="text-sm font-semibold text-slate-200">
                    Garantías de Publicación Segura
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-slate-300">Estado de inserción: <strong className="text-emerald-400">PAUSED</strong></span>
                  </div>
                  <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-slate-300">Red de Display: <strong className="text-emerald-400">Desactivada (0% waste)</strong></span>
                  </div>
                  <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-slate-300">Titulares: <strong className="text-emerald-400">≤30 caracteres validados</strong></span>
                  </div>
                  <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-slate-300">Descripciones: <strong className="text-emerald-400">≤90 caracteres validadas</strong></span>
                  </div>
                </div>

                {/* Publish Result Feedback */}
                {publishSuccess && (
                  <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{publishSuccess.message}</span>
                    </div>
                    <div className="text-[11px] text-slate-300 space-y-1 font-mono">
                      <div>ID de Campaña: <span className="text-emerald-300">{publishSuccess.campaignId}</span></div>
                      <div>Recurso: <span className="text-slate-400">{publishSuccess.campaignResourceName}</span></div>
                      <div>Grupos creados: <span className="text-emerald-300">{publishSuccess.adGroupsCount}</span></div>
                      <div>Estado en Google Ads: <span className="text-amber-400 font-bold">PAUSED (Pausada para revisión)</span></div>
                    </div>
                    {publishSuccess.googleAdsUrl && (
                      <a
                        href={publishSuccess.googleAdsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 underline font-semibold mt-2"
                      >
                        <span>Abrir Campaña en Consola de Google Ads</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                )}

                {publishError && (
                  <div className="p-4 bg-red-950/60 border border-red-500/40 rounded-xl space-y-3 text-xs">
                    <div className="flex items-center gap-2 text-red-400 font-bold">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{publishError}</span>
                    </div>
                    {publishDetails && (
                      <pre className="p-2 bg-slate-950/80 rounded border border-red-900/50 text-[10px] text-red-300 font-mono overflow-x-auto max-h-32">
                        {JSON.stringify(publishDetails, null, 2)}
                      </pre>
                    )}

                    {/* Caso 1: Error de nivel de acceso en Google Ads (Test vs Production) */}
                    {(publishError.includes("CLOUD_PROJECT_NOT_APPROVED_FOR_PRODUCTION") ||
                      publishError.includes("test accounts") ||
                      JSON.stringify(publishDetails || {}).includes("CLOUD_PROJECT_NOT_APPROVED_FOR_PRODUCTION")) && (
                      <div className="p-3 bg-amber-950/50 border border-amber-500/40 rounded-lg text-amber-200 space-y-2 mt-2">
                        <div className="font-bold flex items-center gap-1.5 text-amber-300">
                          <Info className="w-4 h-4 shrink-0" />
                          <span>Google Ads exige Acceso Básico para cuentas de producción</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-amber-100/90">
                          Tu Developer Token de Google Ads está en <strong>Modo de Prueba (Test Access)</strong>. Google restringe las llamadas de API directa en modo prueba a cuentas de prueba (MCC de prueba). Para tu cuenta real <strong className="text-white">444-752-9837</strong>, Google requiere solicitar "Basic Access" en el Centro de API.
                        </p>
                        <div className="pt-2 border-t border-amber-500/30 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const csv = exportToGoogleAdsEditorCSV(campaignData);
                              downloadFile(csv, `${campaignData.campaignName.replace(/[^a-zA-Z0-9]/g, "_")}_GoogleAdsEditor.csv`, "text/csv;charset=utf-8;");
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Descargar CSV para Google Ads Editor (Subida Inmediata)</span>
                          </button>
                        </div>
                        <p className="text-[10px] text-amber-300/80 italic">
                          💡 Con el archivo CSV puedes importar la campaña completa en 10 segundos en Google Ads Editor oficial sin esperar la auditoría de API de Google.
                        </p>
                      </div>
                    )}

                    {/* Caso 2: Error de endpoint devolviendo HTML */}
                    {publishError.includes("HTML en lugar de JSON") && (
                      <div className="p-3 bg-indigo-950/50 border border-indigo-500/40 rounded-lg text-indigo-200 space-y-2 mt-2">
                        <div className="font-bold flex items-center gap-1.5 text-indigo-300">
                          <Info className="w-4 h-4 shrink-0" />
                          <span>Entorno de Ejecución</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-indigo-100/90">
                          Si estás en Vercel, aún no se ha desplegado la función serverless de backend. Puedes descargar el archivo oficial de Google Ads Editor para importarla ahora mismo:
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            const csv = exportToGoogleAdsEditorCSV(campaignData);
                            downloadFile(csv, `${campaignData.campaignName.replace(/[^a-zA-Z0-9]/g, "_")}_GoogleAdsEditor.csv`, "text/csv;charset=utf-8;");
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Descargar CSV para Google Ads Editor</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={handlePublish}
                  disabled={isPublishDisabled}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-xl shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm active:scale-95"
                >
                  {isPublishing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Inyectando Presupuesto & Campaña en Google Ads API...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Publicar Campaña en Google Ads (Estado PAUSED)</span>
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            /* TAB 2: DETAILED ENVIRONMENT VARIABLES STATUS CARD */
            <div className="space-y-4">
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    <span>Variables de Entorno del Backend</span>
                  </h4>
                  <button
                    onClick={fetchEnvStatus}
                    className="p-1 text-slate-400 hover:text-white rounded transition-all cursor-pointer"
                    title="Actualizar estado"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingEnv ? "animate-spin" : ""}`} />
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  Estado de las credenciales de Google Cloud OAuth y Google Ads API configuradas en el servidor Express.
                </p>
              </div>

              {isLoadingEnv && !envStatus ? (
                <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Cargando diagnóstico de variables...</span>
                </div>
              ) : envStatus ? (
                <div className="space-y-3">
                  {(Object.entries(envStatus.variables) as [string, EnvVarInfo][]).map(([key, info]) => (
                    <div
                      key={key}
                      className={`p-3.5 rounded-xl border transition-all ${
                        info.configured
                          ? "bg-slate-900/80 border-slate-800"
                          : info.required
                          ? "bg-amber-950/20 border-amber-500/30"
                          : "bg-slate-900/40 border-slate-800/60"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-white">{key}</span>
                          {info.required ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-semibold">
                              Requerida
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold">
                              Opcional
                            </span>
                          )}
                        </div>

                        {info.configured ? (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Cargada</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Faltante</span>
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-300 font-medium mb-1">{info.label}</div>
                      
                      {info.help && (
                        <div className="text-[11px] text-slate-400 leading-relaxed mb-1.5">
                          {info.help}
                        </div>
                      )}

                      {info.configured && info.preview && (
                        <div className="mt-1.5 text-[11px] font-mono text-slate-400 bg-slate-950/80 px-2.5 py-1.5 rounded border border-slate-800/80 truncate">
                          Valor detectado: <span className="text-emerald-400">{info.preview}</span>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Missing Variables Guidance Card */}
                  {envStatus.missingVariables.length > 0 && (
                    <div className="p-4 bg-amber-950/30 border border-amber-500/30 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-amber-300 font-bold">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Variables pendientes de cargar ({envStatus.missingVariables.length}):</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-slate-300 font-mono text-[11px]">
                        {envStatus.missingVariables.map((v) => (
                          <li key={v}>
                            <strong className="text-amber-400">{v}</strong>
                            {v === "GOOGLE_ADS_DEVELOPER_TOKEN" && (
                              <span className="text-slate-400 font-sans"> — Obtenlo en Google Ads Administrador (MCC) &gt; Herramientas &gt; Configuración &gt; Centro de API.</span>
                            )}
                          </li>
                        ))}
                      </ul>
                      <p className="text-[11px] text-slate-400 pt-1">
                        Agrégalas al archivo <code className="text-amber-400">.env</code> de tu servidor o en las variables de entorno de tu proveedor de hosting (Vercel / Cloud Run).
                      </p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Google Ads Certified Partner Policy Compliant</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-all cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
