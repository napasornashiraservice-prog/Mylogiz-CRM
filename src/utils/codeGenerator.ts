import { Lead } from "../types";

/**
 * Generates the next sequential customer code starting from ML000001.
 * Searches through existing leads to find the highest existing number.
 */
export function generateNextCustomerCode(leads: Lead[]): string {
  let maxNum = 0;

  for (const lead of leads) {
    if (!lead.customerCode) continue;
    const codeStr = lead.customerCode.trim();

    // Match patterns like ML000001, ML1, MLZ-000001, MLZ-1234
    // We match ML or MLZ followed by optional non-digits, then capture digits
    const match = codeStr.match(/ML[Z-]*0*(\d+)/i) || codeStr.match(/(\d+)/);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  const nextNum = maxNum + 1;
  return `ML${nextNum.toString().padStart(6, "0")}`;
}
