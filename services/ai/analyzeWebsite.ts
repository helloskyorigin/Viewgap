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
 * Analyzes WebsiteSnapshot and optional SupportingPagesBundle (including Privacy Policy, Terms of Service, Refund Policy)
 * using Groq API as primary AI provider with fallback to Gemini AI Provider.
 * Verifies structured output, cleans and validates evidence references against original snapshot and legal pages text.
 */
export async function analyzeWebsite(
  snapshot: WebsiteSnapshot,
  supportingPagesBundle?: SupportingPagesBundle,
  options: AnalyzeWebsiteOptions = {}
): Promise<WebsiteAnalysis> {
  let rawAnalysis: WebsiteAnalysis | null = null;
  let providerError: Error | null = null;

  // 1. Try Gemini AI Provider first (reliable and primary)
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) {
    try {
      const geminiProvider = new GeminiAIProvider();
      rawAnalysis = await geminiProvider.analyzeWebsite(snapshot, supportingPagesBundle);
    } catch (err: unknown) {
      providerError = err instanceof Error ? err : new Error(String(err));
    }
  }

  // 2. Fall back to Groq if Gemini was not configured or encountered an error
  if (!rawAnalysis && process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim()) {
    try {
      const groqProvider = new GroqAIProvider(options.apiKey);
      rawAnalysis = await groqProvider.analyzeWebsite(snapshot, supportingPagesBundle);
    } catch (err: unknown) {
      const groqErr = err instanceof Error ? err : new Error(String(err));
      if (!providerError) providerError = groqErr;
    }
  }

  // 3. If neither succeeded, throw the error or default error
  if (!rawAnalysis) {
    if (providerError) throw providerError;
    const err = new Error("Analysis is temporarily unavailable. Please try again later.");
    (err as any).code = "AI_PROVIDER_NOT_CONFIGURED";
    throw err;
  }

  // 4. Validate and Clean Evidence References against original WebsiteSnapshot and supporting/legal pages
  const groundedAnalysis = validateAndCleanEvidence(rawAnalysis, snapshot, supportingPagesBundle);

  return groundedAnalysis;
}
