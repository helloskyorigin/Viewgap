import { WebsiteSnapshot } from "@/lib/content-extractor";
import { SupportingPagesBundle } from "@/lib/supporting-page-fetcher";
import { WebsiteAnalysis } from "./analysisSchema";
import { GroqAIProvider } from "./groqProvider";
import { GeminiAIProvider } from "./aiProvider";
import { validateAndCleanEvidence } from "./evidenceValidator";

export interface AnalyzeWebsiteOptions {
  apiKey?: string;
}

/**
 * Main entry point for Phase 3 AI Analysis.
 * Analyzes WebsiteSnapshot and optional SupportingPagesBundle 
 * using Groq API as primary provider, with Gemini as fallback.
 */
export async function analyzeWebsite(
  snapshot: WebsiteSnapshot,
  supportingPagesBundle?: SupportingPagesBundle,
  options: AnalyzeWebsiteOptions = {}
): Promise<WebsiteAnalysis> {
  let rawAnalysis: WebsiteAnalysis | null = null;
  let providerError: Error | null = null;

  // 1. Try Groq AI Provider first (Primary as requested)
  if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim()) {
    try {
      const groqProvider = new GroqAIProvider(options.apiKey);
      rawAnalysis = await groqProvider.analyzeWebsite(snapshot, supportingPagesBundle);
    } catch (err: unknown) {
      providerError = err instanceof Error ? err : new Error(String(err));
      console.warn("[AI-WARN] Groq provider failed:", providerError.message);
    }
  }

  // 2. Fall back to Gemini if Groq was not configured or encountered an error
  if (!rawAnalysis && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) {
    try {
      const geminiProvider = new GeminiAIProvider();
      rawAnalysis = await geminiProvider.analyzeWebsite(snapshot, supportingPagesBundle);
    } catch (err: unknown) {
      const geminiErr = err instanceof Error ? err : new Error(String(err));
      console.warn("[AI-WARN] Gemini provider failed:", geminiErr.message);
      if (!providerError) providerError = geminiErr;
    }
  }

  // 3. If neither succeeded, throw the error
  if (!rawAnalysis) {
    if (providerError) throw providerError;
    const err = new Error("Analysis is temporarily unavailable. Please try again later.");
    (err as any).code = "AI_PROVIDER_NOT_CONFIGURED";
    throw err;
  }

  // 4. Validate and Clean Evidence References
  return validateAndCleanEvidence(rawAnalysis, snapshot, supportingPagesBundle);
}
