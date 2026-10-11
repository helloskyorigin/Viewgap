import { WebsiteSnapshot } from "@/lib/content-extractor";
import { EvidenceRef } from "@/services/ai/analysisSchema";
import { ValidatedEvidenceRef } from "@/types/validatedAnalysis";
import { extractSearchableTextsFromSnapshot } from "@/services/ai/evidenceValidator";
import { validateEvidenceList } from "./evidenceValidator";

export interface PriorityFixInput {
  title: string;
  reason: string;
  impact?: "high" | "medium";
  what_you_say_now?: string;
  clearer_direction?: string;
  current_direction?: string;
  suggested_direction?: string;
  evidence_refs?: EvidenceRef[];
}

export interface OtherImprovementInput {
  title: string;
  explanation: string;
  why_it_matters?: string;
  what_to_improve?: string;
  copyable_suggestion?: string;
  evidence_refs?: EvidenceRef[];
}

const GENERIC_RECOMMENDATION_TITLES = [
  "improve your website",
  "make it better",
  "fix website",
  "update copy",
  "redesign page",
  "improve ux",
];

/**
 * Checks whether a recommendation or suggested replacement introduces
 * unverified statistics, customer counts, ratings, certifications,
 * testimonials, or guarantees that do not exist in the WebsiteSnapshot.
 */
