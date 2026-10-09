import { WebsiteSnapshot } from "@/lib/content-extractor";
import { WebsiteAnalysis } from "@/services/ai/analysisSchema";
import { FinalValidatedAnalysis, ValidatedDecisionStatus, ValidatedEvidenceRef } from "@/types/validatedAnalysis";
import { SCORING_VERSION } from "@/services/scoring/scoringConfig";
import { normalizeSignalScore } from "@/services/scoring/normalizeSignalScore";
import { calculateOverallScore } from "@/services/scoring/calculateOverallScore";
import { validateEvidenceList } from "./evidenceValidator";
import {
  validatePriorityFix,
  validateOtherImprovements,
  sanitizeVisitorThought,
} from "./recommendationValidator";

/**
 * Main Phase 4 Validator & Deterministic Scoring Engine.
 * Converts raw/untrusted AI WebsiteAnalysis into a verified, normalized, frontend-safe FinalValidatedAnalysis.
 */
export function validateAndScoreAnalysis(
  aiAnalysis: WebsiteAnalysis,
  snapshot: WebsiteSnapshot
): FinalValidatedAnalysis {
  const brandName = snapshot.navigation.brandName || snapshot.meta.title || "this website";

  // 1. Validate First Seconds Evidence
  const validateFSItem = (item: {
    status: string;
    explanation: string;
    evidence_refs?: any[];
  }) => {
    const verifiedEv = validateEvidenceList(item?.evidence_refs, snapshot, true);
    const validStatus: ValidatedDecisionStatus = ["clear", "understandable", "partly_clear", "unclear"].includes(
      item?.status
    )
      ? (item.status as ValidatedDecisionStatus)
      : "partly_clear";

    return {
      status: validStatus,
      explanation: item?.explanation || "Diagnostic evaluation based on hero scanning.",
      evidence_available: verifiedEv.length > 0,
      evidence: verifiedEv,
    };
  };

  const fs = aiAnalysis?.first_seconds || {};
  const firstSeconds = {
    what_is_this: validateFSItem(fs.what_is_this),
    who_is_it_for: validateFSItem(fs.who_is_it_for),
    what_will_i_get: validateFSItem(fs.what_will_i_get),
    why_should_i_care: validateFSItem(fs.why_should_i_care),
    what_should_i_do_next: validateFSItem(fs.what_should_i_do_next),
  };

  // 2. Validate Evidence & Normalize Scores for All 5 Signals
  const rawSignals = aiAnalysis?.signals || {};

  const processSignal = (sigKey: keyof typeof rawSignals, defaultStatus: string) => {
    const rawSig = rawSignals[sigKey] || {};
    const verifiedEv = validateEvidenceList(rawSig.evidence_refs, snapshot, true);

    const status = rawSig.status || defaultStatus;
    const initialConfidence = ["high", "medium", "low"].includes(rawSig.confidence)
      ? rawSig.confidence
      : "medium";

    const { finalScore, finalConfidence } = normalizeSignalScore(
      rawSig.score,
      status,
      verifiedEv,
      initialConfidence
    );

    return {
      score: finalScore,
      status,
      explanation: rawSig.explanation || "Diagnostic signal evaluation.",
      confidence: finalConfidence,
      evidence_available: verifiedEv.length > 0,
      evidence: verifiedEv,
    };
  };

  const processedSignals = {
    first_impression: processSignal("first_impression", "clear"),
    audience: processSignal("audience", "understandable"),
    value: processSignal("value", "understandable"),
    trust: processSignal("trust", "could_be_stronger"),
    action: processSignal("action", "clear"),
  };

  // 3. Deterministic Overall Score Calculation
  const { overallScore, overallStatus } = calculateOverallScore({
    first_impression: processedSignals.first_impression.score,
    audience: processedSignals.audience.score,
    value: processedSignals.value.score,
    trust: processedSignals.trust.score,
    action: processedSignals.action.score,
  });

  // Identify weakest signal
  const signalEntries = (Object.entries(processedSignals) as Array<[
    keyof typeof processedSignals,
    (typeof processedSignals)[keyof typeof processedSignals]
  ]>).sort((a, b) => a[1].score - b[1].score);
  const weakestSignalKey = signalEntries[0] ? signalEntries[0][0] : undefined;

  // 4. Validate Priority Fix, Risks & Other Improvements
  const priorityFix = validatePriorityFix(aiAnalysis?.priority_fix, snapshot, weakestSignalKey);
  const otherImprovements = validateOtherImprovements(
    aiAnalysis?.other_improvements,
    snapshot,
    priorityFix.title
  );

  const rawWm: any = aiAnalysis?.website_message || {};
  const wmEv = validateEvidenceList(rawWm.evidence_refs, snapshot, true);
  const wmSummary = rawWm.summary || `This website communicates its core product offering for ${brandName}.`;
  const wmConfidence = ["high", "medium", "low"].includes(rawWm.confidence) ? rawWm.confidence : "medium";
  const websiteMessage = {
    summary: wmSummary,
    confidence: wmConfidence,
    evidence_available: wmEv.length > 0,
    evidence: wmEv,
  };

  // 4b. Reconcile and Validate Risks against Normalized Signal Scores
  const rawRisks = aiAnalysis?.risks;
  let risks: Array<{
    category: string;
    severity: "high" | "medium" | "low";
    title: string;
    description: string;
    why_it_matters: string;
    evidence_available: boolean;
    evidence: ValidatedEvidenceRef[];
  }> = [];

  if (Array.isArray(rawRisks) && rawRisks.length > 0) {
    risks = rawRisks.map((r) => {
      const verifiedEv = validateEvidenceList(r.evidence_refs, snapshot, true);
      let severity: "high" | "medium" | "low" = ["high", "medium", "low"].includes(r.severity)
        ? (r.severity as "high" | "medium" | "low")
        : "medium";

      const cat = (r.category || "clarity").toLowerCase();
      // Enforce severity consistency with signal scores:
      if (cat === "trust" && processedSignals.trust.score < 50) severity = "high";
      if (cat === "audience" && processedSignals.audience.score < 50) severity = "high";
      if (cat === "value" && processedSignals.value.score < 50) severity = "high";
      if (cat === "action" && processedSignals.action.score < 50) severity = "high";
      if ((cat === "clarity" || cat === "first_impression") && processedSignals.first_impression.score < 50) {
        severity = "high";
      }

      return {
        category: cat,
        severity,
        title: r.title || "Communication risk identified",
        description: r.description || "First-time visitors may experience friction understanding this element.",
        why_it_matters: r.why_it_matters || "Clear communication reduces visitor bounce rate and increases conversion confidence.",
        evidence_available: verifiedEv.length > 0,
        evidence: verifiedEv,
      };
    });
  }

  // Ensure every weak signal (< 70) has a corresponding risk!
  const hasCategoryRisk = (category: string) =>
    risks.some(
      (r) =>
        r.category.toLowerCase().includes(category) ||
        category.includes(r.category.toLowerCase())
    );

  // Check Trust weakness
  if (processedSignals.trust.score < 70 && !hasCategoryRisk("trust")) {
    const sev = processedSignals.trust.score < 50 ? "high" : "medium";
    risks.push({
      category: "trust",
      severity: sev,
      title:
        sev === "high"
          ? "Unverifiable trust and missing social proof"
          : "Trust signals could be substantially stronger",
      description: `Visitors landing on ${brandName} find no verified customer proof, named testimonials, or methodology credentials above the fold.`,
      why_it_matters:
        "First-time visitors hesitate to commit time or money without immediate, visible evidence that others trust the product.",
      evidence_available: processedSignals.trust.evidence_available,
      evidence: processedSignals.trust.evidence,
    });
  }

  // Check Audience weakness
  if (processedSignals.audience.score < 70 && !hasCategoryRisk("audience")) {
    const sev = processedSignals.audience.score < 50 ? "high" : "medium";
    risks.push({
      category: "audience",
      severity: sev,
      title: "Target audience is not clearly identified",
      description: `${brandName}'s homepage does not explicitly specify who the product is built for, leaving visitors unsure if it applies to them.`,
      why_it_matters:
        "Visitors bounce within seconds if they cannot immediately confirm the product was designed specifically for their role or use case.",
      evidence_available: processedSignals.audience.evidence_available,
      evidence: processedSignals.audience.evidence,
    });
  }

  // Check Value weakness
  if (processedSignals.value.score < 70 && !hasCategoryRisk("value")) {
    const sev = processedSignals.value.score < 50 ? "high" : "medium";
    risks.push({
      category: "value",
      severity: sev,
      title: "Core benefit is overshadowed by features or abstract copy",
      description: `The primary visitor outcome is not immediately clear from the hero headline, focusing more on description than tangible results.`,
      why_it_matters:
        "Visitors evaluate products based on what they will achieve, not just what the tool does.",
      evidence_available: processedSignals.value.evidence_available,
      evidence: processedSignals.value.evidence,
    });
  }

  // Check Action weakness
  if (processedSignals.action.score < 70 && !hasCategoryRisk("action")) {
    const sev = processedSignals.action.score < 50 ? "high" : "medium";
    risks.push({
      category: "action",
      severity: sev,
      title: "Call-to-action path has high friction or ambiguity",
      description: `The next step creates uncertainty regarding what happens after clicking, pricing commitment, or required setup.`,
      why_it_matters:
        "Ambiguous or high-friction CTAs reduce conversion from high-intent first-time visitors.",
      evidence_available: processedSignals.action.evidence_available,
      evidence: processedSignals.action.evidence,
    });
  }

  // Check First Impression weakness
  if (
    processedSignals.first_impression.score < 70 &&
    !hasCategoryRisk("clarity") &&
    !hasCategoryRisk("first_impression")
  ) {
    const sev = processedSignals.first_impression.score < 50 ? "high" : "medium";
    risks.push({
      category: "clarity",
      severity: sev,
      title: "Hero message requires secondary scanning to comprehend",
      description: `The first-impression headline does not clearly communicate the product category within 5 seconds.`,
      why_it_matters:
        "Visitors scan headlines rapidly; if comprehension takes more than 5 seconds, drop-off spikes.",
      evidence_available: processedSignals.first_impression.evidence_available,
      evidence: processedSignals.first_impression.evidence,
    });
  }

  // If overall score < 80 ("needs_improvement") and risks is still empty, add clarity risk
  if (overallScore < 80 && risks.length === 0) {
    risks.push({
      category: "clarity",
      severity: overallScore < 60 ? "high" : "medium",
      title: "Hero headline does not immediately convey core value",
      description: `First-time visitors scanning ${brandName} do not grasp the primary benefit and outcome within the first 5 seconds.`,
      why_it_matters: "Fast comprehension is required to keep cold visitors from bouncing.",
      evidence_available: processedSignals.first_impression.evidence_available,
      evidence: processedSignals.first_impression.evidence,
    });
  }

  // Sort risks: "high" severity first, then "medium", then "low"
  const severityRank: Record<string, number> = { high: 0, medium: 1, low: 2 };
  risks.sort((a, b) => (severityRank[a.severity] ?? 1) - (severityRank[b.severity] ?? 1));

  // Limit to top 4 most critical risks
  risks = risks.slice(0, 4);

  // 5. Sanitize Verdict & Visitor Thought
  const verdictText =
    aiAnalysis?.verdict?.text ||
    `Visitors grasp ${brandName}'s main topic, but the core benefit messaging can be strengthened.`;

  const visitorThoughtText = sanitizeVisitorThought(aiAnalysis?.visitor_thought?.text, brandName);
  const visitorThoughtConfidence = ["high", "medium", "low"].includes(aiAnalysis?.visitor_thought?.confidence)
    ? aiAnalysis.visitor_thought.confidence
    : "medium";

  // 6. Assemble Final Validated Analysis Object
  return {
    analysis_version: "1.0",
    scoring_version: SCORING_VERSION,

    overall_score: overallScore,
    overall_status: overallStatus,

    verdict: {
      text: verdictText,
    },

    first_seconds: firstSeconds,

    visitor_thought: {
      text: visitorThoughtText,
      confidence: visitorThoughtConfidence,
    },

    website_message: websiteMessage,

    signals: processedSignals,

    risks,

    priority_fix: priorityFix,

    other_improvements: otherImprovements,
  };
}
