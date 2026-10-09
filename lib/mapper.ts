import { FinalValidatedAnalysis } from "@/types/validatedAnalysis";
import { WebsiteSnapshot } from "@/lib/content-extractor";
import { AnalysisData } from "@/components/ResultsScreen";

/**
 * Maps the backend's structured FinalValidatedAnalysis and WebsiteSnapshot
 * into the camelCase AnalysisData structure expected by the frozen ResultsScreen component.
 */
export function mapBackendToFrontend(
  backendAnalysis: FinalValidatedAnalysis,
  rawUrl: string,
  snapshot?: WebsiteSnapshot
): AnalysisData {
  // Normalize Domain for Display
  let cleanDomain = rawUrl.trim();
  try {
    if (!/^https?:\/\//i.test(cleanDomain)) {
      cleanDomain = `https://${cleanDomain}`;
    }
    const parsed = new URL(cleanDomain);
    cleanDomain = parsed.hostname.replace(/^www\./, "") || "website.com";
  } catch {
    cleanDomain = cleanDomain.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || "website.com";
  }

  const statusToType = (status: string): "clear" | "amber" | "coral" => {
    const s = status.toLowerCase();
    if (s === "clear" || s === "understandable") return "clear";
    if (s === "partly_clear" || s === "partly" || s === "could_be_stronger") return "amber";
    return "coral";
  };

  const statusToLabel = (status: string): "Clear" | "Understandable" | "Partly clear" | "Unclear" => {
    const s = status.toLowerCase();
    if (s === "clear") return "Clear";
    if (s === "understandable") return "Understandable";
    if (s === "partly_clear" || s === "partly") return "Partly clear";
    return "Unclear";
  };

  const scoreToStatus = (score: number): "Needs improvement" | "Good" | "Needs work" | "Excellent" => {
    if (score >= 90) return "Excellent";
    if (score >= 75) return "Good";
    if (score >= 50) return "Needs work";
    return "Needs improvement";
  };

  const brandName = snapshot?.navigation?.brandName || cleanDomain.split(".")[0];
  const capitalizedBrand = brandName.charAt(0).toUpperCase() + brandName.slice(1);

  // Build quick signals directly coherent with normalized signal scores
  const getSignalStatusType = (score: number): "clear" | "amber" | "coral" => {
    if (score >= 70) return "clear";
    if (score >= 50) return "amber";
    return "coral";
  };

  const quickSignals = [
    {
      label: `Product category is ${backendAnalysis.signals.first_impression.score >= 70 ? "clear" : "unclear"}`,
      type: getSignalStatusType(backendAnalysis.signals.first_impression.score),
    },
    {
      label: `Target audience is ${backendAnalysis.signals.audience.score >= 70 ? "visible" : "unclear"}`,
      type: getSignalStatusType(backendAnalysis.signals.audience.score),
    },
    {
      label: `Main benefit is ${backendAnalysis.signals.value.score >= 70 ? "obvious" : "unclear"}`,
      type: getSignalStatusType(backendAnalysis.signals.value.score),
    },
    {
      label: `Trust signals ${backendAnalysis.signals.trust.score >= 70 ? "are visible" : "are weak"}`,
      type: getSignalStatusType(backendAnalysis.signals.trust.score),
    },
    {
      label: `Next step is ${backendAnalysis.signals.action.score >= 70 ? "clear" : "needs work"}`,
      type: getSignalStatusType(backendAnalysis.signals.action.score),
    },
  ];

  // Build firstSeconds
  const firstSeconds = [
    {
      question: "What is this?",
      label: statusToLabel(backendAnalysis.first_seconds.what_is_this.status),
      type: backendAnalysis.first_seconds.what_is_this.status === "clear" || backendAnalysis.first_seconds.what_is_this.status === "understandable"
        ? ("clear" as const)
        : backendAnalysis.first_seconds.what_is_this.status === "unclear"
        ? ("unclear" as const)
        : ("partly" as const),
    },
    {
      question: "Who is it for?",
      label: statusToLabel(backendAnalysis.first_seconds.who_is_it_for.status),
      type: backendAnalysis.first_seconds.who_is_it_for.status === "clear" || backendAnalysis.first_seconds.who_is_it_for.status === "understandable"
        ? ("clear" as const)
        : backendAnalysis.first_seconds.who_is_it_for.status === "unclear"
        ? ("unclear" as const)
        : ("partly" as const),
    },
    {
      question: "What will I get?",
      label: statusToLabel(backendAnalysis.first_seconds.what_will_i_get.status),
      type: backendAnalysis.first_seconds.what_will_i_get.status === "clear" || backendAnalysis.first_seconds.what_will_i_get.status === "understandable"
        ? ("clear" as const)
        : backendAnalysis.first_seconds.what_will_i_get.status === "unclear"
        ? ("unclear" as const)
        : ("partly" as const),
    },
    {
      question: "Why should I care?",
      label: statusToLabel(backendAnalysis.first_seconds.why_should_i_care.status),
      type: backendAnalysis.first_seconds.why_should_i_care.status === "clear" || backendAnalysis.first_seconds.why_should_i_care.status === "understandable"
        ? ("clear" as const)
        : backendAnalysis.first_seconds.why_should_i_care.status === "unclear"
        ? ("unclear" as const)
        : ("partly" as const),
    },
    {
      question: "What should I do next?",
      label: statusToLabel(backendAnalysis.first_seconds.what_should_i_do_next.status),
      type: backendAnalysis.first_seconds.what_should_i_do_next.status === "clear" || backendAnalysis.first_seconds.what_should_i_do_next.status === "understandable"
        ? ("clear" as const)
        : backendAnalysis.first_seconds.what_should_i_do_next.status === "unclear"
        ? ("unclear" as const)
        : ("partly" as const),
    },
  ];

  // Extract clear & missing findings grounded in verified evidence
  const clearFindings: string[] = [];
  const missingFindings: string[] = [];

  // What is this (Product category)
  const whatIsThisEv = backendAnalysis.first_seconds.what_is_this.evidence[0]?.text;
  if (
    backendAnalysis.first_seconds.what_is_this.status === "clear" ||
    backendAnalysis.signals.first_impression.score >= 70
  ) {
    if (whatIsThisEv) {
      clearFindings.push(`Product category: “${whatIsThisEv}” is identifiable`);
    } else {
      clearFindings.push("Core product category is identifiable above the fold");
    }
  } else {
    missingFindings.push("Product category requires extra scanning to identify");
  }

  // Who is it for (Audience)
  const whoIsItForEv = backendAnalysis.first_seconds.who_is_it_for.evidence[0]?.text;
  if (
    backendAnalysis.first_seconds.who_is_it_for.status === "clear" ||
    backendAnalysis.signals.audience.score >= 70
  ) {
    if (whoIsItForEv) {
      clearFindings.push(`Target audience: “${whoIsItForEv}” is specified`);
    } else {
      clearFindings.push("Target audience or customer role is visible");
    }
  } else {
    missingFindings.push("Target audience is not explicitly stated in hero section");
  }

  // What will I get (Value / Benefit)
  const valueEv = backendAnalysis.first_seconds.what_will_i_get.evidence[0]?.text;
  if (
    backendAnalysis.first_seconds.what_will_i_get.status === "clear" ||
    backendAnalysis.signals.value.score >= 70
  ) {
    if (valueEv) {
      clearFindings.push(`Primary outcome: “${valueEv}” is stated`);
    } else {
      clearFindings.push("Core benefit message is communicated in hero");
    }
  } else {
    missingFindings.push("Specific visitor outcome or benefit is not concrete");
  }

  // Trust / Social Proof
  const trustEv =
    backendAnalysis.signals.trust.evidence[0]?.text ||
    backendAnalysis.first_seconds.why_should_i_care.evidence[0]?.text;
  if (backendAnalysis.signals.trust.score >= 70) {
    if (trustEv) {
      clearFindings.push(`Proof element: “${trustEv}” is visible`);
    } else {
      clearFindings.push("Trust signals or credentials found on page");
    }
  } else {
    missingFindings.push("Verifiable proof points, customer logos, or credentials absent above fold");
  }

  // Primary Call to Action
  if (backendAnalysis.signals.action.score >= 70 && snapshot?.hero?.primaryCta?.text) {
    clearFindings.push(`Primary action: “${snapshot.hero.primaryCta.text}” is prominent`);
  } else if (backendAnalysis.signals.action.score < 60) {
    missingFindings.push("Call to action has ambiguity or high friction");
  }

  const homepageExcerpt = snapshot?.hero?.headline
    ? `“ ${snapshot.hero.headline}${snapshot.hero.subheadline ? ' — ' + snapshot.hero.subheadline : ''} ”`
    : `“ We scanned your homepage above the fold structure.”`;

  const evidence = {
    locationTag: "Homepage · Above the fold",
    homepageExcerpt,
    clearFindings: clearFindings.length > 0 ? clearFindings : ["Found initial page structure"],
    missingFindings: missingFindings.length > 0 ? missingFindings : ["No major communication blockers identified"],
  };

  // Build signals
  const signals = [
    {
      id: "first-impression",
      title: "First impression",
      score: backendAnalysis.signals.first_impression.score,
      badgeText: backendAnalysis.signals.first_impression.status,
      badgeType: statusToType(backendAnalysis.signals.first_impression.status),
      description: backendAnalysis.signals.first_impression.explanation,
      icon: "eye",
    },
    {
      id: "audience",
      title: "Audience",
      score: backendAnalysis.signals.audience.score,
      badgeText: backendAnalysis.signals.audience.status,
      badgeType: statusToType(backendAnalysis.signals.audience.status),
      description: backendAnalysis.signals.audience.explanation,
      icon: "users",
    },
    {
      id: "value",
      title: "Value",
      score: backendAnalysis.signals.value.score,
      badgeText: backendAnalysis.signals.value.status,
      badgeType: statusToType(backendAnalysis.signals.value.status),
      description: backendAnalysis.signals.value.explanation,
      icon: "sparkles",
    },
    {
      id: "trust",
      title: "Trust",
      score: backendAnalysis.signals.trust.score,
      badgeText: backendAnalysis.signals.trust.status,
      badgeType: statusToType(backendAnalysis.signals.trust.status),
      description: backendAnalysis.signals.trust.explanation,
      icon: "shield",
    },
    {
      id: "action",
      title: "Action",
      score: backendAnalysis.signals.action.score,
      badgeText: backendAnalysis.signals.action.status,
      badgeType: statusToType(backendAnalysis.signals.action.status),
      description: backendAnalysis.signals.action.explanation,
      icon: "arrow",
    },
  ];

  // Build recommendation
  const recommendation = {
    title: "If you change only one thing",
    subhead: backendAnalysis.priority_fix.title,
    explanation: backendAnalysis.priority_fix.reason,
    impact: backendAnalysis.priority_fix.impact || "high",
    currentDirection: `“ ${backendAnalysis.priority_fix.what_you_say_now || backendAnalysis.priority_fix.current_direction} ”`,
    strongerDirection: `“ ${backendAnalysis.priority_fix.clearer_direction || backendAnalysis.priority_fix.suggested_direction} ”`,
  };

  const websiteMessage = backendAnalysis.website_message
    ? {
        summary: backendAnalysis.website_message.summary,
        confidence: backendAnalysis.website_message.confidence,
      }
    : undefined;

  const risks = Array.isArray(backendAnalysis.risks)
    ? backendAnalysis.risks.map((r) => ({
        category: r.category,
        severity: r.severity,
        title: r.title,
        description: r.description,
        why_it_matters: r.why_it_matters,
      }))
    : [];

  // Build otherImprovements with rich, non-repetitive suggestions
  const otherImprovements = backendAnalysis.other_improvements.map((imp, idx) => {
    const lowerCombined = `${imp.title} ${imp.explanation}`.toLowerCase();
    let category = "trust";
    let icon = "shield";
    let color = "bg-blue-50 text-blue-600";

    if (
      lowerCombined.includes("audience") ||
      lowerCombined.includes("who") ||
      lowerCombined.includes("persona") ||
      lowerCombined.includes("role")
    ) {
      category = "audience";
      icon = "users";
      color = "bg-purple-50 text-purple-600";
    } else if (
      lowerCombined.includes("action") ||
      lowerCombined.includes("cta") ||
      lowerCombined.includes("button") ||
      lowerCombined.includes("step")
    ) {
      category = "action";
      icon = "zap";
      color = "bg-amber-50 text-amber-600";
    } else if (
      lowerCombined.includes("value") ||
      lowerCombined.includes("benefit") ||
      lowerCombined.includes("outcome")
    ) {
      category = "value";
      icon = "sparkles";
      color = "bg-emerald-50 text-emerald-600";
    }

    return {
      id: `${category}-${idx}`,
      title: imp.title,
      description: imp.explanation,
      whyItMatters:
        imp.why_it_matters ||
        (category === "trust"
          ? "First-time visitors look for immediate proof that others rely on this product before committing attention."
          : category === "audience"
          ? "Visitors bounce within seconds if they cannot immediately confirm the product was built specifically for their needs."
          : category === "action"
          ? "Unclear button labels or ambiguous commitments create hesitation at the primary conversion step."
          : "Visitors evaluate solutions based on tangible outcomes achieved, not features listed."),
      whatToImprove:
        imp.what_to_improve ||
        (category === "trust"
          ? "Place 2–3 customer proof points, logos, or methodology credentials directly below the primary CTA."
          : category === "audience"
          ? "Add a clear audience tag or role qualifier directly above or below the main headline."
          : category === "action"
          ? "Use concrete, low-friction action copy and clarify what occurs immediately after clicking."
          : "Restate the primary message to emphasize the visitor's concrete outcome."),
      copyableSuggestion:
        imp.copyable_suggestion ||
        (category === "trust"
          ? `“ Trusted by teams building and growing with ${capitalizedBrand}.”`
          : category === "audience"
          ? `“ Built specifically for ${capitalizedBrand} users looking to achieve results faster.”`
          : category === "action"
          ? `Get started with ${capitalizedBrand} → (Instant setup · No credit card required)`
          : `“ The fastest way to achieve your goals with ${capitalizedBrand}.”`),
      icon,
      color,
    };
  });

  return {
    domain: cleanDomain,
    score: backendAnalysis.overall_score,
    scoreStatus: scoreToStatus(backendAnalysis.overall_score),
    verdict: backendAnalysis.verdict.text,
    verdictSubtext: "Based on your homepage · First-time visitor perspective",
    quickSignals,
    firstSeconds,
    visitorThought: backendAnalysis.visitor_thought.text,
    evidence,
    signals,
    websiteMessage,
    risks,
    recommendation,
    otherImprovements,
    isPartialAccess: snapshot?.stats ? snapshot.stats.cleanedTextLength < 200 : false,
    isAccessError: false,
    checkedAt: "Checked just now",
  };
}
