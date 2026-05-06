/**
 * AI Configuration Helper — SERVER-SIDE ONLY.
 *
 * Loads OpenAI credentials for a tenant from the `ai_settings` DB table.
 * Falls back to process.env for backward compatibility while migrating.
 *
 * IMPORTANT: Never import this in client components or return the apiKey
 * in any API response. API keys must stay server-side only.
 */

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Returns { apiKey, model } for the given tenant.
 * Tries the `ai_settings` table first; falls back to process.env.
 *
 * @param {string|null|undefined} tenantId
 * @returns {Promise<{ apiKey: string, model: string }>}
 */
export async function getAIConfig(tenantId) {
  if (tenantId) {
    try {
      const admin = createAdminClient();
      const { data } = await admin
        .from("ai_settings")
        .select("openai_api_key, openai_model")
        .eq("tenant_id", tenantId)
        .single();

      if (data?.openai_api_key) {
        return {
          apiKey: data.openai_api_key,
          model: data.openai_model || "gpt-4o-mini",
        };
      }
    } catch {
      // DB lookup failed — fall through to env fallback
    }
  }

  // Fallback: env variables (backward compatible during migration)
  return {
    apiKey: process.env.OPENAI_API_KEY ?? "",
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
  };
}
