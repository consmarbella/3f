import React, { useState, useEffect } from "react";
import { GoogleAdsPublishModal } from "./GoogleAdsPublishModal";
import { Building2, CheckCircle2 } from "lucide-react";

interface DirectApiPublishButtonProps {
  campaignData: any;
}

export function DirectApiPublishButton({ campaignData }: DirectApiPublishButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Check if session is already active
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/google-ads/session");
        if (res.ok) {
          const data = await res.json();
          setIsConnected(!!data.authenticated);
        }
      } catch (e) {
        // Silently fail
      }
    };
    checkSession();
  }, [isModalOpen]);

  return (
    <>
      <button
        id="btn-direct-api-publish"
        onClick={() => setIsModalOpen(true)}
        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-md shadow-emerald-600/25 transition-all flex items-center gap-2 cursor-pointer text-xs sm:text-sm active:scale-95 border border-emerald-400/30"
      >
        <Building2 className="w-4 h-4 text-emerald-200" />
        <span>Publicar en Google Ads (PAUSED)</span>
        {isConnected && (
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" title="Conectado a Google Ads" />
        )}
      </button>

      {isModalOpen && (
        <GoogleAdsPublishModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          campaignData={campaignData}
        />
      )}
    </>
  );
}
