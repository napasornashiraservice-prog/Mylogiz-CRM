import { Affiliate, Lead, LeadStatus } from "../types";

/**
 * Generates the next sequential Affiliate ID in format AFF0001 (e.g. AFF0001, AFF0002, ...).
 */
export function generateNextAffiliateId(existingAffiliates: Affiliate[]): string {
  let maxNum = 0;

  for (const aff of existingAffiliates) {
    if (!aff.affiliateId) continue;
    const match = aff.affiliateId.match(/AFF-?0*(\d+)/i) || aff.affiliateId.match(/(\d+)/);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  const nextNum = maxNum + 1;
  const padded = nextNum.toString().padStart(4, "0");
  return `AFF${padded}`;
}

/**
 * Checks if an affiliate ID is unique across all existing affiliates.
 */
export function isAffiliateIdUnique(
  affiliateId: string, 
  existingAffiliates: Affiliate[], 
  currentDocId?: string
): boolean {
  const normalized = affiliateId.trim().toUpperCase();
  if (!normalized) return false;
  return !existingAffiliates.some(
    a => a.id !== currentDocId && a.affiliateId.trim().toUpperCase() === normalized
  );
}

/**
 * Checks if the current user has permission to manage (create/edit/delete) affiliates.
 * SuperAdmins ("Phere" / "Jack") or Managers have full management rights.
 */
export function canManageAffiliates(currentUser?: string | null, salespersons?: string[]): boolean {
  if (!currentUser) return false;
  const normalized = currentUser.trim().toLowerCase();
  if (normalized === "phere" || normalized === "jack") return true;
  if (salespersons && salespersons.length > 0) {
    const firstUser = salespersons[0]?.trim().toLowerCase();
    if ((firstUser === "phere" || firstUser === "jack") && (normalized === "phere" || normalized === "jack")) {
      return true;
    }
  }
  return false;
}

/**
 * Calculates aggregate stats for an affiliate based on the leads list.
 */
export function getAffiliateStats(affiliate: Affiliate, leads: Lead[]) {
  const targetId = affiliate.affiliateId ? affiliate.affiliateId.trim().toUpperCase() : "";
  const referredLeads = leads.filter(l => {
    if (!l.affiliateId || !targetId) return false;
    return l.affiliateId.trim().toUpperCase() === targetId;
  });

  const totalReferred = referredLeads.length;
  const registeredCount = referredLeads.filter(
    l => l.status === LeadStatus.REGISTERED || l.status === LeadStatus.ACTIVATED || l.status === LeadStatus.REGULAR
  ).length;
  const activeCount = referredLeads.filter(
    l => l.status === LeadStatus.ACTIVATED || l.status === LeadStatus.REGULAR
  ).length;
  const regularCount = referredLeads.filter(
    l => l.status === LeadStatus.REGULAR
  ).length;
  const pipelineCount = referredLeads.filter(
    l => l.status !== LeadStatus.REGISTERED && 
         l.status !== LeadStatus.ACTIVATED && 
         l.status !== LeadStatus.REGULAR &&
         l.status !== LeadStatus.LOST &&
         l.status !== LeadStatus.NOT_INTERESTED
  ).length;

  return {
    referredLeads,
    totalReferred,
    registeredCount,
    activeCount,
    regularCount,
    pipelineCount
  };
}
