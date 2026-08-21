/**
 * Mylogiz CPLEX Client Service
 * 
 * Secure client-side service for communicating with CRM server-side integration endpoints.
 * Never stores or transmits unmasked tokens on the client.
 */

import {
  CPLEXIntegrationConfig,
  CPLEXUsageSummary,
  CPLEXSyncResult,
  CPLEXApiLog,
  CPLEXDateRangeType,
  DEFAULT_CPLEX_DATA_MAPPINGS
} from "../../types";

export const cplexService = {
  /**
   * Get current connection status and public config (tokens are masked)
   */
  async getConfig(): Promise<CPLEXIntegrationConfig> {
    try {
      const res = await fetch("/api/integrations/cplex/config");
      if (!res.ok) {
        throw new Error("Failed to fetch CPLEX config");
      }
      return await res.json();
    } catch (err) {
      console.error("Error fetching CPLEX config:", err);
      return {
        systemName: "Mylogiz CPLEX",
        baseUrl: "https://app.mylogiz.ai/th/mylogiz-cplex/admin/dashboard",
        authType: "bearer_token",
        customerIdentifier: "customerCode",
        dataMapping: DEFAULT_CPLEX_DATA_MAPPINGS,
        status: "disconnected",
        lastConnectedAt: null,
        lastSyncedAt: null,
        isEnabled: false
      };
    }
  },

  /**
   * Save configuration to backend securely
   */
  async saveConfig(
    config: Partial<CPLEXIntegrationConfig>,
    rawToken?: string
  ): Promise<{ success: boolean; config: CPLEXIntegrationConfig; message?: string }> {
    const res = await fetch("/api/integrations/cplex/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...config,
        rawSecretToken: rawToken || undefined
      })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "ไม่สามารถบันทึกการตั้งค่าได้");
    }
    return data;
  },

  /**
   * Test connection to CPLEX system
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    responseTimeMs: number;
    status: "connected" | "error";
  }> {
    const res = await fetch("/api/integrations/cplex/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    const data = await res.json();
    return data;
  },

  /**
   * Trigger on-demand sync with CPLEX
   */
  async syncNow(): Promise<{
    success: boolean;
    syncResult: CPLEXSyncResult;
    message: string;
  }> {
    const res = await fetch("/api/integrations/cplex/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "เกิดข้อผิดพลาดในการซิงค์ข้อมูล");
    }
    return data;
  },

  /**
   * Fetch customer usage summary with date range filtering
   */
  async getCustomerUsage(
    customerId: string,
    customerCode?: string,
    phone?: string,
    email?: string,
    externalCustomerId?: string,
    dateRange?: { type: CPLEXDateRangeType; startDate?: string; endDate?: string }
  ): Promise<{
    success: boolean;
    isConfigured: boolean;
    usage?: CPLEXUsageSummary;
    errorMessage?: string;
  }> {
    const params = new URLSearchParams();
    if (customerCode) params.append("customerCode", customerCode);
    if (phone) params.append("phone", phone);
    if (email) params.append("email", email);
    if (externalCustomerId) params.append("externalCustomerId", externalCustomerId);
    if (dateRange?.type) params.append("rangeType", dateRange.type);
    if (dateRange?.startDate) params.append("startDate", dateRange.startDate);
    if (dateRange?.endDate) params.append("endDate", dateRange.endDate);

    const query = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`/api/customers/${encodeURIComponent(customerId)}/cplex${query}`);
    const data = await res.json();
    return data;
  },

  /**
   * Get API interaction logs
   */
  async getLogs(): Promise<CPLEXApiLog[]> {
    try {
      const res = await fetch("/api/integrations/cplex/logs");
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  /**
   * Clear API interaction logs
   */
  async clearLogs(): Promise<boolean> {
    try {
      const res = await fetch("/api/integrations/cplex/logs", { method: "DELETE" });
      return res.ok;
    } catch {
      return false;
    }
  }
};
