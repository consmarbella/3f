import React, { useEffect, useState } from "react";
import { CheckCircle2, Copy, Check, ArrowLeft, ShieldCheck, ExternalLink } from "lucide-react";

interface OAuthCallbackHandlerProps {
  onCodeDetected?: (code: string, rawUrl: string) => void;
}

export const OAuthCallbackHandler: React.FC<OAuthCallbackHandlerProps> = ({ onCodeDetected }) => {
  const [code, setCode] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [isPopup, setIsPopup] = useState<boolean>(false);
  const [notifiedOpener, setNotifiedOpener] = useState<boolean>(false);

  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const extractedCode = urlParams.get("code");
      
      if (extractedCode) {
        setCode(extractedCode);
        const hasOpener = !!(window.opener && !window.opener.closed);
        setIsPopup(hasOpener);

        if (hasOpener) {
          try {
            window.opener.postMessage(
              {
                type: "GOOGLE_ADS_AUTH_CODE",
                code: extractedCode,
                rawUrl: window.location.href,
                redirectUri: `${window.location.origin}/auth/callback`,
              },
              "*"
            );
            setNotifiedOpener(true);

            // Also save to localStorage so the main app can read it if postMessage was missed
            localStorage.setItem("gads_pending_auth_code", extractedCode);
            localStorage.setItem("gads_pending_auth_url", window.location.href);

            // Attempt to close popup automatically after a short delay
            setTimeout(() => {
              try {
                window.close();
              } catch {}
            }, 2500);
          } catch (e) {
            console.warn("Could not postMessage to opener:", e);
          }
        } else {
          // Store in localStorage for single-tab flow
          localStorage.setItem("gads_pending_auth_code", extractedCode);
          localStorage.setItem("gads_pending_auth_url", window.location.href);
          if (onCodeDetected) {
            onCodeDetected(extractedCode, window.location.href);
          }
        }
      }
    } catch (e) {
      console.error("Error reading OAuth parameters:", e);
    }
  }, [onCodeDetected]);

  const handleCopyCode = () => {
    if (!code) return;
    try {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  const handleReturnToApp = () => {
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            ¡Autorización de Google Recibida!
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            {isPopup && notifiedOpener
              ? "El código fue enviado a tu ventana principal de la aplicación. Esta ventana se cerrará en breve."
              : "Google ha autorizado tu acceso. Puedes copiar el código o volver a la aplicación."}
          </p>
        </div>

        {code && (
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-left">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold flex items-center gap-1.5 text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Código de Autorización OAuth
              </span>
              <span className="text-[10px] font-mono text-emerald-400">Google Ads API</span>
            </div>
            <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 font-mono text-xs text-emerald-300 break-all select-all">
              {code}
            </div>
            <div className="flex justify-end pt-1">
              <button
                onClick={handleCopyCode}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-300" />
                    <span>Copiar Código</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={handleReturnToApp}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al Panel de la App</span>
          </button>
          {isPopup && (
            <button
              onClick={() => window.close()}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs sm:text-sm transition-all cursor-pointer"
            >
              Cerrar Ventana
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
