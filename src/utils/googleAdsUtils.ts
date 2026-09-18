import { CampaignStrategy, Sitelink } from "../types";

export interface ValidationItem {
  text: string;
  charCount: number;
  maxAllowed: number;
  isValid: boolean;
  hasDKI: boolean;
}

export function validateHeadline(text: string): ValidationItem {
  const maxAllowed = 30;
  const charCount = text.length;
  const hasDKI = /{KeyWord:?/i.test(text);
  return {
    text,
    charCount,
    maxAllowed,
    isValid: charCount <= maxAllowed && !hasDKI,
    hasDKI,
  };
}

export function validateDescription(text: string): ValidationItem {
  const maxAllowed = 90;
  const charCount = text.length;
  const hasDKI = /{KeyWord:?/i.test(text);
  return {
    text,
    charCount,
    maxAllowed,
    isValid: charCount <= maxAllowed && !hasDKI,
    hasDKI,
  };
}

/**
 * Corta de forma estricta al límite exacto de Google Ads para evitar errores de la API.
 * Equivalente TypeScript de sanitize_google_ads_payload(headlines, descriptions)
 */
export function sanitizeGoogleAdsPayload(
  headlines: string[],
  descriptions: string[]
): { cleanHeadlines: string[]; cleanDescriptions: string[] } {
  // Corta de forma estricta al límite exacto de Google Ads para evitar errores de la API
  const cleanHeadlines = headlines
    .map((h) => (typeof h === "string" ? h.slice(0, 30).trim() : ""))
    .filter((h) => h.length > 0);

  const cleanDescriptions = descriptions
    .map((d) => (typeof d === "string" ? d.slice(0, 90).trim() : ""))
    .filter((d) => d.length > 0);

  // Asegurar mínimos obligatorios si faltan
  if (cleanHeadlines.length < 3) {
    throw new Error("Se requieren al menos 3 titulares válidos.");
  }
  if (cleanDescriptions.length < 2) {
    throw new Error("Se requieren al menos 2 descripciones válidas.");
  }

  return { cleanHeadlines, cleanDescriptions };
}

export function validateSitelink(sitelink: Sitelink) {
  return {
    textValid: sitelink.text.length <= 25,
    textCount: sitelink.text.length,
    desc1Valid: sitelink.description1.length <= 35,
    desc1Count: sitelink.description1.length,
    desc2Valid: sitelink.description2.length <= 35,
    desc2Count: sitelink.description2.length,
    isFullyValid:
      sitelink.text.length <= 25 &&
      sitelink.description1.length <= 35 &&
      sitelink.description2.length <= 35,
  };
}

export function exportToGoogleAdsEditorCSV(campaign: CampaignStrategy): string {
  const rows: string[][] = [];

  // CSV Headers for Google Ads Editor (Responsive Search Ads & Keywords)
  rows.push([
    "Campaign",
    "Ad Group",
    "Action",
    "Status",
    "Criterion Type",
    "Keyword / Headline 1",
    "Match Type / Headline 2",
    "Headline 3",
    "Headline 4",
    "Headline 5",
    "Headline 6",
    "Headline 7",
    "Headline 8",
    "Headline 9",
    "Headline 10",
    "Headline 11",
    "Headline 12",
    "Headline 13",
    "Headline 14",
    "Headline 15",
    "Description 1",
    "Description 2",
    "Description 3",
    "Description 4",
    "Path 1",
    "Path 2",
  ]);

  const campName = `"${campaign.campaignName.replace(/"/g, '""')}"`;

  // Process Ad Groups, Ads & Keywords
  campaign.adGroups.forEach((group) => {
    const groupName = `"${group.name.replace(/"/g, '""')}"`;

    // Add Ad Row
    group.ads.forEach((ad) => {
      const row: string[] = [
        campName,
        groupName,
        "Add",
        "Enabled",
        "Responsive search ad",
      ];

      // Add 15 Headlines
      for (let i = 0; i < 15; i++) {
        const headline = ad.headlines[i] || "";
        row.push(`"${headline.replace(/"/g, '""')}"`);
      }

      // Add 4 Descriptions
      for (let i = 0; i < 4; i++) {
        const desc = ad.descriptions[i] || "";
        row.push(`"${desc.replace(/"/g, '""')}"`);
      }

      // Paths
      row.push(`"${(ad.path1 || "").replace(/"/g, '""')}"`);
      row.push(`"${(ad.path2 || "").replace(/"/g, '""')}"`);

      rows.push(row);
    });

    // Add Keywords Rows
    group.keywords.forEach((kw) => {
      let cleanKw = kw.trim();
      let matchType = "Phrase";
      if (cleanKw.startsWith("[") && cleanKw.endsWith("]")) {
        matchType = "Exact";
        cleanKw = cleanKw.slice(1, -1);
      } else if (cleanKw.startsWith('"') && cleanKw.endsWith('"')) {
        matchType = "Phrase";
        cleanKw = cleanKw.slice(1, -1);
      } else if (cleanKw.startsWith("+")) {
        matchType = "Broad";
      }

      const kwRow = [
        campName,
        groupName,
        "Add",
        "Enabled",
        "Keyword",
        `"${cleanKw.replace(/"/g, '""')}"`,
        matchType,
      ];
      rows.push(kwRow);
    });

    // Add Negative Keywords Rows
    group.negatives.forEach((neg) => {
      let cleanNeg = neg.trim();
      let matchType = "Phrase";
      if (cleanNeg.startsWith("-[")) {
        matchType = "Negative Exact";
        cleanNeg = cleanNeg.replace(/^-\[/, "").replace(/\]$/, "");
      } else if (cleanNeg.startsWith('-"')) {
        matchType = "Negative Phrase";
        cleanNeg = cleanNeg.replace(/^-"/, "").replace(/"$/, "");
      } else {
        cleanNeg = cleanNeg.replace(/^-/, "");
      }

      const negRow = [
        campName,
        groupName,
        "Add",
        "Enabled",
        "Negative Keyword",
        `"${cleanNeg.replace(/"/g, '""')}"`,
        matchType,
      ];
      rows.push(negRow);
    });
  });

  return rows.map((r) => r.join(",")).join("\n");
}

export function downloadFile(filename: string, content: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
