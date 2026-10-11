/**
 * Auto-detect workflow-fit vision defaults (SPEC-5 §3.3, PLAN-5 §1.4/step 2).
 *
 * On a fresh install (or `/vision clear`), the extension auto-detects the
 * vision model at `session_start` from `models.json` — preferring the
 * `Ollama` provider's vision models (Ollama Cloud, per AGENTS.md
 * "flat-rate, private, open-weight primary") for the primary, and the first
 * vision-capable model under a *different* provider for the **fallback**
 * (the frontier-escalation path per AGENTS.md "escalate to the proper
 * frontier model for that job").
 *
 * Pure over `Model<Api>[]` — no I/O, no pi runtime. Deterministic (sorted by
 * `(provider, id)` so the registry's iteration order doesn't matter).
 *
 * **The `:cloud` preference is implicit** (PLAN-5 §1.4): it falls out of the
 * vision-capable filter + the sort by id, NOT a separate enforced filter. On
 * RECTOR's machine the only Ollama vision models are `:cloud` ones, so the
 * sort yields an Ollama Cloud model. If a local Ollama vision model is added
 * that the user doesn't want as primary, they set the primary explicitly
 * (auto-detect only fires when both provider + model are unset).
 */
import type { Api, Model } from "@earendil-works/pi-ai";

export interface DetectedDefaults {
  provider: string | undefined;
  model: string | undefined;
}

export const PREFERRED_PRIMARY_PROVIDER = "9router";
export const FALLBACK_PRIMARY_PROVIDER = "Ollama";

/**
 * Priority order for models under 9router when available.
 */
const ROUTER_MODEL_PREFERENCES = [
  "ag/gemini-3.8-flash-high",
  "ag/gemini-3.8-flash-medium",
  "cc/claude-sonnet-5-5",
];

/**
 * Scan vision-capable models + pick a workflow-fit PRIMARY.
 *
 * Algorithm:
 * 1. Filter to vision-capable models (`input` includes "image").
 * 2. If none → undefined.
 * 3. Primary: prefer "9router" provider, specifically fast vision models
 *    (Gemini flash / Claude Sonnet), then Ollama, then sorted (provider, id).
 */
export function autoDetectDefaults(models: Model<Api>[]): DetectedDefaults {
  const visionModels = models.filter((m) => m.input?.includes("image"));
  if (visionModels.length === 0) {
    return { provider: undefined, model: undefined };
  }

  // 1. Try 9router preferred models
  const routerVision = visionModels.filter((m) => m.provider === PREFERRED_PRIMARY_PROVIDER);
  if (routerVision.length > 0) {
    for (const pref of ROUTER_MODEL_PREFERENCES) {
      const match = routerVision.find((m) => m.id === pref);
      if (match) return { provider: match.provider, model: match.id };
    }
    // Any other 9router vision model sorted by id
    const sortedRouter = [...routerVision].sort((a, b) => a.id.localeCompare(b.id));
    return { provider: sortedRouter[0]!.provider, model: sortedRouter[0]!.id };
  }

  // 2. Try Ollama provider
  const ollamaVision = visionModels.filter((m) => m.provider === FALLBACK_PRIMARY_PROVIDER);
  if (ollamaVision.length > 0) {
    const sortedOllama = [...ollamaVision].sort((a, b) => a.id.localeCompare(b.id));
    return { provider: sortedOllama[0]!.provider, model: sortedOllama[0]!.id };
  }

  // 3. Fallback: first sorted by provider then id
  const sorted = [...visionModels].sort((a, b) => {
    const pa = a.provider ?? "";
    const pb = b.provider ?? "";
    return pa < pb ? -1 : pa > pb ? 1 : a.id.localeCompare(b.id);
  });

  return { provider: sorted[0]!.provider, model: sorted[0]!.id };
}