// Liens de suivi UTM : la source et le support viennent du réseau choisi (modifiables dans le studio › Réglages).

export const slug = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function buildUtm(url, { source, medium = "social", campaign, content }) {
  const u = new URL(url);
  u.searchParams.set("utm_source", source);
  u.searchParams.set("utm_medium", medium);
  if (campaign) u.searchParams.set("utm_campaign", slug(campaign));
  if (content) u.searchParams.set("utm_content", slug(content));
  return u.href;
}

export async function remember(link, campaign) {
  const { utmHistory = [], campaigns = [] } = await chrome.storage.local.get(["utmHistory", "campaigns"]);
  utmHistory.unshift({ link, at: Date.now() });
  await chrome.storage.local.set({
    utmHistory: utmHistory.slice(0, 20), lastLink: link,
    campaigns: campaign ? [...new Set([slug(campaign), ...campaigns])].slice(0, 30) : campaigns,
  });
}