export function containsUnverifiedFabricatedClaim(
  candidateText: string | undefined,
  snapshot: WebsiteSnapshot
): boolean {
  if (!candidateText || !candidateText.trim()) return false;
  const text = candidateText.trim();
  const searchablePool = extractSearchableTextsFromSnapshot(snapshot)
    .join(" ")
    .toLowerCase();

  // 1. Check any numbers in candidateText that are tied to metrics, percentages, multipliers, or social proof
  const metricNumberPatterns: RegExp[] = [
    /\b(\d[\d,.]*[kmb]?)\+?\s*(?:users|customers|teams|companies|clients|developers|businesses|creators|organizations|downloads|reviews|stars|countries|enterprises|leaders|brands)\b/gi,
    /\b(\d+(?:\.\d+)?)%\b/gi,
    /\b(\d+(?:\.\d+)?)x\b/gi,
    /\$(\d[\d,.]*[kmb]?)\b/gi,
    /\bfortune\s*(\d+)\b/gi,
    /\b(\d+)\s*-\s*day\s+(?:free\s+)?trial\b/gi,
  ];

  for (const regex of metricNumberPatterns) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const fullToken = match[0].toLowerCase().trim();
      const rawNumber = (match[1] || "").toLowerCase().trim();
      if (
        !searchablePool.includes(fullToken) &&
        (!rawNumber || !searchablePool.includes(rawNumber))
      ) {
        return true;
      }
    }
  }

  // 2. Check ratings, awards, security certifications, and trial/guarantee promises
  const claimChecks: Array<{ pattern: RegExp; poolCheck: RegExp }> = [
    {
      pattern: /\b(?:4\.\d\/5|5-star|#1\s+rated|award-winning|g2\s+leader)\b/i,
      poolCheck: /\b(?:4\.\d\/5|5-star|#1\s+rated|award-winning|g2)\b/i,
    },
    {
      pattern: /\b(?:soc\s*2|iso\s*27001|hipaa|gdpr\s+compliant|pci-dss|bank-grade|military-grade)\b/i,
      poolCheck: /\b(?:soc\s*2|soc2|iso\s*27001|hipaa|gdpr|pci-dss|bank-grade|military-grade)\b/i,
    },
    {
      pattern: /\b(?:no credit card required|instant setup|100%\s+guaranteed|money-back guarantee|risk-free trial|free forever)\b/i,
      poolCheck: /\b(?:no credit card|instant setup|100%\s+guaranteed|money-back|risk-free|free forever)\b/i,
    },
  ];

  for (const check of claimChecks) {
    if (check.pattern.test(text) && !check.poolCheck.test(searchablePool)) {
      return true;
    }
  }

  // 3. Check for fabricated testimonial attributions (e.g., "... - Sarah, CEO")
  const fakeTestimonialAttribution =
    /[-–—]\s*[A-Z][a-zA-Z\s,.'"]*(?:CEO|Founder|CTO|VP|Director|Manager|Head|Customer|Client|Engineer)\b/;
  if (fakeTestimonialAttribution.test(text)) {
    const hasMatchingTestimonial = (snapshot.trustSignals?.testimonials || []).some(
      (t) =>
        (t.author && text.toLowerCase().includes(t.author.toLowerCase())) ||
        (t.quote && text.toLowerCase().includes(t.quote.toLowerCase()))
    );
    if (!hasMatchingTestimonial) {
      return true;
    }
  }

  return false;
}

function buildFallbackPriorityFixForWeakness(
  brand: string,
  heroText: string,
  hasHeroOrTitle: boolean,
  weakestSignalKey?: string
) {
  let fallbackTitle = "Clarify primary value proposition in hero headline";
  let fallbackReason =
    "First-time visitors decide whether to stay within the first few seconds of scanning the hero headline.";
  let fallbackDirection = `State clearly what ${brand} accomplishes for the visitor in plain language.`;

  if (weakestSignalKey === "trust") {
    fallbackTitle = "Add verifiable proof and credibility context";
    fallbackReason =
      "Visitors can scan the initial premise, but limited verifiable proof or customer evidence in the accessible homepage content reduces credibility.";
    fallbackDirection =
      "If you have verified customer feedback, recognizable client logos, or methodology credentials, consider displaying them near the primary call to action.";
  } else if (weakestSignalKey === "audience") {
    fallbackTitle = "Explicitly define who this product is built for";
    fallbackReason =
      "Visitors cannot immediately tell from the accessible hero copy if this product is designed for their specific role or use case.";
    fallbackDirection = `Add clear audience framing in the hero section stating who ${brand} serves.`;
  } else if (weakestSignalKey === "action") {
    fallbackTitle = "Clarify the primary next action and call to action";
    fallbackReason =
      "First-time visitors hesitate when the primary entry path or next step is ambiguous.";
    fallbackDirection = `Make the primary button action obvious and directly tied to ${brand}'s core outcome.`;
  } else if (weakestSignalKey === "value") {
    fallbackTitle = "Make the primary visitor outcome more concrete";
    fallbackReason =
      "Visitors evaluate solutions based on the specific outcome they will achieve rather than abstract descriptions.";
    fallbackDirection = `State clearly the primary outcome ${brand} delivers for its target users.`;
  }

  return {
    title: fallbackTitle,
    reason: fallbackReason,
    impact: "high" as const,
    what_you_say_now: hasHeroOrTitle ? heroText : "Current headline excerpt unavailable",
    clearer_direction: fallbackDirection,
    current_direction: hasHeroOrTitle ? heroText : "Current headline excerpt unavailable",
    suggested_direction: fallbackDirection,
    evidence_available: hasHeroOrTitle,
    evidence: [] as ValidatedEvidenceRef[],
  };
}

/**
 * Validates Priority Fix object against WebsiteSnapshot.
 */
export function validatePriorityFix(
  priorityFix: PriorityFixInput | undefined,
  snapshot: WebsiteSnapshot,
  weakestSignalKey?: string,
  weakestSignalScore?: number,
  allSignalScores?: Record<string, number>
): {
  title: string;
  reason: string;
  impact: "high" | "medium";
  what_you_say_now: string;
  clearer_direction: string;
  current_direction: string;
  suggested_direction: string;
  evidence_available: boolean;
  evidence: ValidatedEvidenceRef[];
} {
  const brand = snapshot.navigation.brandName || "the website";
  const hasHeroOrTitle = Boolean(
    (snapshot.hero.headline && snapshot.hero.headline.trim()) ||
      (snapshot.meta.title && snapshot.meta.title.trim())
  );
  const heroText = snapshot.hero.headline
    ? `${snapshot.hero.headline}${snapshot.hero.subheadline ? " — " + snapshot.hero.subheadline : ""}`
    : snapshot.meta.title || "Current headline excerpt unavailable";

  const rawTitle = (priorityFix?.title || "").trim();
  const isGenericTitle =
    !rawTitle ||
    GENERIC_RECOMMENDATION_TITLES.some(
      (g) => rawTitle.toLowerCase() === g || rawTitle.toLowerCase().includes(g)
    );

  // Check if AI's priority_fix targets an already-clear signal (>=80) while ignoring a severely weak signal (<50)
  let isMisalignedWithWeakest = false;
  if (
    !isGenericTitle &&
    weakestSignalKey &&
    weakestSignalScore !== undefined &&
    weakestSignalScore < 50 &&
    allSignalScores
  ) {
    const lowerTitle = rawTitle.toLowerCase();
    const targetsTrust = /\b(trust|proof|testimonial|logo|credential|social proof)\b/.test(lowerTitle);
    const targetsAudience = /\b(audience|persona|who it is for|built for)\b/.test(lowerTitle);
    const targetsAction = /\b(cta|call to action|button label)\b/.test(lowerTitle);

    if (targetsTrust && (allSignalScores.trust ?? 0) >= 80 && weakestSignalKey !== "trust") {
      isMisalignedWithWeakest = true;
    } else if (
      targetsAudience &&
      (allSignalScores.audience ?? 0) >= 80 &&
      weakestSignalKey !== "audience"
    ) {
      isMisalignedWithWeakest = true;
    } else if (
      targetsAction &&
      (allSignalScores.action ?? 0) >= 80 &&
      weakestSignalKey !== "action"
    ) {
      isMisalignedWithWeakest = true;
    }
  }

  if (!priorityFix || isGenericTitle || isMisalignedWithWeakest) {
    return buildFallbackPriorityFixForWeakness(
      brand,
      heroText,
      hasHeroOrTitle,
      weakestSignalKey
    );
  }

  const verifiedEvidence = validateEvidenceList(priorityFix.evidence_refs, snapshot, true);
  const rawWhatYouSay = priorityFix.what_you_say_now || priorityFix.current_direction || "";

  // Ground what_you_say_now: ONLY use verified source quotes or actual extracted hero text.
  // Never pass unverified AI paraphrases as source quotes.
  let groundedWhatYouSay = hasHeroOrTitle ? heroText : "Current headline excerpt unavailable";
  if (rawWhatYouSay.trim()) {
    const checkEv = validateEvidenceList([{ source: "hero", text: rawWhatYouSay }], snapshot, true);
    if (checkEv.length > 0) {
      groundedWhatYouSay = rawWhatYouSay.trim();
    } else if (verifiedEvidence.length > 0 && verifiedEvidence[0].text) {
      groundedWhatYouSay = verifiedEvidence[0].text;
    }
  } else if (verifiedEvidence.length > 0 && verifiedEvidence[0].text) {
    groundedWhatYouSay = verifiedEvidence[0].text;
  }

  const rawClearerDirection =
    priorityFix.clearer_direction ||
    priorityFix.suggested_direction ||
    `Clarify main benefit for ${brand}`;

  // Sanitize clearer_direction against fabricated statistics, testimonials, certifications, or guarantees
  let clearerDirection = rawClearerDirection.trim();
  if (containsUnverifiedFabricatedClaim(clearerDirection, snapshot)) {
    const isTrustFocused =
      weakestSignalKey === "trust" ||
      /\b(trust|proof|testimonial|logo|credential|social proof|case study)\b/i.test(rawTitle);

    clearerDirection = isTrustFocused
      ? "If you have verified customer feedback, case studies, or recognizable client logos, consider displaying them near the primary call to action."
      : `State clearly what ${brand} does, who it serves, and the primary outcome visitors can expect.`;
  }

  const impact =
    weakestSignalScore !== undefined && weakestSignalScore < 65
      ? "high"
      : priorityFix.impact || (weakestSignalKey ? "high" : "medium");

  return {
    title: rawTitle,
    reason:
      priorityFix.reason ||
      "Helps first-time visitors immediately classify the product value.",
    impact,
    what_you_say_now: groundedWhatYouSay,
    clearer_direction: clearerDirection,
    current_direction: groundedWhatYouSay,
    suggested_direction: clearerDirection,
    evidence_available: verifiedEvidence.length > 0 || Boolean(snapshot.hero.headline),
    evidence: verifiedEvidence,
  };
}

/**
 * Validates array of Other Improvements. Filters out generic titles, avoids duplicating priority fix,
 * strips fabricated statistics/claims, and limits max count to 3.
 */
export function validateOtherImprovements(
  improvements: OtherImprovementInput[] | undefined,
  snapshot: WebsiteSnapshot,
  priorityFixTitle?: string
): Array<{
  title: string;
  explanation: string;
  why_it_matters?: string;
  what_to_improve?: string;
  copyable_suggestion?: string;
  evidence_available: boolean;
  evidence: ValidatedEvidenceRef[];
}> {
  if (!Array.isArray(improvements)) return [];

  const validList: Array<{
    title: string;
    explanation: string;
    why_it_matters?: string;
    what_to_improve?: string;
    copyable_suggestion?: string;
    evidence_available: boolean;
    evidence: ValidatedEvidenceRef[];
  }> = [];

  const seenTitles = new Set<string>();
  if (priorityFixTitle) {
    seenTitles.add(priorityFixTitle.toLowerCase().trim());
  }

  for (const item of improvements) {
    if (validList.length >= 3) break; // Maximum 3 recommendations
    if (!item || !item.title) continue;

    const lowerTitle = item.title.toLowerCase().trim();

    // Skip generic recommendations
    if (GENERIC_RECOMMENDATION_TITLES.some((g) => lowerTitle === g || lowerTitle.includes(g))) {
      continue;
    }

    // Skip duplicate or repetitive titles
    if (seenTitles.has(lowerTitle)) continue;

    // Check similarity with already added titles
    const isTooSimilar = Array.from(seenTitles).some(
      (existing) =>
        (lowerTitle.length > 10 && existing.includes(lowerTitle)) ||
        (existing.length > 10 && lowerTitle.includes(existing))
    );
    if (isTooSimilar) continue;

    seenTitles.add(lowerTitle);

    const verifiedEv = validateEvidenceList(item.evidence_refs, snapshot, true);

    // Provide contextual defaults if missing (without fabricating claims or metrics)
    let whyItMatters = item.why_it_matters;
    let whatToImprove = item.what_to_improve;
    let copyableSuggestion = item.copyable_suggestion;

    const lowerCombined = `${item.title} ${item.explanation}`.toLowerCase();

    if (!whyItMatters) {
      if (lowerCombined.includes("trust") || lowerCombined.includes("proof") || lowerCombined.includes("credential")) {
        whyItMatters = "First-time visitors look for verifiable proof that others rely on this product before committing attention.";
      } else if (lowerCombined.includes("audience") || lowerCombined.includes("who") || lowerCombined.includes("for")) {
        whyItMatters = "Visitors bounce quickly if they cannot tell whether the product was built for their specific role or use case.";
      } else if (lowerCombined.includes("action") || lowerCombined.includes("cta") || lowerCombined.includes("button")) {
        whyItMatters = "Unclear button labels or ambiguous commitments create hesitation at the primary conversion step.";
      } else {
        whyItMatters = "Visitors evaluate solutions based on tangible outcomes achieved, not features listed.";
      }
    }

    if (!whatToImprove || containsUnverifiedFabricatedClaim(whatToImprove, snapshot)) {
      if (lowerCombined.includes("trust") || lowerCombined.includes("proof") || lowerCombined.includes("testimonial")) {
        whatToImprove =
          "If you have verified customer feedback, recognizable client logos, or methodology credentials, consider placing them near the primary CTA.";
      } else if (lowerCombined.includes("audience") || lowerCombined.includes("who")) {
        whatToImprove = "Add a clear audience tag or role qualifier directly above or below the main headline.";
      } else if (lowerCombined.includes("action") || lowerCombined.includes("cta")) {
        whatToImprove = "Use concrete, low-friction action copy and clarify what occurs immediately after clicking.";
      } else {
        whatToImprove = "Restate the primary message to emphasize the visitor's concrete outcome.";
      }
    }

    // Never invent fallback copyable_suggestion templates with fake claims,
    // and strip any AI-provided copyable_suggestion that contains unverified statistics/guarantees.
    if (copyableSuggestion) {
      if (containsUnverifiedFabricatedClaim(copyableSuggestion, snapshot)) {
        copyableSuggestion = undefined;
      } else {
        copyableSuggestion = copyableSuggestion.trim();
      }
    }

    validList.push({
      title: item.title,
      explanation: item.explanation || "Improves visitor comprehension and reduces decision friction.",
      why_it_matters: whyItMatters,
      what_to_improve: whatToImprove,
      copyable_suggestion: copyableSuggestion,
      evidence_available: verifiedEv.length > 0,
      evidence: verifiedEv,
    });
  }

  return validList;
}

/**
 * Validates Visitor Thought to ensure it represents a neutral interpretation rather than a fake user quote.
 */
export function sanitizeVisitorThought(
  thoughtText: string | undefined,
  brandName: string
): string {
  if (!thoughtText || thoughtText.trim().length === 0) {
    return `A first-time visitor would scan ${brandName}'s homepage to understand its core product offering before taking action.`;
  }

  let sanitized = thoughtText.trim();

  // Strip fake testimonial quotes or attribution (e.g., '- Sarah, CEO at TechCorp' or '— John Doe')
  const attributionRegex = /[-–—]\s*[A-Z][a-zA-Z\s,.'"]+(?:CEO|Founder|Manager|Director|VP|Head|Customer|Client|Engineer|User)?.*$/i;
  sanitized = sanitized.replace(attributionRegex, "").trim();

  // Strip wrapping quotation marks if present
  sanitized = sanitized.replace(/^["'“](.*)["'”]$/, "$1").trim();

  // Ensure phrase starts with first-time visitor perspective if not already
  if (!sanitized.toLowerCase().includes("visitor") && !sanitized.toLowerCase().includes("first-time")) {
    sanitized = `A first-time visitor would think: ${sanitized}`;
  }

  return sanitized;
}
