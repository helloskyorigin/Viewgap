"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {LEGAL_CONFIG} from "@/lib/legal-config";
import {
  Link2,
  ArrowRight,
  ArrowDown,
  Check,
  X,
  Sparkles,
  RefreshCw,
  Share2,
  Download,
  Info,
  Zap,
  Shield,
  Users,
  Eye,
  ChevronRight,
  MinusCircle,
  Copy,
  CheckCircle2,
  BarChart2,
  AlertCircle,
  Clock,
  ExternalLink,
  Lock,
  Mail,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  type StoredHistoryRecord,
  normalizeComparisonDomain,
  evaluateComparisonEligibility,
  syncReportWithHistoryStorage,
  METHODOLOGY_VARIABILITY_NOTE,
} from "@/lib/recheck-compare";
import { SIGNAL_WEIGHTS } from "@/services/scoring/scoringConfig";
import { type SupportingContext } from "@/types/supportingContext";

export interface AnalysisData {
  domain: string;
  score: number;
  scoreStatus: "Needs improvement" | "Good" | "Needs work" | "Excellent";
  verdict: string;
  verdictSubtext: string;
  quickSignals: Array<{
    label: string;
    type: "clear" | "amber" | "coral";
  }>;
  firstSeconds: Array<{
    question: string;
    label: string;
    type: "clear" | "partly" | "unclear";
  }>;
  visitorThought: string;
  evidence: {
    locationTag: string;
    homepageExcerpt: string;
    clearFindings: string[];
    missingFindings: string[];
  };
  signals: Array<{
    id: string;
    title: string;
    score: number;
    badgeText: string;
    badgeType: "clear" | "amber" | "coral";
    description: string;
    icon: string;
  }>;
  websiteMessage?: {
    summary: string;
    confidence: "high" | "medium" | "low";
  };
  risks?: Array<{
    category: string;
    severity: "high" | "medium" | "low";
    title: string;
    description: string;
    why_it_matters: string;
  }>;
  recommendation: {
    title: string;
    subhead: string;
    explanation: string;
    impact?: "high" | "medium";
    currentDirection: string;
    strongerDirection: string;
  };
  otherImprovements: Array<{
    id: string;
    title: string;
    description: string;
    whyItMatters: string;
    whatToImprove: string;
    copyableSuggestion?: string;
    icon: string;
    color: string;
  }>;
  supportingContext?: SupportingContext;
  isPartialAccess?: boolean;
  isAccessError?: boolean;
  checkedAt?: string;
}

interface ResultsScreenProps {
  rawUrl: string;
  analysisData?: Partial<AnalysisData>;
  previousCheckRecord?: Partial<StoredHistoryRecord> | null;
  isUnlocked?: boolean;
  onBackToLanding: () => void;
  onRunNewCheck: () => void;
  onOpenFaq: () => void;
  onOpenPricing: () => void;
}

export function buildReportSummaryForExport(
  data: AnalysisData,
  isUnlocked = false
): string {
  if (!isUnlocked) {
    const overviewSignalLines = data.signals
      .map((s) => `- ${s.title}: ${s.score}/100 (${s.badgeText})`)
      .join("\n");

    const sortedSignals = [...data.signals].sort((a, b) => a.score - b.score);
    const weakestSignal = sortedSignals[0] || null;
    const primaryRisk = data.risks && data.risks.length > 0 ? data.risks[0] : null;
    const biggestIssueSummary = primaryRisk
      ? `${primaryRisk.title} (${primaryRisk.severity} severity)`
      : weakestSignal
      ? `${weakestSignal.title} (${weakestSignal.score}/100 — ${weakestSignal.badgeText})`
      : "No major communication bottleneck flagged.";

    const cleanStrongerDirection = (data.recommendation?.strongerDirection || "")
      .replace(/^[“"'\s]+|[”"'\s]+$/g, "")
      .trim();

    return [
      `STRANGERLENS FREE PREVIEW SUMMARY — ${data.domain}`,
      `Overall First-Impression Score: ${data.score}/100 (${data.scoreStatus})`,
      `Checked: ${data.checkedAt || "Just now"}`,
      ``,
      `VERDICT`,
      `${data.verdict}`,
      ``,
      ...(data.websiteMessage?.summary
        ? [`WHAT YOUR WEBSITE IS ACTUALLY SAYING`, `${data.websiteMessage.summary}`, ``]
        : []),
      `FIVE SIGNAL OVERVIEW`,
      overviewSignalLines,
      ``,
      `BIGGEST ISSUE + EVIDENCE`,
      `${biggestIssueSummary}`,
      ``,
      `YOUR #1 PRIORITY FIX: ${data.recommendation.subhead}`,
      `${cleanStrongerDirection || data.recommendation.explanation}`,
      ``,
      `---`,
      `Free Preview Summary (Sections 01–06). Unlock the Full 15-Section Report ($5) for Priority Fix Plan, Copy-Ready Improvements, Other Recommended Improvements, First Few Seconds Comprehension, First-Time Visitor Impression, Complete Homepage Evidence, Five Detailed Signal Breakdown, Communication Risks, and Recheck & Compare.`,
    ].join("\n");
  }

  const detailedSignalLines = data.signals
    .map((s) => `- ${s.title}: ${s.score}/100 (${s.badgeText}) — ${s.description}`)
    .join("\n");
  const riskLines =
    data.risks && data.risks.length > 0
      ? data.risks
          .map((r) => `- [${r.severity.toUpperCase()}] ${r.title}: ${r.description}`)
          .join("\n")
      : "- No major communication risks identified.";

  return [
    `STRANGERLENS FULL FIRST-IMPRESSION REPORT — ${data.domain}`,
    `Overall First-Impression Score: ${data.score}/100 (${data.scoreStatus})`,
    `Checked: ${data.checkedAt || "Just now"}`,
    ``,
    `VERDICT`,
    `${data.verdict}`,
    ``,
    ...(data.websiteMessage?.summary
      ? [`WHAT YOUR WEBSITE IS ACTUALLY SAYING`, `${data.websiteMessage.summary}`, ``]
      : []),
    `FIRST-TIME VISITOR IMPRESSION`,
    `${data.visitorThought}`,
    ``,
    `FIVE DETAILED SIGNAL BREAKDOWN`,
    detailedSignalLines,
    ``,
    `YOUR #1 PRIORITY FIX: ${data.recommendation.subhead}`,
    `${data.recommendation.explanation}`,
    `What you say now: ${data.recommendation.currentDirection}`,
    `Clearer direction: ${data.recommendation.strongerDirection}`,
    ``,
    `COMMUNICATION RISKS`,
    riskLines,
  ].join("\n");
}

export default function ResultsScreen({
  rawUrl,
  analysisData: customData,
  previousCheckRecord,
  isUnlocked = false,
  onBackToLanding,
  onRunNewCheck,
  onOpenFaq,
  onOpenPricing,
}: ResultsScreenProps) {
  // Phase 2 Interaction States
  const [copiedState, setCopiedState] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<"success" | "warning">("success");
  const [activeInfoTooltip, setActiveInfoTooltip] = useState<boolean>(false);
  const [activeCompareModal, setActiveCompareModal] = useState<boolean>(false);
  const [expandedImprovementId, setExpandedImprovementId] = useState<string | null>(
    customData?.otherImprovements?.[0]?.id ?? null
  );

  // Paywall & Premium Preview States
  const [selectedPaywallPlan, setSelectedPaywallPlan] = useState<"single" | "pack">("single");
  const [paywallEmail, setPaywallEmail] = useState<string>("");
  const [paywallEmailError, setPaywallEmailError] = useState<string | null>(null);
  const [paywallCheckoutState, setPaywallCheckoutState] = useState<
    "idle" | "processing" | "coming_soon"
  >("idle");
  const [showCompactPreviewDetails, setShowCompactPreviewDetails] = useState<boolean>(false);
  const isReportUnlocked = Boolean(isUnlocked);

  // Async Button States
  const [shareState, setShareState] = useState<"idle" | "sharing" | "copied">("idle");
  const [downloadState, setDownloadState] = useState<"idle" | "preparing" | "downloaded" | "failed">("idle");
  const [checkAgainState, setCheckAgainState] = useState<"idle" | "checking">("idle");
  const [previousRecord, setPreviousRecord] = useState<StoredHistoryRecord | null>(null);
  const [hadCorruptedHistory, setHadCorruptedHistory] = useState<boolean>(false);

  // Score Reveal Animation
  const [displayScore, setDisplayScore] = useState<number>(0);
  const [hasAnimatedScore, setHasAnimatedScore] = useState<boolean>(false);

  // Timer refs to prevent race conditions on rapid copy clicks
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reduced Motion Detection
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Normalize Domain for Clean Display & Consistent Comparison Identity
  const cleanDomain = useMemo(() => {
    const normalized = normalizeComparisonDomain(customData?.domain || rawUrl);
    if (normalized) return normalized;
    let cleaned = rawUrl.trim();
    if (!cleaned) return "website.com";
    try {
      if (!/^https?:\/\//i.test(cleaned)) {
        cleaned = `https://${cleaned}`;
      }
      const parsed = new URL(cleaned);
      return parsed.hostname.replace(/^www\./i, "").toLowerCase() || "website.com";
    } catch {
      return (
        cleaned
          .replace(/^https?:\/\//i, "")
          .replace(/^www\./i, "")
          .split("/")[0]
          .toLowerCase() || "website.com"
      );
    }
  }, [customData?.domain, rawUrl]);

  // Dynamic Analysis Data Model ( strictly grounded in real analysisData )
  const data: AnalysisData = useMemo(() => {
    const score = customData?.score ?? 0;
    const defaultStatus: AnalysisData["scoreStatus"] =
      score >= 90
        ? "Excellent"
        : score >= 75
        ? "Good"
        : score >= 50
        ? "Needs work"
        : "Needs improvement";

    return {
      domain: customData?.domain || cleanDomain,
      score,
      scoreStatus: customData?.scoreStatus ?? defaultStatus,
      verdict:
        customData?.verdict ??
        "First-impression analysis completed based on visible homepage content.",
      verdictSubtext:
        customData?.verdictSubtext ??
        "Based on your homepage · First-time visitor perspective",
      quickSignals: customData?.quickSignals ?? [],
      firstSeconds: customData?.firstSeconds ?? [],
      visitorThought:
        customData?.visitorThought ??
        "No simulated visitor thought available for this scan.",
      evidence: customData?.evidence
        ? {
            ...customData.evidence,
            locationTag:
              customData.evidence.locationTag === "Homepage · Above the fold"
                ? "Homepage · Extracted content"
                : customData.evidence.locationTag,
          }
        : {
            locationTag: "Homepage · Extracted content",
            homepageExcerpt: "No homepage excerpt extracted.",
            clearFindings: [],
            missingFindings: [],
          },
      signals: customData?.signals ?? [],
      websiteMessage: customData?.websiteMessage,
      risks: customData?.risks ?? [],
      recommendation: customData?.recommendation ?? {
        title: "If you change only one thing",
        subhead: "Clarify your primary homepage headline",
        explanation:
          "State clearly what the product is, who it serves, and the main outcome visitors can expect.",
        currentDirection: "Current headline excerpt unavailable",
        strongerDirection: "State the specific outcome your target audience achieves.",
      },
      otherImprovements: customData?.otherImprovements ?? [],
      supportingContext: customData?.supportingContext,
      isPartialAccess: customData?.isPartialAccess ?? false,
      isAccessError: customData?.isAccessError ?? false,
      checkedAt: customData?.checkedAt ?? "Checked just now",
    };
  }, [cleanDomain, customData]);

  // Score Theme Palette based on actual score
  const scoreVisuals = useMemo(() => {
    if (data.score >= 75) {
      return {
        stroke: "#10b981",
        track: "#ecfdf5",
        pillBg: "bg-[#dcfce7] text-[#15803d] border border-emerald-200/80",
        modalBadge: "text-emerald-800 bg-emerald-100/90 border-emerald-200",
        accentText: "text-emerald-700",
      };
    }
    if (data.score >= 50) {
      return {
        stroke: "#f59e0b",
        track: "#fffbeb",
        pillBg: "bg-[#fef3c7] text-[#b45309] border border-amber-200/80",
        modalBadge: "text-amber-800 bg-amber-100/90 border-amber-200",
        accentText: "text-amber-700",
      };
    }
    return {
      stroke: "#e11d48",
      track: "#fff1f2",
      pillBg: "bg-[#fee2e2] text-[#b91c1c] border border-rose-200/80",
      modalBadge: "text-rose-800 bg-rose-100/90 border-rose-200",
      accentText: "text-rose-700",
    };
  }, [data.score]);

  // Derived Signal Overview & First-Seconds Insights
  const overviewStats = useMemo(() => {
    const sorted = [...data.signals].sort((a, b) => b.score - a.score);
    const strongest = sorted[0] || null;
    const weakest = sorted.length > 1 ? sorted[sorted.length - 1] : null;
    const clearQuestionsCount = data.firstSeconds.filter((q) => q.type === "clear").length;
    const clearSignalsCount = data.signals.filter((s) => s.badgeType === "clear").length;

    const questionBySignalId: Record<string, string> = {
      "first-impression": "Is it immediately clear?",
      audience: "Who is this built for?",
      value: "Why should a visitor care?",
      trust: "Why should they believe it?",
      action: "What is the next step?",
    };

    const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const signalScoreForRiskCategory = (rawCat?: string): number => {
      const cat = (rawCat || "").trim().toLowerCase();
      const targetId =
        cat.includes("trust") || cat.includes("credibility")
          ? "trust"
          : cat.includes("audience")
          ? "audience"
          : cat.includes("value") || cat.includes("positioning")
          ? "value"
          : cat.includes("action") || cat.includes("cta")
          ? "action"
          : "first-impression";
      const found = data.signals.find((s) => s.id === targetId);
      return found ? found.score : 70;
    };

    const sortedRisks = [...(data.risks ?? [])].sort((a, b) => {
      const scoreA = signalScoreForRiskCategory(a.category);
      const scoreB = signalScoreForRiskCategory(b.category);
      // Prioritize risks belonging to non-clear signals (< 70) ahead of already-clear signals (>= 70)
      const isWeakA = scoreA < 70 ? 0 : 1;
      const isWeakB = scoreB < 70 ? 0 : 1;
      if (isWeakA !== isWeakB) return isWeakA - isWeakB;

      const sevDiff = (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3);
      if (sevDiff !== 0) return sevDiff;

      return scoreA - scoreB;
    });
    const primaryRisk = sortedRisks[0] || null;
    const secondaryRisks = sortedRisks.slice(1);

    return {
      strongest,
      weakest,
      clearQuestionsCount,
      clearSignalsCount,
      questionBySignalId,
      primaryRisk,
      secondaryRisks,
    };
  }, [data.signals, data.firstSeconds, data.risks]);

  // Phase 3: Derive Priority Fix Plan (Max 3 distinct, ordered actions from existing validated recommendations)
  const priorityFixPlan = useMemo(() => {
    const normalizeText = (value?: string): string =>
      (value || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    // Condense multi-sentence or clause-heavy explanations into a concise 1-sentence summary
    // so Step 01 does not repeat the full verbatim paragraph from the #1 Priority Fix card.
    const summarizePlanReason = (rawText?: string, isPrimaryFix = false): string | null => {
      if (!rawText || !rawText.trim()) return null;
      const cleaned = rawText.trim().replace(/\s+/g, " ");
      const sentences = cleaned.match(/[^.!?]+[.!?]+/g);

      let firstSentence =
        sentences && sentences.length > 0 ? sentences[0].trim() : cleaned;

      if (isPrimaryFix) {
        // If the primary fix explanation is a single sentence, condense trailing subordinate clauses
        // so it serves as an executive summary rather than repeating the full card body verbatim.
        const clauseSplit = firstSentence.split(
          /\s+(?:because|which means|leaving|forcing|making it harder|while)\s+|;\s+|\s+—\s+/i
        );
        if (clauseSplit.length > 1 && clauseSplit[0].trim().length >= 28) {
          firstSentence = clauseSplit[0].trim().replace(/[,;:\s]+$/, "") + ".";
        }
      }

      if (!/[.!?]$/.test(firstSentence)) {
        firstSentence += ".";
      }
      return firstSentence;
    };

    // Extract a website location ONLY when explicitly stated in the validated recommendation text.
    // Never guess or fabricate a location.
    const extractExplicitLocation = (...texts: Array<string | undefined>): string | null => {
      const combined = texts.filter(Boolean).join(" ");
      if (!combined) return null;

      if (/\b(hero headline|main headline|primary headline|h1 headline)\b/i.test(combined)) {
        return "Hero headline";
      }
      if (/\b(hero subheadline|subheadline|sub-headline)\b/i.test(combined)) {
        return "Hero subheadline";
      }
      if (/\b(hero supporting description|supporting description|supporting copy)\b/i.test(combined)) {
        return "Hero supporting description";
      }
      if (/\b(primary cta|call to action|call-to-action|cta button)\b/i.test(combined)) {
        return "Primary CTA";
      }
      if (/\b(navigation bar|top navigation|header navigation)\b/i.test(combined)) {
        return "Navigation";
      }
      if (/\b(homepage hero|hero section|above the fold|above-the-fold)\b/i.test(combined)) {
        return "Homepage hero";
      }
      return null;
    };

    const areTitlesDuplicate = (normA: string, normB: string): boolean => {
      if (!normA || !normB) return false;
      if (normA === normB) return true;
      if (normA.length >= 16 && normB.length >= 16) {
        if (normA.includes(normB) || normB.includes(normA)) {
          return true;
        }
      }
      return false;
    };

    interface PriorityPlanStep {
      id: string;
      stepNumber: "01" | "02" | "03";
      title: string;
      where: string | null;
      why: string | null;
      isPrimaryFix: boolean;
      linkedImprovementId?: string;
    }

    const rawSteps: Array<{
      id: string;
      title: string;
      where: string | null;
      why: string | null;
      isPrimaryFix: boolean;
      linkedImprovementId?: string;
      normTitle: string;
    }> = [];

    const seenIds = new Set<string>();

    // 1. Primary source: Existing #1 Priority Fix ("IF YOU CHANGE ONLY ONE THING")
    const primaryRec = customData ? customData.recommendation : data.recommendation;
    const primaryTitle = primaryRec?.subhead?.trim() || "";

    if (primaryTitle) {
      const normPrimary = normalizeText(primaryTitle);
      if (normPrimary) {
        seenIds.add("primary-priority-fix");
        rawSteps.push({
          id: "primary-priority-fix",
          title: primaryTitle,
          where: extractExplicitLocation(primaryRec?.subhead, primaryRec?.currentDirection),
          why: summarizePlanReason(primaryRec?.explanation, true),
          isPrimaryFix: true,
          normTitle: normPrimary,
        });
      }
    }

    // 2. Secondary source: Existing validated otherImprovements in preserved source order
    const additionalRecs = customData
      ? customData.otherImprovements ?? []
      : data.otherImprovements ?? [];

    for (const item of additionalRecs) {
      if (rawSteps.length >= 3) break;
      const itemTitle = item?.title?.trim() || "";
      if (!itemTitle) continue;

      const itemId = item.id ? String(item.id) : "";
      if (itemId && seenIds.has(itemId)) continue;

      const normTitle = normalizeText(itemTitle);
      if (!normTitle) continue;

      const isDuplicate = rawSteps.some(
        (existing) =>
          areTitlesDuplicate(existing.normTitle, normTitle) ||
          (item.description &&
            areTitlesDuplicate(existing.normTitle, normalizeText(item.description)))
      );
      if (isDuplicate) continue;

      if (itemId) {
        seenIds.add(itemId);
      }

      rawSteps.push({
        id: itemId || `plan-step-${rawSteps.length + 1}`,
        title: itemTitle,
        where: extractExplicitLocation(item.title, item.whatToImprove),
        why: summarizePlanReason(item.description || item.whyItMatters, false),
        isPrimaryFix: false,
        linkedImprovementId: item.id,
        normTitle,
      });
    }

    const stepLabels: Array<"01" | "02" | "03"> = ["01", "02", "03"];

    return rawSteps.slice(0, 3).map((step, index): PriorityPlanStep => ({
      id: step.id,
      stepNumber: stepLabels[index] || "03",
      title: step.title,
      where: step.where,
      why: step.why,
      isPrimaryFix: step.isPrimaryFix,
      linkedImprovementId: step.linkedImprovementId,
    }));
  }, [customData, data.recommendation, data.otherImprovements]);

  // Phase 4: Derive Copy-Ready Improvements (Max 3 trustworthy, verified copy comparisons)
  const copyReadyImprovements = useMemo(() => {
    const stripQuotes = (value?: string): string =>
      (value || "")
        .replace(/^[“"'\s]+|[”"'\s]+$/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const normalizeText = (value?: string): string =>
      stripQuotes(value)
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const isPlaceholderExcerpt = (value: string): boolean => {
      const lower = value.toLowerCase();
      return (
        !lower ||
        lower === "no homepage excerpt extracted." ||
        lower === "no homepage excerpt extracted" ||
        lower === "we scanned your homepage above the fold structure." ||
        lower === "we scanned your homepage above the fold structure" ||
        lower === "we scanned your accessible homepage structure." ||
        lower === "we scanned your accessible homepage structure" ||
        lower === "current headline excerpt unavailable" ||
        lower === "none" ||
        lower === "n/a" ||
        lower === "unavailable"
      );
    };

    // 1. Extract verified homepage text from actual extracted evidence fields
    const rawExcerpt = stripQuotes(
      customData?.evidence?.homepageExcerpt ?? data.evidence?.homepageExcerpt
    );
    const hasVerifiedExcerpt = !isPlaceholderExcerpt(rawExcerpt);

    let verifiedHeadline: string | null = null;
    let verifiedSubheadline: string | null = null;

    if (hasVerifiedExcerpt) {
      const dividerIdx = rawExcerpt.indexOf(" — ");
      if (dividerIdx !== -1) {
        const headPart = stripQuotes(rawExcerpt.slice(0, dividerIdx));
        const subPart = stripQuotes(rawExcerpt.slice(dividerIdx + 3));
        if (headPart && !isPlaceholderExcerpt(headPart)) {
          verifiedHeadline = headPart;
        }
        if (subPart && !isPlaceholderExcerpt(subPart)) {
          verifiedSubheadline = subPart;
        }
      } else {
        verifiedHeadline = rawExcerpt;
      }
    }

    // Check clearFindings for verified Primary CTA text (`Primary action: “...” is prominent`)
    let verifiedPrimaryCta: string | null = null;
    const clearFindingsList =
      customData?.evidence?.clearFindings ?? data.evidence?.clearFindings ?? [];
    for (const finding of clearFindingsList) {
      const ctaMatch = finding.match(/Primary action:\s*[“"]([^”"]+)[”"]/i);
      if (ctaMatch && ctaMatch[1]?.trim()) {
        verifiedPrimaryCta = ctaMatch[1].trim();
        break;
      }
    }

    // Build the verified source pool string to check against fabricated claims
    const verifiedSourcePool = [
      rawExcerpt,
      ...clearFindingsList,
      customData?.websiteMessage?.summary ?? data.websiteMessage?.summary ?? "",
    ]
      .join(" ")
      .toLowerCase();

    // Check if a `currentDirection` string is actual website copy rather than an AI diagnostic paraphrase
    const isVerifiedCurrentQuote = (candidate?: string): string | null => {
      const cleaned = stripQuotes(candidate);
      if (!cleaned || isPlaceholderExcerpt(cleaned)) return null;

      const normCandidate = normalizeText(cleaned);
      const normExcerpt = normalizeText(rawExcerpt);

      // If it directly matches or is a substring of the extracted homepage excerpt, it is verified source copy
      if (hasVerifiedExcerpt && normExcerpt && normCandidate && normExcerpt.includes(normCandidate)) {
        return cleaned;
      }

      // Reject AI diagnostic paraphrases that describe the site in 3rd/2nd person rather than quoting it
      const diagnosticParaphrasePattern =
        /\b(your homepage|the homepage|your website|the website|hero section|above the fold|currently lacks|does not state|does not clearly|fails to|no clear|no explicit|visitors see|visitors cannot|is unclear|is missing|without explaining|without stating|current copy|headline focuses on)\b/i;

      if (diagnosticParaphrasePattern.test(cleaned)) {
        return null;
      }

      return cleaned;
    };

    // Validate that a suggested replacement is genuine copyable text, not a generic mapper template,
    // meta-instruction, or fabricated credibility/metric claim
    const isTrustworthySuggestion = (
      rawSuggestion?: string,
      category?: "HERO HEADLINE" | "SUPPORTING DESCRIPTION" | "PRIMARY CTA LABEL"
    ): string | null => {
      const cleaned = stripQuotes(rawSuggestion);
      if (!cleaned || cleaned.length < 3) return null;

      // Reject default fallback placeholder
      if (
        cleaned.toLowerCase() ===
        "state the specific outcome your target audience achieves."
      ) {
        return null;
      }

      // Reject generic fallback templates from mapper
      const genericTemplatePatterns = [
        /^trusted by teams building and growing with\b/i,
        /^built specifically for .+ users looking to achieve results faster\.?$/i,
        /\(instant setup\s*·\s*no credit card required\)/i,
        /^the fastest way to achieve your goals with\b/i,
      ];
      if (genericTemplatePatterns.some((re) => re.test(cleaned))) {
        return null;
      }

      // Reject meta-instructions or conditional advice that tell the user what to do instead of providing replacement copy
      const instructionalPrefixPattern =
        /^(add|include|place|insert|display|show|replace|clarify|restate|rewrite|ensure|make sure|highlight|feature|use concrete|state clearly|if you have|once you have|consider adding)\b/i;
      if (instructionalPrefixPattern.test(cleaned)) {
        return null;
      }

      if (/\[[^\]]+\]|\{[^}]+\}|<[^>]+>/i.test(cleaned)) {
        return null;
      }

      // Reject fabricated quantitative claims, ratings, certifications, or promises unless present in source pool
      const potentiallyFabricatedTokens: Array<{ pattern: RegExp; tokenCheck: RegExp }> = [
        {
          pattern: /\b\d[\d,]*\+?\s*(?:users|customers|teams|companies|clients|developers|businesses|organizations|startups|enterprises|agencies|brands)\b/i,
          tokenCheck: /\b\d[\d,]*\+?\s*(?:users|customers|teams|companies|clients|developers|businesses|organizations|startups|enterprises|agencies|brands)\b/i,
        },
        {
          pattern: /\b\d+(?:\.\d+)?%\s*(?:faster|more|increase|conversion|growth|uptime|roi|reduction|less|time|saved)\b/i,
          tokenCheck: /\b\d+(?:\.\d+)?%\b/i,
        },
        {
          pattern: /\b\d+(?:\.\d+)?x\s*(?:faster|more|growth|roi|output|productivity|conversions?)\b/i,
          tokenCheck: /\b\d+(?:\.\d+)?x\b/i,
        },
        {
          pattern: /\b(?:4\.\d\/5|5-star|#1 rated|award-winning|fortune\s*500)\b/i,
          tokenCheck: /\b(?:4\.\d\/5|5-star|#1 rated|award-winning|fortune\s*500)\b/i,
        },
        {
          pattern: /\b(?:soc\s*2|iso\s*27001|hipaa|gdpr compliant|bank-grade security|military-grade)\b/i,
          tokenCheck: /\b(?:soc\s*2|iso\s*27001|hipaa|gdpr)\b/i,
        },
        {
          pattern: /\b(?:no credit card required|instant setup|100% guaranteed|money-back guarantee|free forever)\b/i,
          tokenCheck: /\b(?:no credit card|instant setup|100% guaranteed|money-back|free forever)\b/i,
        },
      ];

      for (const check of potentiallyFabricatedTokens) {
        if (check.pattern.test(cleaned) && !check.tokenCheck.test(verifiedSourcePool)) {
          return null;
        }
      }

      // Ensure CTA labels are reasonably concise
      if (category === "PRIMARY CTA LABEL" && cleaned.length > 90) {
        return null;
      }

      return cleaned;
    };

    type SupportedCopyCategory =
      | "HERO HEADLINE"
      | "SUPPORTING DESCRIPTION"
      | "PRIMARY CTA LABEL";

    const classifyCopyCategory = (
      titleText?: string,
      detailText?: string,
      isPrimary = false
    ): {
      category: SupportedCopyCategory;
      intendedLocation: string;
    } | null => {
      const combined = `${titleText || ""} ${detailText || ""}`.toLowerCase();

      // Exclude purely visual/structural/proof recommendations (e.g., adding logos, screenshots, badges)
      // unless they explicitly target headline, subheadline, supporting description, or CTA wording
      const isStructuralProofOnly =
        /\b(logo|logos|screenshot|screenshots|video|badge|badges|testimonial|case study|pricing table|navigation menu|layout)\b/i.test(
          combined
        ) &&
        !/\b(headline|subheadline|sub-headline|supporting description|supporting copy|cta|button|wording|copy)\b/i.test(
          combined
        );

      if (isStructuralProofOnly) {
        return null;
      }

      if (
        /\b(primary cta|call to action|call-to-action|cta button|button label|button text|button copy|action button)\b/i.test(
          combined
        )
      ) {
        return {
          category: "PRIMARY CTA LABEL",
          intendedLocation: "Primary call-to-action button",
        };
      }

      if (
        /\b(subheadline|sub-headline|supporting description|supporting copy|subhead|hero description|explanatory line)\b/i.test(
          combined
        )
      ) {
        return {
          category: "SUPPORTING DESCRIPTION",
          intendedLocation: "Hero supporting description / subheadline",
        };
      }

      if (
        isPrimary ||
        /\b(headline|h1|hero|value proposition|main message|opening statement|positioning|who it is for|audience)\b/i.test(
          combined
        )
      ) {
        return {
          category: "HERO HEADLINE",
          intendedLocation: "Homepage hero headline",
        };
      }

      return null;
    };

    const resolveCurrentCopyForCategory = (
      category: SupportedCopyCategory,
      explicitCandidate?: string | null
    ): string | null => {
      const verifiedCandidate = isVerifiedCurrentQuote(explicitCandidate || undefined);
      if (verifiedCandidate) return verifiedCandidate;

      if (category === "HERO HEADLINE" && verifiedHeadline) {
        return verifiedHeadline;
      }
      if (category === "SUPPORTING DESCRIPTION" && verifiedSubheadline) {
        return verifiedSubheadline;
      }
      if (category === "PRIMARY CTA LABEL" && verifiedPrimaryCta) {
        return verifiedPrimaryCta;
      }
      return null;
    };

    const formatWhyThisMayHelp = (rawReason?: string, fallbackReason?: string): string => {
      const source = (rawReason || fallbackReason || "").trim().replace(/\s+/g, " ");
      if (!source) {
        return "Communicates the core value proposition more directly to first-time visitors.";
      }
      const sentences = source.match(/[^.!?]+[.!?]+/g);
      if (sentences && sentences.length > 0) {
        return sentences[0].trim();
      }
      return /[.!?]$/.test(source) ? source : `${source}.`;
    };

    interface CopyImprovementItem {
      id: string;
      indexLabel: "01" | "02" | "03";
      category: SupportedCopyCategory;
      intendedLocation: string;
      currentCopy: string | null;
      suggestedReplacement: string;
      whyThisMayHelp: string;
      relatedPlanStep: "01" | "02" | "03" | null;
    }

    const candidates: Array<{
      id: string;
      category: SupportedCopyCategory;
      intendedLocation: string;
      currentCopy: string | null;
      suggestedReplacement: string;
      whyThisMayHelp: string;
      relatedPlanStep: "01" | "02" | "03" | null;
      normReplacement: string;
    }> = [];

    const seenReplacements = new Set<string>();
    const seenCategories = new Set<SupportedCopyCategory>();

    // Candidate 1: Primary #1 Priority Fix (`recommendation`)
    const primaryRec = customData ? customData.recommendation : data.recommendation;
    if (primaryRec) {
      const classification = classifyCopyCategory(
        primaryRec.subhead,
        primaryRec.explanation,
        true
      );
      if (classification) {
        const cleanSuggestion = isTrustworthySuggestion(
          primaryRec.strongerDirection,
          classification.category
        );
        if (cleanSuggestion) {
          const currentCopy = resolveCurrentCopyForCategory(
            classification.category,
            primaryRec.currentDirection
          );
          const normSuggestion = normalizeText(cleanSuggestion);
          const normCurrent = normalizeText(currentCopy || "");

          if (normSuggestion && normSuggestion !== normCurrent) {
            const matchingStep = priorityFixPlan.find((s) => s.isPrimaryFix);
            seenReplacements.add(normSuggestion);
            seenCategories.add(classification.category);

            candidates.push({
              id: "copy-primary-fix",
              category: classification.category,
              intendedLocation: classification.intendedLocation,
              currentCopy,
              suggestedReplacement: cleanSuggestion,
              whyThisMayHelp: formatWhyThisMayHelp(primaryRec.explanation),
              relatedPlanStep: matchingStep ? matchingStep.stepNumber : "01",
              normReplacement: normSuggestion,
            });
          }
        }
      }
    }

    // Candidate 2+: Additional recommendations from `otherImprovements`, ordered by Priority Fix Plan alignment
    const additionalRecs = customData
      ? customData.otherImprovements ?? []
      : data.otherImprovements ?? [];

    const orderedAdditionalRecs = [...additionalRecs].sort((a, b) => {
      const stepA = priorityFixPlan.findIndex((s) => s.linkedImprovementId === a.id);
      const stepB = priorityFixPlan.findIndex((s) => s.linkedImprovementId === b.id);
      const rankA = stepA === -1 ? 99 : stepA;
      const rankB = stepB === -1 ? 99 : stepB;
      return rankA - rankB;
    });

    for (const item of orderedAdditionalRecs) {
      if (candidates.length >= 3) break;
      if (!item?.copyableSuggestion) continue;

      const classification = classifyCopyCategory(
        item.title,
        `${item.whatToImprove || ""} ${item.description || ""}`,
        false
      );
      if (!classification) continue;

      // Avoid repeating multiple suggestions for the exact same category if already covered,
      // unless it's a distinct Supporting Description vs Hero Headline
      let targetCategory = classification.category;
      let targetLocation = classification.intendedLocation;
      if (
        targetCategory === "HERO HEADLINE" &&
        seenCategories.has("HERO HEADLINE") &&
        !seenCategories.has("SUPPORTING DESCRIPTION")
      ) {
        targetCategory = "SUPPORTING DESCRIPTION";
        targetLocation = "Hero supporting description / subheadline";
      }

      if (seenCategories.has(targetCategory)) continue;

      const cleanSuggestion = isTrustworthySuggestion(
        item.copyableSuggestion,
        targetCategory
      );
      if (!cleanSuggestion) continue;

      const normSuggestion = normalizeText(cleanSuggestion);
      if (!normSuggestion || seenReplacements.has(normSuggestion)) continue;

      const isNearDuplicate = candidates.some(
        (existing) =>
          existing.normReplacement.includes(normSuggestion) ||
          normSuggestion.includes(existing.normReplacement)
      );
      if (isNearDuplicate) continue;

      const currentCopy = resolveCurrentCopyForCategory(targetCategory, null);
      const normCurrent = normalizeText(currentCopy || "");
      if (normSuggestion === normCurrent) continue;

      const matchingStep = priorityFixPlan.find(
        (s) => s.linkedImprovementId === item.id
      );

      seenReplacements.add(normSuggestion);
      seenCategories.add(targetCategory);

      candidates.push({
        id: `copy-${item.id}`,
        category: targetCategory,
        intendedLocation: targetLocation,
        currentCopy,
        suggestedReplacement: cleanSuggestion,
        whyThisMayHelp: formatWhyThisMayHelp(item.whyItMatters, item.description),
        relatedPlanStep: matchingStep ? matchingStep.stepNumber : null,
        normReplacement: normSuggestion,
      });
    }

    const indexLabels: Array<"01" | "02" | "03"> = ["01", "02", "03"];

    return candidates.slice(0, 3).map((item, idx): CopyImprovementItem => ({
      id: item.id,
      indexLabel: indexLabels[idx] || "03",
      category: item.category,
      intendedLocation: item.intendedLocation,
      currentCopy: item.currentCopy,
      suggestedReplacement: item.suggestedReplacement,
      whyThisMayHelp: item.whyThisMayHelp,
      relatedPlanStep: item.relatedPlanStep,
    }));
  }, [
    customData,
    data.recommendation,
    data.otherImprovements,
    data.evidence,
    data.websiteMessage,
    priorityFixPlan,
  ]);

  // Phase 5: Derive Visitor Understanding (09 & 10) and Complete Homepage Evidence (11)
  const visitorUnderstandingAndEvidence = useMemo(() => {
    const stripOuterQuotes = (value?: string): string =>
      (value || "")
        .replace(/^[“"'\s]+|[”"'\s]+$/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const isGenericExcerptPlaceholder = (value: string): boolean => {
      const lower = value.toLowerCase();
      return (
        !lower ||
        lower.includes("we scanned your homepage above the fold structure") ||
        lower.includes("we scanned your accessible homepage structure") ||
        lower.includes("no headline extracted")
      );
    };

    const rawExcerpt = stripOuterQuotes(data.evidence?.homepageExcerpt);
    const hasVerifiedExcerpt = Boolean(
      rawExcerpt && !isGenericExcerptPlaceholder(rawExcerpt)
    );

    let verifiedHeadline: string | null = null;
    let verifiedSubheadline: string | null = null;

    if (hasVerifiedExcerpt) {
      if (rawExcerpt.includes(" — ")) {
        const parts = rawExcerpt.split(" — ");
        verifiedHeadline = stripOuterQuotes(parts[0]) || rawExcerpt;
        const sub = stripOuterQuotes(parts.slice(1).join(" — "));
        verifiedSubheadline = sub.length > 0 ? sub : null;
      } else {
        verifiedHeadline = rawExcerpt;
      }
    }

    const extractQuotedFromFinding = (prefixPattern: RegExp): string | null => {
      for (const finding of data.evidence?.clearFindings || []) {
        if (prefixPattern.test(finding)) {
          const match = finding.match(/[“"]([^”"]+)[”"]/);
          if (match && match[1]) {
            const clean = stripOuterQuotes(match[1]);
            if (clean.length > 0) return clean;
          }
        }
      }
      return null;
    };

    const verifiedCategorySnippet = extractQuotedFromFinding(/^product category:/i);
    const verifiedAudienceSnippet = extractQuotedFromFinding(/^target audience:/i);
    const verifiedOutcomeSnippet = extractQuotedFromFinding(/^primary outcome:/i);
    const verifiedProofSnippet = extractQuotedFromFinding(/^proof element:/i);
    const verifiedPrimaryCta = extractQuotedFromFinding(/^primary action:/i);

    // Filter out generic fallback placeholders from clearFindings and missingFindings
    // so Section 11 only presents real verified findings or clean honest empty states
    const verifiedClearFindings = (data.evidence?.clearFindings || []).filter(
      (item) =>
        item &&
        item.trim().length > 0 &&
        item.trim().toLowerCase() !== "found initial page structure"
    );

    const verifiedMissingFindings = (data.evidence?.missingFindings || []).filter(
      (item) =>
        item &&
        item.trim().length > 0 &&
        item.trim().toLowerCase() !== "no major communication blockers identified"
    );

    // Build the 5 required comprehension questions in exact canonical order
    const canonicalQuestions: Array<{
      numberLabel: "01" | "02" | "03" | "04" | "05";
      question: string;
      dimensionLabel: string;
      quickSignalNote: string | null;
      verifiedSnippet: string | null;
    }> = [
      {
        numberLabel: "01",
        question: "What is this?",
        dimensionLabel: "Product category",
        quickSignalNote: data.quickSignals?.[0]?.label || null,
        verifiedSnippet: verifiedCategorySnippet,
      },
      {
        numberLabel: "02",
        question: "Who is it for?",
        dimensionLabel: "Target audience",
        quickSignalNote: data.quickSignals?.[1]?.label || null,
        verifiedSnippet: verifiedAudienceSnippet,
      },
      {
        numberLabel: "03",
        question: "What will I get?",
        dimensionLabel: "Primary benefit",
        quickSignalNote: data.quickSignals?.[2]?.label || null,
        verifiedSnippet: verifiedOutcomeSnippet,
      },
      {
        numberLabel: "04",
        question: "Why should I care?",
        dimensionLabel: "Credibility & proof",
        quickSignalNote: data.quickSignals?.[3]?.label || null,
        verifiedSnippet: verifiedProofSnippet,
      },
      {
        numberLabel: "05",
        question: "What should I do next?",
        dimensionLabel: "Next step / CTA",
        quickSignalNote: data.quickSignals?.[4]?.label || null,
        verifiedSnippet: verifiedPrimaryCta,
      },
    ];

    const firstSecondsRows = canonicalQuestions.map((canon, idx) => {
      const matched =
        (data.firstSeconds || []).find(
          (q) => q.question.trim().toLowerCase() === canon.question.toLowerCase()
        ) || data.firstSeconds?.[idx];

      const label: string = matched?.label || "Partly clear";
      const type: "clear" | "partly" | "unclear" = matched?.type || "partly";

      return {
        numberLabel: canon.numberLabel,
        question: canon.question,
        dimensionLabel: canon.dimensionLabel,
        label,
        type,
        quickSignalNote: canon.quickSignalNote,
        verifiedSnippet: canon.verifiedSnippet,
      };
    });

    // Clean visitor thought from validated result payload
    const cleanVisitorThought = stripOuterQuotes(data.visitorThought);

    // Focused primary issue evidence for Section 05 (so Section 05 focuses on #1 issue
    // without ever contradicting the targeted signal or left-column diagnosis)
    const normalizeIssueCategory = (rawCat?: string): "clarity" | "audience" | "value" | "trust" | "action" => {
      const c = (rawCat || "").trim().toLowerCase();
      if (c.includes("trust") || c.includes("credibility")) return "trust";
      if (c.includes("audience")) return "audience";
      if (c.includes("value") || c.includes("positioning")) return "value";
      if (c.includes("action") || c.includes("cta")) return "action";
      return "clarity";
    };

    const primaryIssueCategory = normalizeIssueCategory(
      overviewStats.primaryRisk?.category || overviewStats.weakest?.id || "clarity"
    );

    const categoryKeywordMap: Record<"clarity" | "audience" | "value" | "trust" | "action", RegExp> = {
      clarity: /product category|scanning|headline|clarity/i,
      audience: /audience|role|who/i,
      value: /outcome|benefit|value/i,
      trust: /proof|trust|logo|credential/i,
      action: /action|cta|friction|next-step/i,
    };

    const fallbackGapByCategory: Record<"clarity" | "audience" | "value" | "trust" | "action", string> = {
      clarity: "Product category wording requires clearer specificity in the hero section",
      audience: "Target audience or intended user role is not explicitly stated in the hero section",
      value: "Primary value statement could express a more concrete, measurable visitor outcome",
      trust: "Verifiable proof points, customer logos, or credentials were not detected in the extracted homepage content",
      action: "Primary call-to-action path could set clearer expectations for what happens next",
    };

    const primaryPattern = categoryKeywordMap[primaryIssueCategory];

    // Never fall back to verifiedMissingFindings[0] from an unrelated signal category,
    // which would contradict the primary issue diagnosis in Section 05.
    const primaryFocusedMissingFinding =
      verifiedMissingFindings.find((item) => primaryPattern.test(item)) ||
      fallbackGapByCategory[primaryIssueCategory];

    const rawCurrentRecQuote = stripOuterQuotes(
      data.recommendation?.currentDirection
    );
    const hasPrimaryRecQuote = Boolean(
      rawCurrentRecQuote &&
        !isGenericExcerptPlaceholder(rawCurrentRecQuote) &&
        !/^(none|n\/a|not found|missing)$/i.test(rawCurrentRecQuote)
    );

    const isPrimaryRecQuoteAligned =
      hasPrimaryRecQuote &&
      (primaryIssueCategory === "clarity" ||
        primaryIssueCategory === "value" ||
        primaryPattern.test(
          `${data.recommendation?.subhead || ""} ${data.recommendation?.explanation || ""}`
        ));

    return {
      hasVerifiedExcerpt,
      verifiedExcerptText: hasVerifiedExcerpt ? rawExcerpt : null,
      verifiedHeadline,
      verifiedSubheadline,
      verifiedPrimaryCta,
      verifiedClearFindings,
      verifiedMissingFindings,
      firstSecondsRows,
      cleanVisitorThought: cleanVisitorThought.length > 0 ? cleanVisitorThought : null,
      primaryFocusedMissingFinding,
      primaryRecQuote: hasPrimaryRecQuote ? rawCurrentRecQuote : null,
      isPrimaryRecQuoteAligned,
    };
  }, [
    data.evidence,
    data.firstSeconds,
    data.quickSignals,
    data.visitorThought,
    data.recommendation,
    overviewStats.primaryRisk,
    overviewStats.weakest,
  ]);

  // Phase 6: Derive Five Detailed Signals (12), Communication Risks (13), and Other Recommended Improvements (14)
  const phase6DetailedData = useMemo(() => {
    const normalizeText = (value?: string): string =>
      (value || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const areTextsDuplicate = (normA: string, normB: string): boolean => {
      if (!normA || !normB) return false;
      if (normA === normB) return true;
      if (normA.length >= 16 && normB.length >= 16) {
        return normA.includes(normB) || normB.includes(normA);
      }
      return false;
    };

    const signalMetaById: Record<
      string,
      {
        indexLabel: "01" | "02" | "03" | "04" | "05";
        shortQuestion: string;
        detailedQuestion: string;
        comprehensionIndex: number;
        clearPattern: RegExp;
        missingPattern: RegExp;
      }
    > = {
      "first-impression": {
        indexLabel: "01",
        shortQuestion: "Is it immediately clear?",
        detailedQuestion: "Is it immediately clear what this website or product does?",
        comprehensionIndex: 0,
        clearPattern: /^product category:/i,
        missingPattern: /product category|scanning|headline|clarity/i,
      },
      audience: {
        indexLabel: "02",
        shortQuestion: "Who is this built for?",
        detailedQuestion: "Can the right audience quickly tell this is meant for them?",
        comprehensionIndex: 1,
        clearPattern: /^target audience:/i,
        missingPattern: /target audience|user role|audience/i,
      },
      value: {
        indexLabel: "03",
        shortQuestion: "Why should a visitor care?",
        detailedQuestion: "Is the main benefit or outcome clear and compelling?",
        comprehensionIndex: 2,
        clearPattern: /^primary outcome:/i,
        missingPattern: /outcome|measurable benefit|value/i,
      },
      trust: {
        indexLabel: "04",
        shortQuestion: "Why should they believe it?",
        detailedQuestion: "Are there visible reasons to believe the website is credible?",
        comprehensionIndex: 3,
        clearPattern: /^(proof element:|credibility signals)/i,
        missingPattern: /proof points|logos|metrics|credentials|trust/i,
      },
      action: {
        indexLabel: "05",
        shortQuestion: "What is the next step?",
        detailedQuestion: "Is the main action obvious and low-friction?",
        comprehensionIndex: 4,
        clearPattern: /^primary action:/i,
        missingPattern: /call-to-action|primary action|vague|competing|high-friction/i,
      },
    };

    const indexFallbacks: Array<"01" | "02" | "03" | "04" | "05"> = [
      "01",
      "02",
      "03",
      "04",
      "05",
    ];

    const detailedSignals = data.signals.map((sig, idx) => {
      const meta = signalMetaById[sig.id];
      const indexLabel = meta?.indexLabel || indexFallbacks[idx] || "05";
      const shortQuestion =
        meta?.shortQuestion ||
        overviewStats.questionBySignalId[sig.id] ||
        "Visitor signal";
      const detailedQuestion =
        meta?.detailedQuestion ||
        overviewStats.questionBySignalId[sig.id] ||
        "How clearly is this signal communicated on the homepage?";

      const compIdx = meta ? meta.comprehensionIndex : idx;
      const comprehensionRow =
        visitorUnderstandingAndEvidence.firstSecondsRows[compIdx] || null;
      const quickTakeaway = data.quickSignals?.[compIdx]?.label || null;

      const verifiedClearFinding = meta
        ? visitorUnderstandingAndEvidence.verifiedClearFindings.find((f) =>
            meta.clearPattern.test(f)
          ) || null
        : null;

      const verifiedMissingFinding = meta
        ? visitorUnderstandingAndEvidence.verifiedMissingFindings.find((f) =>
            meta.missingPattern.test(f)
          ) || null
        : null;

      const isStrongest = Boolean(
        overviewStats.strongest && overviewStats.strongest.id === sig.id
      );
      const isWeakest = Boolean(
        overviewStats.weakest &&
          overviewStats.weakest.id === sig.id &&
          overviewStats.weakest.id !== overviewStats.strongest?.id
      );

      // Concise 1-line summary for Section 04 Overview so full sig.description is reserved for Section 12
      const overviewTakeaway = comprehensionRow
        ? `${comprehensionRow.dimensionLabel}: ${comprehensionRow.label}`
        : sig.badgeText;

      return {
        ...sig,
        indexLabel,
        shortQuestion,
        detailedQuestion,
        overviewTakeaway,
        comprehensionRow,
        verifiedClearFinding,
        verifiedMissingFinding,
        isStrongest,
        isWeakest,
      };
    });

    // Format category names for Communication Risks (Section 13)
    const categoryLabelMap: Record<string, string> = {
      clarity: "Clarity & First Impression",
      audience: "Target Audience",
      value: "Value Proposition",
      trust: "Trust & Credibility",
      action: "Call to Action",
    };

    const formatRiskCategory = (rawCat?: string): string => {
      const key = (rawCat || "").trim().toLowerCase();
      return categoryLabelMap[key] || rawCat || "Communication";
    };

    const primaryRisk = overviewStats.primaryRisk
      ? {
          ...overviewStats.primaryRisk,
          categoryLabel: formatRiskCategory(overviewStats.primaryRisk.category),
        }
      : null;

    // Resolve the targeted signal for the primary risk so Section 05 header/badges never contradict the issue body
    const resolveRiskSignalId = (rawCat?: string): string | undefined => {
      const c = (rawCat || "").trim().toLowerCase();
      if (!c) return undefined;
      if (c.includes("trust") || c.includes("credibility")) return "trust";
      if (c.includes("audience")) return "audience";
      if (c.includes("value") || c.includes("positioning")) return "value";
      if (c.includes("action") || c.includes("cta")) return "action";
      if (c.includes("clarity") || c.includes("first-impression") || c.includes("first_impression")) {
        return "first-impression";
      }
      return undefined;
    };
    const primaryRiskSignalId = primaryRisk
      ? resolveRiskSignalId(primaryRisk.category)
      : undefined;
    const primaryIssueTargetSignal = primaryRiskSignalId
      ? data.signals.find((s) => s.id === primaryRiskSignalId) || overviewStats.weakest
      : overviewStats.weakest;

    // Resolve the targeted signal for Section 06 (#1 Priority Fix) based on what the fix actually addresses
    const resolvePriorityFixSignal = () => {
      const recText = `${data.recommendation?.subhead || ""} ${data.recommendation?.explanation || ""}`.toLowerCase();
      let matchedId: string | null = null;
      if (/\b(trust|proof|credibility|testimonial|logo|logos|metric|metrics|credential|social proof|validation|case stud)\b/i.test(recText)) {
        matchedId = "trust";
      } else if (/\b(cta|call to action|call-to-action|button|next step|friction|action)\b/i.test(recText)) {
        matchedId = "action";
      } else if (/\b(audience|who it is for|who this is for|persona|role|built for|target user|ideal customer)\b/i.test(recText)) {
        matchedId = "audience";
      } else if (/\b(outcome|benefit|value proposition|measurable|what visitors get|what i get)\b/i.test(recText)) {
        matchedId = "value";
      } else if (/\b(product category|what it is|first impression|headline|h1|hero)\b/i.test(recText)) {
        matchedId = "first-impression";
      }
      if (matchedId) {
        const found = data.signals.find((s) => s.id === matchedId);
        if (found) return found;
      }
      return primaryIssueTargetSignal || overviewStats.weakest || null;
    };

    const priorityFixTargetSignal = resolvePriorityFixSignal();

    const stripGuidanceQuotes = (val?: string): string =>
      (val || "")
        .replace(/^[“"'\s]+|[”"'\s]+$/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const isPlaceholderGuidance = (val: string): boolean => {
      const lower = val.toLowerCase();
      return (
        !lower ||
        lower === "current headline excerpt unavailable" ||
        lower === "state the specific outcome your target audience achieves." ||
        lower.includes("we scanned your accessible homepage structure") ||
        lower.includes("we scanned your homepage above the fold structure") ||
        lower === "none" ||
        lower === "n/a" ||
        lower === "unavailable"
      );
    };

    const rawWhatYouSayNow = stripGuidanceQuotes(data.recommendation?.currentDirection);
    const rawClearerDirection = stripGuidanceQuotes(data.recommendation?.strongerDirection);

    const priorityFixCurrentText = !isPlaceholderGuidance(rawWhatYouSayNow)
      ? rawWhatYouSayNow
      : visitorUnderstandingAndEvidence.verifiedHeadline ||
        visitorUnderstandingAndEvidence.verifiedExcerptText ||
        null;

    const priorityFixDirectionText = !isPlaceholderGuidance(rawClearerDirection)
      ? rawClearerDirection
      : data.recommendation?.explanation || null;

    const normPrimaryRiskTitle = normalizeText(primaryRisk?.title);
    const seenRiskTitles = new Set<string>(
      normPrimaryRiskTitle ? [normPrimaryRiskTitle] : []
    );

    const secondaryRisks = overviewStats.secondaryRisks
      .filter((risk) => {
        const normTitle = normalizeText(risk.title);
        if (!normTitle || seenRiskTitles.has(normTitle)) return false;
        if (
          normPrimaryRiskTitle &&
          areTextsDuplicate(normPrimaryRiskTitle, normTitle)
        ) {
          return false;
        }
        seenRiskTitles.add(normTitle);
        return true;
      })
      .map((risk, idx) => ({
        ...risk,
        riskNumber: idx + 2,
        categoryLabel: formatRiskCategory(risk.category),
      }));

    // Deduplicate Other Recommended Improvements (Section 14) against #1 Priority Fix
    const normPrimaryFixTitle = normalizeText(data.recommendation?.subhead);
    const seenImprovementTitles = new Set<string>();

    const deduplicatedImprovements = (data.otherImprovements || [])
      .filter((item) => {
        const normTitle = normalizeText(item?.title);
        if (!normTitle) return false;
        if (
          normPrimaryFixTitle &&
          areTextsDuplicate(normPrimaryFixTitle, normTitle)
        ) {
          return false;
        }
        for (const existing of seenImprovementTitles) {
          if (areTextsDuplicate(existing, normTitle)) {
            return false;
          }
        }
        seenImprovementTitles.add(normTitle);
        return true;
      })
      .map((item, idx) => {
        const matchingStep = priorityFixPlan.find(
          (s) => s.linkedImprovementId === item.id
        );
        const hasCopyReadyCard = copyReadyImprovements.some(
          (c) => c.id === `copy-${item.id}`
        );
        return {
          ...item,
          orderLabel: String(idx + 1).padStart(2, "0"),
          relatedPlanStep: matchingStep ? matchingStep.stepNumber : null,
          hasCopyReadyCard,
        };
      });

    return {
      detailedSignals,
      primaryRisk,
      primaryIssueTargetSignal,
      priorityFixTargetSignal,
      priorityFixCurrentText,
      priorityFixDirectionText,
      secondaryRisks,
      totalRisksCount: (primaryRisk ? 1 : 0) + secondaryRisks.length,
      deduplicatedImprovements,
    };
  }, [
    data.signals,
    data.quickSignals,
    data.recommendation,
    data.otherImprovements,
    overviewStats,
    visitorUnderstandingAndEvidence,
    priorityFixPlan,
    copyReadyImprovements,
  ]);

  // Phase 2: Animate score counter
  useEffect(() => {
    if (!customData || customData.score === undefined) return;
    if (prefersReducedMotion || hasAnimatedScore) {
      const rafId = requestAnimationFrame(() => {
        setDisplayScore(data.score);
      });
      return () => cancelAnimationFrame(rafId);
    }

    let startTimestamp: number | null = null;
    let rafId: number;
    const duration = 800; // ms

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easedProgress = progress * (2 - progress);
      setDisplayScore(Math.floor(easedProgress * data.score));

      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        setDisplayScore(data.score);
        setHasAnimatedScore(true);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [customData, data.score, prefersReducedMotion, hasAnimatedScore]);

  // Persistence: Safely load previous check for domain & store current result in localStorage
  // Uses WeakMap instance tracking so rerenders or StrictMode remounts never compare the current report to itself.
  useEffect(() => {
    if (typeof window === "undefined" || !customData || customData.score === undefined) return;
    if (previousCheckRecord !== undefined) return;

    const syncResult = syncReportWithHistoryStorage({
      reportInstanceKey: customData,
      domainInput: data.domain || cleanDomain,
      score: data.score,
      signals: data.signals,
    });

    const rafId = requestAnimationFrame(() => {
      setPreviousRecord(syncResult.previousRecord);
      setHadCorruptedHistory(syncResult.hadCorruptedData);
    });

    return () => cancelAnimationFrame(rafId);
  }, [cleanDomain, customData, data.domain, data.score, data.signals, previousCheckRecord]);

  // Phase 7: Evaluate Comparison Eligibility & Before -> After Deltas
  const comparisonEvaluation = useMemo(() => {
    const candidatePrevious =
      previousCheckRecord !== undefined ? previousCheckRecord : previousRecord;
    return evaluateComparisonEligibility({
      currentDomainInput: data.domain || cleanDomain,
      currentScore: customData?.score,
      currentSignals: data.signals,
      previousRecord: candidatePrevious,
    });
  }, [
    cleanDomain,
    customData?.score,
    data.domain,
    data.signals,
    previousCheckRecord,
    previousRecord,
  ]);

  // Multi-Page Phase 3: Defensively validate and format optional Supporting Pages Context
  const supportingPagesInsights = useMemo(() => {
    const rawCtx = data.supportingContext;
    if (!rawCtx || typeof rawCtx !== "object") return null;
    if (rawCtx.status !== "available" && rawCtx.status !== "partial") {
      return null;
    }
    if (!Array.isArray(rawCtx.pagesAnalyzed) || rawCtx.pagesAnalyzed.length === 0) {
      return null;
    }

    const baseHost = (data.domain || cleanDomain)
      .toLowerCase()
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split("/")[0]
      .split("?")[0]
      .split("#")[0];

    const normalizeSafePageUrl = (
      rawUrl: unknown
    ): {
      safeHref: string;
      displayUrl: string;
      urlKey: string;
      pathname: string;
    } | null => {
      if (typeof rawUrl !== "string" || !rawUrl.trim()) return null;
      const trimmed = rawUrl.trim();
      if (!/^https?:\/\//i.test(trimmed)) return null;
      try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          return null;
        }
        if (parsed.username || parsed.password) return null;
        const candidateHost = parsed.hostname.toLowerCase().replace(/^www\./i, "");
        if (!candidateHost || (baseHost && candidateHost !== baseHost)) {
          return null;
        }
        // Strip query parameters and hash fragments to prevent leaking sensitive query params
        parsed.search = "";
        parsed.hash = "";
        let normPath = parsed.pathname
          .replace(/\/{2,}/g, "/")
          .replace(/\/index\.(html?|php)$/i, "");
        if (normPath.length > 1 && normPath.endsWith("/")) {
          normPath = normPath.slice(0, -1);
        }
        if (!normPath || normPath === "/") {
          return null; // Never treat homepage root as a supporting page
        }
        parsed.pathname = normPath;
        return {
          safeHref: parsed.href,
          displayUrl: `${candidateHost}${normPath}`,
          urlKey: `${candidateHost}${normPath.toLowerCase()}`,
          pathname: normPath,
        };
      } catch {
        return null;
      }
    };

    const formatCategoryLabel = (rawCategory: unknown): string => {
      const cat =
        typeof rawCategory === "string"
          ? rawCategory.trim().toLowerCase()
          : "other";
      const map: Record<string, string> = {
        pricing: "Pricing",
        features: "Features",
        product: "Product",
        how_it_works: "How It Works",
        solutions: "Solutions",
        use_cases: "Use Cases",
        customers: "Customers",
        security: "Security",
        about: "About",
        docs: "Documentation",
        other: "Supporting Page",
      };
      return (
        map[cat] ||
        cat
          .replace(/[_-]+/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase())
      );
    };

    const isSafePlainText = (val: unknown, maxLen = 420): val is string => {
      if (typeof val !== "string") return false;
      const t = val.trim();
      if (!t || t.length < 3 || t.length > maxLen) return false;
      // Reject raw HTML tags, stack traces, or credential/JSON leaks
      if (
        /<\s*(script|html|body|iframe|style|div|section)\b/i.test(t) ||
        t.includes("\n    at ") ||
        t.includes("API_KEY") ||
        t.startsWith("{")
      ) {
        return false;
      }
      return true;
    };

    // 1. Validate Pages Reviewed (Max 3 unique same-domain supporting pages)
    const pagesReviewed: Array<{
      safeHref: string;
      displayUrl: string;
      urlKey: string;
      pathname: string;
      categoryLabel: string;
      title?: string;
    }> = [];
    const pageByUrlKey = new Map<
      string,
      {
        safeHref: string;
        displayUrl: string;
        categoryLabel: string;
        pathname: string;
      }
    >();

    for (const item of rawCtx.pagesAnalyzed) {
      if (pagesReviewed.length >= 3) break;
      if (!item || typeof item !== "object") continue;
      const norm = normalizeSafePageUrl(item.url);
      if (!norm || pageByUrlKey.has(norm.urlKey)) continue;

      const categoryLabel = formatCategoryLabel(item.category);
      const cleanTitle = isSafePlainText(item.title, 160)
        ? item.title.trim()
        : undefined;

      const entry = {
        ...norm,
        categoryLabel,
        ...(cleanTitle ? { title: cleanTitle } : {}),
      };
      pagesReviewed.push(entry);
      pageByUrlKey.set(norm.urlKey, {
        safeHref: norm.safeHref,
        displayUrl: norm.displayUrl,
        categoryLabel,
        pathname: norm.pathname,
      });
    }

    if (pagesReviewed.length === 0) {
      return null;
    }

    // Helper to validate SourceEvidence strictly against pagesReviewed
    const validateUiEvidence = (
      rawEvList: unknown,
      isTrustSection = false
    ): Array<{
      safeSourceUrl: string;
      displaySourceUrl: string;
      sourceCategoryLabel: string;
      excerpt: string;
      interpretation?: string;
      claimBadgeLabel?: string;
      isPublishedClaim: boolean;
    }> => {
      if (!Array.isArray(rawEvList)) return [];
      const validList: Array<{
        safeSourceUrl: string;
        displaySourceUrl: string;
        sourceCategoryLabel: string;
        excerpt: string;
        interpretation?: string;
        claimBadgeLabel?: string;
        isPublishedClaim: boolean;
      }> = [];
      const seen = new Set<string>();

      for (const ev of rawEvList) {
        if (!ev || typeof ev !== "object") continue;
        const rawSource = (ev as any).sourceUrl;
        const rawExcerpt = (ev as any).excerpt;
        const rawInterp = (ev as any).interpretation;
        const rawBasis = (ev as any).claimBasis;

        const normSource = normalizeSafePageUrl(rawSource);
        if (!normSource) continue;
        const matchedPage = pageByUrlKey.get(normSource.urlKey);
        if (!matchedPage) continue; // Must match an actually reviewed supporting page

        if (!isSafePlainText(rawExcerpt, 360)) continue;
        const excerpt = rawExcerpt.trim();
        if (excerpt.length < 4) continue;

        const dedupeKey = `${normSource.urlKey}|${excerpt.toLowerCase()}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        const hasClaimPattern =
          rawBasis === "website_published_claim" ||
          /\b(trusted by|customers|users|uptime|soc\s?2|iso\s?27001|gdpr|hipaa|certified|award|guaranteed|saved|\d+%|\$\d+|\d+\+)/i.test(
            excerpt
          );

        let interpretation = isSafePlainText(rawInterp, 260)
          ? rawInterp.trim()
          : undefined;

        if (interpretation && isTrustSection) {
          interpretation = interpretation
            .replace(
              /\b(independently verified|verified fact|proven fact|conclusively proves|proves that|guarantees that)\b/gi,
              "published on the website as"
            );
        }

        validList.push({
          safeSourceUrl: matchedPage.safeHref,
          displaySourceUrl: matchedPage.displayUrl,
          sourceCategoryLabel: matchedPage.categoryLabel,
          excerpt,
          ...(interpretation ? { interpretation } : {}),
          ...(isTrustSection
            ? {
                claimBadgeLabel: hasClaimPattern
                  ? "Website-published claim"
                  : "Observed on page",
              }
            : {}),
          isPublishedClaim: hasClaimPattern,
        });
      }

      return validList.slice(0, 4);
    };

    // 2. Validate Message Consistency
    let messageConsistency: {
      statusLabel: string;
      statusTone: "emerald" | "blue" | "amber" | "slate";
      assessment: string;
      evidence: ReturnType<typeof validateUiEvidence>;
    } | null = null;

    if (
      rawCtx.messageConsistency &&
      typeof rawCtx.messageConsistency === "object" &&
      isSafePlainText(rawCtx.messageConsistency.assessment, 450)
    ) {
      const ev = validateUiEvidence(rawCtx.messageConsistency.evidence, false);
      const rawStatus = rawCtx.messageConsistency.status;
      if (ev.length > 0 || rawStatus === "insufficient_evidence") {
        let statusLabel = "Supports homepage message";
        let statusTone: "emerald" | "blue" | "amber" | "slate" = "blue";
        if (rawStatus === "consistent") {
          statusLabel = "Consistent with homepage";
          statusTone = "emerald";
        } else if (rawStatus === "clarifies_homepage") {
          statusLabel = "Clarifies homepage promise";
          statusTone = "blue";
        } else if (rawStatus === "divergent") {
          statusLabel = "Meaningful difference noted";
          statusTone = "amber";
        } else if (rawStatus === "insufficient_evidence") {
          statusLabel = "Limited text extracted";
          statusTone = "slate";
        }
        messageConsistency = {
          statusLabel,
          statusTone,
          assessment: rawCtx.messageConsistency.assessment.trim(),
          evidence: ev,
        };
      }
    }

    // 3. Validate Additional Trust Context
    let trustContext: {
      assessment: string;
      evidence: ReturnType<typeof validateUiEvidence>;
      hasPublishedClaims: boolean;
    } | null = null;

    if (
      rawCtx.trustContext &&
      typeof rawCtx.trustContext === "object" &&
      isSafePlainText(rawCtx.trustContext.assessment, 450)
    ) {
      const ev = validateUiEvidence(rawCtx.trustContext.evidence, true);
      const rawStatus = rawCtx.trustContext.status;
      if (ev.length > 0 || rawStatus === "insufficient_evidence") {
        const hasPublishedClaims = ev.some((e) => e.isPublishedClaim);
        let safeAssessment = rawCtx.trustContext.assessment
          .trim()
          .replace(
            /\b(independently verified|verified fact|proven fact|conclusively proves|proves that|guarantees that)\b/gi,
            "published on the website as"
          );
        if (
          hasPublishedClaims &&
          !/not independently verified/i.test(safeAssessment)
        ) {
          safeAssessment = `${safeAssessment.replace(/\.?\s*$/, "")} (website-published claim, not independently verified).`;
        }
        trustContext = {
          assessment: safeAssessment,
          evidence: ev,
          hasPublishedClaims,
        };
      }
    }

    // 4. Validate Next-Step (CTA Destination) Context
    let ctaDestination: {
      inspectable: boolean;
      ctaText?: string;
      safeDestinationUrl?: string;
      displayDestinationUrl?: string;
      purposeClear?: boolean;
      alignsWithCtaWording?: boolean;
      nextActionUnderstandable?: boolean;
      assessment: string;
      evidence: ReturnType<typeof validateUiEvidence>;
    } | null = null;

    if (
      rawCtx.ctaDestination &&
      typeof rawCtx.ctaDestination === "object" &&
      isSafePlainText(rawCtx.ctaDestination.assessment, 450)
    ) {
      const ctaText = isSafePlainText(rawCtx.ctaDestination.ctaText, 90)
        ? rawCtx.ctaDestination.ctaText.trim()
        : undefined;

      if (rawCtx.ctaDestination.inspectable === true) {
        const normDest = normalizeSafePageUrl(rawCtx.ctaDestination.destinationUrl);
        const matchedDestPage = normDest
          ? pageByUrlKey.get(normDest.urlKey)
          : undefined;
        const ev = validateUiEvidence(rawCtx.ctaDestination.evidence, false);

        if (matchedDestPage && ev.length > 0) {
          ctaDestination = {
            inspectable: true,
            ctaText,
            safeDestinationUrl: matchedDestPage.safeHref,
            displayDestinationUrl: matchedDestPage.displayUrl,
            purposeClear:
              typeof rawCtx.ctaDestination.purposeClear === "boolean"
                ? rawCtx.ctaDestination.purposeClear
                : undefined,
            alignsWithCtaWording:
              typeof rawCtx.ctaDestination.alignsWithCtaWording === "boolean"
                ? rawCtx.ctaDestination.alignsWithCtaWording
                : undefined,
            nextActionUnderstandable:
              typeof rawCtx.ctaDestination.nextActionUnderstandable === "boolean"
                ? rawCtx.ctaDestination.nextActionUnderstandable
                : undefined,
            assessment: rawCtx.ctaDestination.assessment.trim(),
            evidence: ev,
          };
        }
      } else if (rawCtx.ctaDestination.inspectable === false) {
        ctaDestination = {
          inspectable: false,
          ctaText,
          assessment: rawCtx.ctaDestination.assessment.trim(),
          evidence: [],
        };
      }
    }

    // 5. Meaningful Insights Gate: Do not render an empty section when no grounded insights exist
    const hasGroundedInsight =
      Boolean(messageConsistency && messageConsistency.evidence.length > 0) ||
      Boolean(trustContext && trustContext.evidence.length > 0) ||
      Boolean(
        ctaDestination &&
          ctaDestination.inspectable &&
          ctaDestination.evidence.length > 0
      );

    if (!hasGroundedInsight) {
      return null;
    }

    // 6. Validate Analysis Limitations (only genuine limitations, no generic boilerplate or stack traces)
    const limitations: string[] = [];
    if (Array.isArray(rawCtx.limitations)) {
      for (const lim of rawCtx.limitations) {
        if (!isSafePlainText(lim, 320)) continue;
        const cleanedLim = lim.trim();
        // Skip generic non-limitation disclaimer strings that duplicate the Trust Context badge
        if (
          /supporting-page credibility items reflect website-published statements/i.test(
            cleanedLim
          )
        ) {
          continue;
        }
        if (!limitations.includes(cleanedLim)) {
          limitations.push(cleanedLim);
        }
      }
    }

    return {
      status: rawCtx.status,
      pagesReviewed,
      messageConsistency,
      trustContext,
      ctaDestination,
      limitations: limitations.slice(0, 4),
    };
  }, [cleanDomain, data.domain, data.supportingContext]);

  // Keyboard accessibility: Close tooltips and modals on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (activeInfoTooltip) setActiveInfoTooltip(false);
        if (activeCompareModal) setActiveCompareModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeInfoTooltip, activeCompareModal]);

  const showToast = (message: string, tone: "success" | "warning" = "success") => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToastTone(tone);
    setToastMessage(message);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 3200);
  };

  // Build plain-text diagnostic summary respecting Free Preview vs Full Report boundaries
  const buildReportSummaryText = () =>
    buildReportSummaryForExport(data, isReportUnlocked);

  // Clipboard Helper with Error Handling & Duplicate Click Protection
  const copyToClipboard = async (text: string, id: string, customToast?: string) => {
    if (copiedState === id) return;
    const cleanText = text.trim();
    if (!cleanText) {
      showToast("No replacement text available to copy.", "warning");
      return;
    }

    try {
      if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(cleanText);
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
      setCopiedState(id);
      if (customToast) {
        showToast(customToast, "success");
      }
      copyTimerRef.current = setTimeout(() => {
        setCopiedState(null);
        copyTimerRef.current = null;
      }, 2200);
    } catch {
      setCopiedState(null);
      showToast("Couldn't copy text automatically. Please select and copy manually.", "warning");
    }
  };

  // Phase 2: Honest Share Summary with Clipboard Fallback (Strictly Free Preview when locked)
  const handleShare = async () => {
    if (shareState !== "idle") return;
    setShareState("sharing");

    const summaryText = buildReportSummaryText();
    const shareData = {
      title: `StrangerLens ${isReportUnlocked ? "Full Report" : "Free Preview"} for ${cleanDomain} (${data.score}/100)`,
      text: summaryText,
    };

    if (navigator.share && typeof navigator.share === "function") {
      try {
        await navigator.share(shareData);
        setShareState("copied");
        showToast(
          isReportUnlocked
            ? "Full report summary shared!"
            : "Free preview summary shared!",
          "success"
        );
        setTimeout(() => setShareState("idle"), 2200);
        return;
      } catch {
        // Fallback to clipboard if user cancels or environment blocks navigator.share
      }
    }

    try {
      await navigator.clipboard.writeText(summaryText);
      setShareState("copied");
      showToast(
        isReportUnlocked
          ? "Full report summary copied to clipboard!"
          : "Free preview summary copied to clipboard!",
        "success"
      );
      setTimeout(() => setShareState("idle"), 2200);
    } catch {
      showToast("Couldn't copy report summary automatically.", "warning");
      setShareState("idle");
    }
  };

  // Phase 2: Honest Download Report Handler (Downloads Free Preview Summary when locked)
  const handleDownloadReport = () => {
    if (downloadState !== "idle") return;
    setDownloadState("preparing");

    setTimeout(() => {
      try {
        const reportText = buildReportSummaryText();
        const blob = new Blob([reportText], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const safeDomain = cleanDomain.replace(/[^a-z0-9.-]/gi, "-");
        const filePrefix = isReportUnlocked
          ? "strangerlens-full-report"
          : "strangerlens-free-preview";
        link.href = url;
        link.download = `${filePrefix}-${safeDomain}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setDownloadState("downloaded");
        showToast(`Downloaded ${filePrefix}-${safeDomain}.txt`, "success");
        setTimeout(() => setDownloadState("idle"), 2500);
      } catch {
        setDownloadState("failed");
        showToast("Couldn't download report file. Try copying the summary instead.", "warning");
        setTimeout(() => {
          setDownloadState("idle");
        }, 3000);
      }
    }, 250);
  };

  // Phase 2: Check Again Async Handler
  const handleCheckAgain = () => {
    if (checkAgainState !== "idle") return;
    setCheckAgainState("checking");

    setTimeout(() => {
      onRunNewCheck();
    }, 350);
  };

  // Toggle Accordion Improvement Row
  const toggleImprovementRow = (id: string) => {
    setExpandedImprovementId((prev) => (prev === id ? null : id));
  };

  // Focus Paywall Helper when clicking a locked section preview card or jump link
  const handleLockedSectionClick = (sectionNum: string, sectionTitle: string) => {
    const paywallEl = document.getElementById("paid-report-paywall-section");
    if (paywallEl) {
      paywallEl.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "center",
      });
    }
    const emailInputEl = document.getElementById(
      "paywall-email-input"
    ) as HTMLInputElement | null;
    if (emailInputEl) {
      setTimeout(() => {
        emailInputEl.focus({ preventScroll: true });
      }, 150);
    }
    showToast(
      `Section ${sectionNum} (${sectionTitle}) is part of the Full Report ($5). Enter your email above for launch access.`,
      "warning"
    );
  };

  const handleJumpLinkClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    sectionNum: string,
    sectionTitle: string
  ) => {
    if (!isReportUnlocked) {
      e.preventDefault();
      handleLockedSectionClick(sectionNum, sectionTitle);
    }
  };

  // Paywall Checkout Submit Handler (Honest Pre-Launch Coming Soon State — Never Fakes Payment Success)
  const handlePaywallCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (paywallCheckoutState === "processing") return;

    const trimmedEmail = paywallEmail.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setPaywallEmailError("Please enter a valid email address to continue.");
      return;
    }

    setPaywallEmailError(null);
    setPaywallCheckoutState("processing");

    const planLabel =
      selectedPaywallPlan === "single"
        ? "$5 Full Report"
        : "$12 Three-Report Pack";

    setTimeout(() => {
      setPaywallCheckoutState("coming_soon");
      showToast(
        `Paid checkout for the ${planLabel} is coming soon. No payment was processed.`,
        "warning"
      );
    }, 200);
  };

  // Enforce Real Analysis Only: Never show mock results or hardcoded scores
  if (!customData || customData.score === undefined) {
    return (
      <div className="min-h-screen bg-[#fafafc] text-slate-900 font-sans antialiased flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-lg">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-950 mb-2">No Analysis Data Available</h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            A real website scan must be performed to view visitor comprehension results for {cleanDomain}.
          </p>
          <button
            onClick={onBackToLanding}
            className="w-full rounded-full bg-[#1d68f5] hover:bg-blue-600 text-white font-medium text-sm py-3 transition shadow-sm cursor-pointer"
          >
            Check a website
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafc] text-slate-900 font-sans antialiased selection:bg-blue-100 selection:text-blue-900 flex flex-col relative">
      {/* Non-blocking Toast Feedback */}
      <AnimatePresence>
        {(copiedState || toastMessage) && (
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs sm:text-sm font-medium flex items-center gap-2 border border-slate-800 print:hidden"
            role="status"
            aria-live="polite"
          >
            {toastMessage ? (
              <>
                {toastTone === "warning" ? (
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <span>{toastMessage}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Suggested copy copied to clipboard!</span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. HEADER (Sticky Navigation Header) */}
      <header className="w-full bg-white/95 backdrop-blur-md border-b border-[#e7e9ee] sticky top-0 z-30 transition-all print:static print:border-b">
        <div className="max-w-[1180px] mx-auto px-4 sm:px-6 md:px-8 h-[64px] sm:h-[72px] flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center shrink-0">
            <button
              onClick={onBackToLanding}
              className="flex items-center gap-2 sm:gap-2.5 text-lg sm:text-xl font-bold tracking-tight text-slate-950 hover:opacity-80 transition cursor-pointer text-left min-h-[44px] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none rounded-md px-1"
              title="Return to StrangerLens Home"
              aria-label="Return to StrangerLens Home"
            >
              <div className="w-8 h-8 rounded-xl bg-slate-950 text-white flex items-center justify-center font-bold text-sm tracking-tighter shadow-xs shrink-0">
                S
              </div>
              <span className="whitespace-nowrap">StrangerLens</span>
            </button>
          </div>

          <div className="flex items-center gap-3 sm:gap-6 md:gap-8 print:hidden">
            <button
              onClick={onOpenFaq}
              className="text-xs sm:text-[15px] font-medium text-slate-700 hover:text-blue-600 transition-colors cursor-pointer min-h-[44px] inline-flex items-center px-1 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none rounded-md"
            >
              FAQ
            </button>
            <button
              onClick={onOpenPricing}
              className="text-xs sm:text-[15px] font-medium text-slate-700 hover:text-blue-600 transition-colors cursor-pointer min-h-[44px] inline-flex items-center px-1 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none rounded-md"
            >
              Pricing
            </button>
            <button
              onClick={onBackToLanding}
              className="rounded-full bg-[#1d68f5] hover:bg-blue-600 active:scale-[0.98] text-white text-xs sm:text-sm font-medium px-4 sm:px-5 py-2.5 transition-all duration-150 inline-flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap shrink-0 min-h-[44px] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
            >
              <span>Check website</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5 shrink-0" />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 w-full max-w-[1180px] mx-auto px-4 sm:px-6 md:px-8 pt-5 sm:pt-7 pb-16 sm:pb-24 space-y-6 sm:space-y-7">
        
        {/* ACCESS ERROR / PARTIAL WARNING STATE (If Homepage cannot be fully fetched) */}
        {data.isAccessError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 sm:p-5 text-amber-900 text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block text-amber-950 text-sm">We {"couldn't"} fully access this homepage.</strong>
                <p className="text-amber-800 mt-0.5">We {"couldn't"} complete the full first-impression check because part of the page was unavailable.</p>
              </div>
            </div>
            <button
              onClick={handleCheckAgain}
              className="rounded-full bg-amber-900 text-white hover:bg-amber-950 px-4 py-2 text-xs font-semibold shrink-0 cursor-pointer transition min-h-[44px]"
            >
              Try again →
            </button>
          </motion.div>
        )}

        {data.isPartialAccess && !data.isAccessError && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50/80 border border-amber-200/80 rounded-2xl px-4 py-3.5 text-amber-900 text-xs sm:text-[13px] flex items-start sm:items-center gap-3 shadow-2xs"
          >
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <p className="leading-relaxed">
              <strong className="font-semibold text-amber-950">Limited visible text detected:</strong>{" "}
              Some content on {data.domain} may load dynamically via client-side scripts. This report reflects the initial visible HTML seen on arrival.
            </p>
          </motion.div>
        )}

        {/* LEVEL 1 — INSTANT UNDERSTANDING */}
        <div
          id="level-1-instant-understanding"
          className="flex items-center justify-between gap-3 pt-0.5"
          aria-label="Level 1: Instant Understanding"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-blue-50 border border-blue-200/80 text-[10px] font-extrabold tracking-widest uppercase text-[#1d68f5] shrink-0">
              Level 1
            </span>
            <span className="text-xs sm:text-[13px] font-bold tracking-tight text-slate-800 uppercase">
              Instant Understanding
            </span>
            <span className="hidden sm:inline text-xs text-slate-400 truncate">
              — Score, verdict, five signals, biggest issue &amp; #1 priority fix
            </span>
          </div>
          <div className="h-px flex-1 bg-slate-200/80 hidden md:block" aria-hidden="true" />
        </div>

        {/* 01. WEBSITE + ANALYSIS DATE (Result Top Bar) */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 pb-0.5 scroll-mt-24"
        >
          {/* Left: Dynamic Domain Identity Pill & Prior Check Delta */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white border border-[#e3eaf5] shadow-2xs text-xs sm:text-[13px] text-slate-600 max-w-full min-h-[44px]">
              <div className="w-6 h-6 rounded-full bg-[#eaf2ff] text-[#246bfd] flex items-center justify-center shrink-0">
                <Link2 className="w-3.5 h-3.5" />
              </div>
              <span className="truncate max-w-[175px] sm:max-w-[260px] md:max-w-xs font-normal">
                <strong className="font-bold text-slate-950">{data.domain}</strong>
                <span className="text-slate-400 mx-1.5">·</span>
                <span className="text-slate-600">First-impression report</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 pl-2 border-l border-slate-200 shrink-0">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{data.checkedAt}</span>
              </span>
            </div>

            {comparisonEvaluation.isEligible && comparisonEvaluation.overall && (
              <button
                type="button"
                onClick={() => setActiveCompareModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white border border-[#e3eaf5] hover:border-blue-300 text-xs font-semibold text-slate-700 hover:text-blue-600 transition cursor-pointer shadow-2xs min-h-[44px] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none print:hidden"
                title="Compare with previous check"
              >
                <BarChart2 className="w-3.5 h-3.5 text-[#246bfd] shrink-0" />
                <span className="tabular-nums">
                  {comparisonEvaluation.overall.delta > 0
                    ? `+${comparisonEvaluation.overall.delta} pts vs last check`
                    : comparisonEvaluation.overall.delta < 0
                    ? `${comparisonEvaluation.overall.delta} pts vs last check`
                    : `Same as last check (${comparisonEvaluation.overall.beforeScore})`}
                </span>
              </button>
            )}
          </div>

          {/* Right: Utility Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap self-start md:self-auto print:hidden">
            <button
              onClick={handleCheckAgain}
              disabled={checkAgainState === "checking"}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border border-[#e3eaf5] text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-950 transition cursor-pointer shadow-2xs min-h-[44px] disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-slate-500 shrink-0 ${
                  checkAgainState === "checking" ? "animate-spin text-blue-600" : ""
                }`}
              />
              <span>{checkAgainState === "checking" ? "Checking…" : "Check again"}</span>
            </button>

            <button
              onClick={handleShare}
              title={
                isReportUnlocked
                  ? "Share or copy the full diagnostic report summary"
                  : "Share or copy the Free Preview summary"
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border border-[#e3eaf5] text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-950 transition cursor-pointer shadow-2xs min-h-[44px] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
            >
              {shareState === "copied" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="text-emerald-700 font-semibold">Summary copied</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Share summary</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownloadReport}
              disabled={downloadState === "preparing"}
              title={
                isReportUnlocked
                  ? "Download full report summary (.txt)"
                  : "Download Free Preview summary (.txt)"
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border border-[#e3eaf5] text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-950 transition cursor-pointer shadow-2xs min-h-[44px] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
            >
              {downloadState === "preparing" ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin shrink-0" />
                  <span>Preparing…</span>
                </>
              ) : downloadState === "downloaded" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="text-emerald-700 font-semibold">Downloaded ✓</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>
                    {isReportUnlocked ? "Download full report" : "Download free summary"}
                  </span>
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* 3. RESULTS HERO: VALUE CLARITY VERDICT & QUICK SIGNALS */}
        <motion.section
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white border border-[#e3eaf5] rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-8 shadow-[0_14px_34px_-15px_rgba(16,24,40,0.07)] relative scroll-mt-24 bg-gradient-to-b from-white to-[#f8faff]/50"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            {/* Zone 1: Score Visualization Ring (Left - 3 cols) */}
            <div
              data-score-section="VALUE CLARITY SCORE"
              className="lg:col-span-3 flex flex-col items-center lg:items-center text-center border-b lg:border-b-0 lg:border-r border-slate-100 pb-6 lg:pb-0 lg:pr-6 shrink-0"
            >
              <div className="flex items-center justify-center gap-1.5 mb-2.5 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                <span>OVERALL FIRST-IMPRESSION SCORE</span>
              </div>

              {/* Clean Circular Gauge */}
              <div className="relative w-[136px] h-[136px] sm:w-[148px] sm:h-[148px] flex items-center justify-center my-1">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
                  {/* Background Track */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#f1f5f9"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  {/* Animated Score Arc */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke={scoreVisuals.stroke}
                    strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - displayScore / 100)}`}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-300 ease-out"
                  />
                </svg>

                {/* Animated Score Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none tabular-nums">
                  <span className="text-4xl sm:text-[44px] font-extrabold text-slate-950 tracking-tight leading-none">
                    {displayScore}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold mt-1">
                    / 100
                  </span>
                </div>
              </div>

              {/* Subtle Score Tier Legend */}
              <div className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-slate-500 font-medium tabular-nums">
                <span>{overviewStats.clearSignalsCount} of 5 signals strong</span>
              </div>

              {/* Accessible Score Calculation Disclosure Trigger */}
              <button
                type="button"
                onClick={() => setActiveInfoTooltip((prev) => !prev)}
                aria-expanded={activeInfoTooltip}
                aria-controls="score-calculation-disclosure"
                className="mt-2.5 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[40px] rounded-xl text-xs font-semibold text-[#1d68f5] hover:text-blue-700 hover:bg-blue-50/80 border border-transparent hover:border-blue-100 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none print:hidden"
              >
                <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>How is this score calculated?</span>
              </button>
            </div>

            {/* Zone 2: Main Verdict Text (Center - 5 cols) */}
            <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-slate-100 pb-6 lg:pb-0 lg:pr-6 flex flex-col justify-center">
              {/* Status Badge + Eyebrow */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <motion.div
                  initial={prefersReducedMotion ? {} : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.2 }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${scoreVisuals.pillBg}`}
                >
                  {data.score >= 75 ? (
                    <Check className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
                  ) : data.score >= 50 ? (
                    <Zap className="w-3.5 h-3.5 fill-current shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{data.scoreStatus}</span>
                </motion.div>

                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  First-Impression Diagnosis
                </span>
              </div>

              {/* Main Verdict Headline */}
              <h1 className="text-xl sm:text-2xl lg:text-[24px] font-extrabold text-[#101828] tracking-tight leading-[1.3] mb-3 max-w-xl [text-wrap:balance]">
                {data.verdict}
              </h1>

              <p className="text-xs sm:text-[13px] text-[#526078] font-normal leading-relaxed">
                {data.verdictSubtext}
              </p>

              {/* Concise AI First-Impression Score Disclosure */}
              <p className="text-[11px] sm:text-xs text-slate-500 font-normal leading-relaxed mt-2">
                StrangerLens provides an AI-estimated first-impression score based on accessible homepage content. It does not measure actual visitor behavior or conversions.
              </p>

              {/* Strongest vs Primary Bottleneck Callout */}
              {overviewStats.strongest && overviewStats.weakest && (
                <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
                  <div className="inline-flex items-center gap-1.5 text-slate-600">
                    <span className="font-semibold text-emerald-700">Strongest:</span>
                    <span className="font-medium text-slate-900">
                      {overviewStats.strongest.title} ({overviewStats.strongest.score}/100)
                    </span>
                  </div>
                  <span className="text-slate-300 hidden sm:inline">·</span>
                  <div className="inline-flex items-center gap-1.5 text-slate-600">
                    <span className="font-semibold text-amber-700">Focus area:</span>
                    <span className="font-medium text-slate-900">
                      {overviewStats.weakest.title} ({overviewStats.weakest.score}/100)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Zone 3: Quick Signals Summary (Right - 4 cols) */}
            <div className="lg:col-span-4 pt-1 lg:pt-0">
              <div className="bg-[#f8fafc] border border-slate-200/70 rounded-2xl p-4 sm:p-4.5">
                <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 block mb-3">
                  5-SIGNAL SNAPSHOT AT A GLANCE
                </span>
                <div className="space-y-2.5">
                  {data.quickSignals.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2.5 text-xs sm:text-[13px] text-slate-800 font-medium leading-snug"
                    >
                      {item.type === "clear" ? (
                        <div className="w-5 h-5 rounded-full bg-[#dcfce7] text-[#16a34a] flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : item.type === "amber" ? (
                        <div className="w-5 h-5 rounded-full bg-[#fef3c7] text-[#b45309] flex items-center justify-center shrink-0">
                          <MinusCircle className="w-3 h-3 stroke-[2.5]" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-[#fee2e2] text-[#b91c1c] flex items-center justify-center shrink-0">
                          <X className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Expandable Score Calculation & Analysis Limitations Disclosure */}
          <AnimatePresence>
            {activeInfoTooltip && (
              <motion.div
                id="score-calculation-disclosure"
                role="region"
                aria-label="How the overall first-impression score is calculated and analysis limitations"
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="mt-6 pt-5 border-t border-slate-200/80"
              >
                <div className="bg-[#f8fafc] border border-[#e3eaf5] rounded-2xl p-4 sm:p-5 md:p-6 space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1d68f5] block mb-1">
                        SCORE METHODOLOGY &amp; SCOPE
                      </span>
                      <h2 className="text-sm sm:text-base font-extrabold text-[#101828] tracking-tight">
                        How is this score calculated?
                      </h2>
                      <p className="text-xs sm:text-[13px] text-[#526078] mt-1 leading-relaxed">
                        Your overall score is a weighted combination of five clarity signals evaluated from your homepage:
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveInfoTooltip(false)}
                      aria-label="Close score calculation explanation"
                      className="inline-flex items-center justify-center w-8 h-8 min-h-[36px] min-w-[36px] rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Five Signals & Actual Verified Weights */}
                  <div
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
                    role="list"
                    aria-label="Five evaluation signals and scoring weights"
                  >
                    {[
                      {
                        name: "First Impression",
                        weight: Math.round(SIGNAL_WEIGHTS.first_impression * 100),
                        description:
                          "How clearly the homepage communicates its overall purpose.",
                      },
                      {
                        name: "Audience",
                        weight: Math.round(SIGNAL_WEIGHTS.audience * 100),
                        description:
                          "Whether a first-time visitor can identify who the website is intended for.",
                      },
                      {
                        name: "Value",
                        weight: Math.round(SIGNAL_WEIGHTS.value * 100),
                        description:
                          "How specifically the homepage communicates the benefit or outcome.",
                      },
                      {
                        name: "Trust",
                        weight: Math.round(SIGNAL_WEIGHTS.trust * 100),
                        description:
                          "What credibility evidence is identifiable in the accessible homepage content.",
                      },
                      {
                        name: "Action",
                        weight: Math.round(SIGNAL_WEIGHTS.action * 100),
                        description:
                          "How clearly the homepage communicates what visitors should do next.",
                      },
                    ].map((sigInfo) => (
                      <div
                        key={sigInfo.name}
                        role="listitem"
                        className="bg-white border border-slate-200/80 rounded-xl p-3.5 flex flex-col justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-extrabold text-[#101828]">
                              {sigInfo.name}
                            </span>
                            <span className="text-[11px] font-bold text-[#1d68f5] tabular-nums">
                              {sigInfo.weight}%
                            </span>
                          </div>
                          <p className="text-[11px] sm:text-xs text-[#526078] leading-relaxed">
                            {sigInfo.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Scoring Interpretation & Analysis Scope */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                    <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                        SCORING INTERPRETATION
                      </span>
                      <p className="text-xs text-[#526078] leading-relaxed">
                        StrangerLens provides an AI-estimated first-impression score based on accessible homepage content. It summarizes the five signals above to highlight communication strengths and weaknesses, and does not measure actual visitor behavior or conversions.
                      </p>
                    </div>

                    <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                        ANALYSIS SCOPE &amp; LIMITATIONS
                      </span>
                      <p className="text-xs text-[#526078] leading-relaxed">
                        The assessment is based on homepage content accessible to StrangerLens via static HTML extraction. Some JavaScript-rendered or dynamic content may not be captured, and the check evaluates the homepage rather than all pages or visual browser rendering.
                        {data.isPartialAccess
                          ? " Note: Limited visible text was detected in the initial HTML for this page."
                          : ""}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        {/* WHAT YOUR WEBSITE IS ACTUALLY SAYING (Executive Interpretation Banner) */}
        {data.websiteMessage && (
          <motion.section
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.08, ease: "easeOut" }}
            className="bg-white border border-[#e3eaf5] rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-7 shadow-xs relative overflow-hidden scroll-mt-24"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-extrabold tracking-wider text-[#246bfd] bg-[#eaf2ff] border border-blue-100 px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 uppercase">
                  <Sparkles className="w-3 h-3 text-[#246bfd]" />
                  WHAT YOUR WEBSITE IS ACTUALLY SAYING
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  · Unbiased stranger interpretation
                </span>
              </div>
              {data.websiteMessage.confidence && (
                <span className="text-[11px] text-slate-500 font-medium capitalize">
                  Clarity confidence: <strong className="text-slate-800">{data.websiteMessage.confidence}</strong>
                </span>
              )}
            </div>
            <p className="text-sm sm:text-[17px] font-semibold text-[#101828] leading-relaxed mb-2">
              {data.websiteMessage.summary}
            </p>
            <p className="text-xs text-[#526078] font-normal">
              If an unbiased first-time visitor landed on <strong className="font-medium text-slate-700">{data.domain}</strong> without prior context, this is the message the homepage communicates.
            </p>
          </motion.section>
        )}

        {/* 04. FIVE FIRST-IMPRESSION SIGNALS OVERVIEW */}
        <section
          id="five-signal-overview-section"
          aria-labelledby="five-signal-overview-heading"
          className="bg-white border border-[#e3eaf5] rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-8 shadow-xs scroll-mt-24"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
            <div>
              <span className="inline-block text-[10px] font-bold tracking-widest text-[#246bfd] uppercase bg-[#eaf2ff] px-2.5 py-0.5 rounded-full border border-blue-100 mb-2">
                FIVE SIGNAL OVERVIEW
              </span>
              <h2
                id="five-signal-overview-heading"
                className="text-lg sm:text-xl font-extrabold text-[#101828] tracking-tight"
              >
                Your five first-impression signals
              </h2>
              <p className="text-xs sm:text-sm text-[#526078] mt-0.5">
                At-a-glance scorecard across the five core dimensions that shape visitor comprehension and conversion.
              </p>
            </div>
            <div className="flex items-center gap-3 self-start sm:self-auto shrink-0 print:hidden">
              <a
                href="#five-detailed-signals-section"
                onClick={(e) =>
                  handleJumpLinkClick(e, "13", "Five Detailed Signal Breakdown")
                }
                className="text-xs font-bold text-[#1d68f5] hover:text-blue-700 transition-colors inline-flex items-center gap-1 min-h-[40px] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none rounded"
              >
                <span>Detailed breakdown</span>
                <ArrowDown className="w-3.5 h-3.5" />
              </a>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <button
                onClick={onOpenFaq}
                className="text-xs font-semibold text-slate-600 hover:text-[#246bfd] transition-colors inline-flex items-center gap-1 cursor-pointer min-h-[40px] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none rounded"
              >
                <span>How signals are scored</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 5 Equal Cards Grid — Responsive on Mobile (1 col), Tablet (2-3 cols), Desktop (5 cols) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {phase6DetailedData.detailedSignals.map((sig, index) => {
              const barColor =
                sig.badgeType === "clear"
                  ? "bg-emerald-500"
                  : sig.badgeType === "amber"
                  ? "bg-amber-500"
                  : "bg-rose-500";

              const cardBorderHover =
                sig.badgeType === "clear"
                  ? "hover:border-emerald-300"
                  : sig.badgeType === "amber"
                  ? "hover:border-amber-300"
                  : "hover:border-rose-300";

              const iconTone =
                sig.badgeType === "clear"
                  ? "bg-emerald-50 text-emerald-600"
                  : sig.badgeType === "amber"
                  ? "bg-amber-50 text-amber-600"
                  : "bg-rose-50 text-rose-600";

              return (
                <motion.div
                  key={sig.id}
                  initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.28, ease: "easeOut" }}
                  className={`border border-[#e3eaf5] ${cardBorderHover} rounded-2xl p-4 sm:p-5 flex flex-col justify-between bg-white shadow-2xs hover:shadow-md transition-all duration-200`}
                >
                  <div>
                    {/* Top Row: Icon + Status Pill */}
                    <div className="flex items-center justify-between gap-2 mb-3.5">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${iconTone}`}
                      >
                        {sig.icon === "eye" && <Eye className="w-4 h-4" />}
                        {sig.icon === "users" && <Users className="w-4 h-4" />}
                        {sig.icon === "sparkles" && <Sparkles className="w-4 h-4" />}
                        {sig.icon === "shield" && <Shield className="w-4 h-4" />}
                        {sig.icon === "arrow" && <ArrowRight className="w-4 h-4" />}
                      </div>

                      {sig.badgeType === "clear" ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#dcfce7] text-[#15803d]">
                          {sig.badgeText}
                        </span>
                      ) : sig.badgeType === "amber" ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#fef3c7] text-[#b45309]">
                          {sig.badgeText}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#fee2e2] text-[#b91c1c]">
                          {sig.badgeText}
                        </span>
                      )}
                    </div>

                    {/* Signal Title & Core Question */}
                    <h3 className="font-bold text-[#101828] text-sm sm:text-[15px] leading-snug">
                      {sig.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium mb-3">
                      {sig.shortQuestion}
                    </p>

                    {/* Numeric Score + Visual Progress Bar */}
                    <div className="mb-3.5">
                      <div className="flex items-baseline justify-between gap-1 mb-1.5 tabular-nums">
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl sm:text-[26px] font-extrabold text-[#101828] leading-none">
                            {sig.score}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">/ 100</span>
                        </div>
                        {sig.isStrongest && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            Strongest
                          </span>
                        )}
                        {sig.isWeakest && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded">
                            Focus area
                          </span>
                        )}
                      </div>
                      <div
                        className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden"
                        role="progressbar"
                        aria-valuenow={sig.score}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${sig.title} score: ${sig.score} out of 100`}
                      >
                        <motion.div
                          initial={prefersReducedMotion ? { width: `${sig.score}%` } : { width: 0 }}
                          animate={{ width: `${Math.max(4, Math.min(100, sig.score))}%` }}
                          transition={{ duration: 0.65, delay: 0.1 + index * 0.05, ease: "easeOut" }}
                          className={`h-full rounded-full ${barColor}`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Concise Snapshot Takeaway (Full paragraph is in Section 12 below) */}
                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-xs text-[#526078] font-medium leading-snug truncate">
                      {sig.overviewTakeaway}
                    </span>
                    <a
                      href={`#detailed-signal-${sig.id}`}
                      onClick={(e) =>
                        handleJumpLinkClick(e, "13", "Five Detailed Signal Breakdown")
                      }
                      aria-label={`Jump to ${sig.title} detailed analysis`}
                      className="text-[11px] font-bold text-[#1d68f5] hover:text-blue-700 shrink-0 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none rounded print:hidden"
                    >
                      Details ↓
                    </a>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* 05. BIGGEST ISSUE + EVIDENCE */}
        <section
          id="biggest-issue-section"
          aria-labelledby="biggest-issue-heading"
          className="bg-white border border-[#e3eaf5] rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-8 shadow-xs scroll-mt-24"
        >
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-rose-700 uppercase bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200/80">
                  <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                  BIGGEST ISSUE + EVIDENCE
                </span>
                {phase6DetailedData.primaryIssueTargetSignal && (
                  <span className="text-[11px] font-semibold text-slate-500">
                    · {phase6DetailedData.primaryIssueTargetSignal.id === overviewStats.weakest?.id
                      ? "Lowest signal:"
                      : "Impacted signal:"}{" "}
                    <strong className="text-slate-800">
                      {phase6DetailedData.primaryIssueTargetSignal.title} ({phase6DetailedData.primaryIssueTargetSignal.score}/100)
                    </strong>
                  </span>
                )}
              </div>
              <h2
                id="biggest-issue-heading"
                className="text-lg sm:text-xl font-extrabold text-[#101828] tracking-tight"
              >
                Biggest issue holding back your first impression
              </h2>
              <p className="text-xs sm:text-sm text-[#526078] mt-0.5">
                The primary comprehension or conversion barrier identified on {data.domain}, paired with the exact homepage evidence behind it.
              </p>
            </div>
          </div>

          {/* Main 2-Column Diagnostic + Evidence Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
            {/* Left Column (7 cols): Primary Issue Diagnosis */}
            <div className="lg:col-span-7 flex flex-col justify-between">
              {phase6DetailedData.primaryRisk ? (
                <div
                  className={`h-full border rounded-2xl p-5 sm:p-6 flex flex-col justify-between transition-all ${
                    phase6DetailedData.primaryRisk.severity === "high"
                      ? "bg-rose-50/50 border-rose-200/90"
                      : phase6DetailedData.primaryRisk.severity === "medium"
                      ? "bg-amber-50/50 border-amber-200/90"
                      : "bg-slate-50/80 border-slate-200/90"
                  }`}
                >
                  <div className="space-y-3.5">
                    {/* Severity & Category Badges */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                            phase6DetailedData.primaryRisk.severity === "high"
                              ? "bg-rose-600 text-white"
                              : phase6DetailedData.primaryRisk.severity === "medium"
                              ? "bg-amber-500 text-white"
                              : "bg-slate-600 text-white"
                          }`}
                        >
                          {phase6DetailedData.primaryRisk.severity} severity issue
                        </span>
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider bg-white px-2.5 py-0.5 rounded-full border border-slate-200/80">
                          {phase6DetailedData.primaryRisk.categoryLabel}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-400">
                        Primary Bottleneck #1
                      </span>
                    </div>

                    {/* Issue Title */}
                    <h3 className="text-base sm:text-lg md:text-[19px] font-extrabold text-[#101828] tracking-tight leading-snug">
                      {phase6DetailedData.primaryRisk.title}
                    </h3>

                    {/* Issue Description */}
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                      {phase6DetailedData.primaryRisk.description}
                    </p>
                  </div>

                  {/* Why It Matters Box */}
                  <div className="mt-5 pt-4 border-t border-slate-200/70">
                    <div className="bg-white/90 border border-slate-200/70 rounded-xl p-3.5 sm:p-4">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1">
                        WHY THIS MATTERS TO FIRST-TIME VISITORS
                      </span>
                      <p className="text-xs sm:text-[13px] text-slate-800 font-medium leading-relaxed">
                        {phase6DetailedData.primaryRisk.why_it_matters}
                      </p>
                    </div>
                  </div>
                </div>
              ) : overviewStats.weakest ? (
                <div className="h-full bg-amber-50/40 border border-amber-200/80 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500 text-white">
                        Primary focus area
                      </span>
                      <span className="text-[11px] font-bold text-slate-700 bg-white px-2.5 py-0.5 rounded-full border border-slate-200/80 tabular-nums">
                        {overviewStats.weakest.title}: {overviewStats.weakest.score}/100 ({overviewStats.weakest.badgeText})
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-extrabold text-[#101828] tracking-tight leading-snug">
                      {overviewStats.weakest.title} is the lowest-scoring signal on {data.domain}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                      {overviewStats.weakest.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-amber-200/60">
                    <div className="bg-white/90 border border-amber-200/60 rounded-xl p-3.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1">
                        DIAGNOSTIC NOTE
                      </span>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        Strengthening {overviewStats.weakest.title.toLowerCase()} provides the highest-leverage opportunity to improve overall visitor comprehension.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full bg-slate-50 border border-slate-200/80 rounded-2xl p-5 flex items-center justify-center text-center text-xs sm:text-sm text-slate-600">
                  No major communication risk identified from the available homepage evidence.
                </div>
              )}
            </div>

            {/* Right Column (5 cols): Focused Evidence for the #1 Issue */}
            <div className="lg:col-span-5 bg-[#f8fafc] border border-[#e3eaf5] rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    EVIDENCE BEHIND THIS ISSUE
                  </span>
                  <span className="text-[11px] font-semibold text-slate-600 bg-white border border-slate-200/80 px-2.5 py-0.5 rounded-md shrink-0">
                    {data.evidence.locationTag}
                  </span>
                </div>

                {/* Extracted Verbatim Quote Relevant to Primary Issue */}
                <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    {visitorUnderstandingAndEvidence.isPrimaryRecQuoteAligned
                      ? "CURRENT WORDING TIED TO THIS ISSUE"
                      : "EXTRACTED HOMEPAGE CONTEXT"}
                  </span>
                  {visitorUnderstandingAndEvidence.primaryRecQuote ||
                  visitorUnderstandingAndEvidence.verifiedExcerptText ? (
                    <p className="text-xs sm:text-[13px] text-slate-800 italic leading-relaxed font-medium break-words">
                      &ldquo;
                      {(visitorUnderstandingAndEvidence.isPrimaryRecQuoteAligned
                        ? visitorUnderstandingAndEvidence.primaryRecQuote
                        : visitorUnderstandingAndEvidence.verifiedExcerptText) ||
                        visitorUnderstandingAndEvidence.primaryRecQuote}
                      &rdquo;
                    </p>
                  ) : (
                    <p className="text-xs text-slate-600 leading-relaxed">
                      No distinct homepage headline text was verified in the initial HTML for {data.domain}.
                    </p>
                  )}
                </div>

                {/* Primary Gap Driving the #1 Issue */}
                <div>
                  <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block mb-2">
                    PRIMARY EVIDENCE GAP
                  </span>
                  {visitorUnderstandingAndEvidence.primaryFocusedMissingFinding ? (
                    <div className="flex items-start gap-2 text-xs text-slate-700 leading-snug bg-white/90 border border-rose-100 rounded-lg px-3.5 py-2.5">
                      <X className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5 stroke-[2.5]" />
                      <span>
                        {visitorUnderstandingAndEvidence.primaryFocusedMissingFinding}
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-600 bg-white/90 border border-slate-200/80 rounded-lg px-3.5 py-2.5">
                      Opportunity to sharpen phrasing clarity and reduce visitor hesitation above the fold.
                    </div>
                  )}
                </div>
              </div>

              {/* Jump Links to Section 12 Complete Homepage Evidence & Section 14 Communication Risks */}
              <div className="mt-5 pt-3.5 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500">
                  {phase6DetailedData.secondaryRisks.length > 0
                    ? `+ ${phase6DetailedData.secondaryRisks.length} more risk${
                        phase6DetailedData.secondaryRisks.length > 1 ? "s" : ""
                      } in Section 14`
                    : "Full clear vs. missing breakdown below"}
                </span>
                <div className="flex items-center gap-3 print:hidden">
                  {phase6DetailedData.secondaryRisks.length > 0 && (
                    <a
                      href="#communication-risks-section"
                      onClick={(e) =>
                        handleJumpLinkClick(e, "14", "Communication Risks")
                      }
                      className="text-xs font-semibold text-slate-600 hover:text-[#1d68f5] inline-flex items-center gap-1 transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none rounded"
                    >
                      <span>All risks</span>
                      <ArrowDown className="w-3 h-3 shrink-0" />
                    </a>
                  )}
                  <a
                    href="#complete-homepage-evidence-section"
                    onClick={(e) =>
                      handleJumpLinkClick(e, "12", "Complete Homepage Evidence")
                    }
                    className="text-xs font-bold text-[#1d68f5] hover:text-blue-700 inline-flex items-center gap-1 transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none rounded"
                  >
                    <span>Full evidence</span>
                    <ArrowDown className="w-3 h-3 shrink-0" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 06. YOUR #1 PRIORITY FIX */}
        <section
          id="priority-fix-section"
          aria-labelledby="priority-fix-heading"
          className="bg-white border border-[#e3eaf5] rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-8 shadow-xs scroll-mt-24 relative overflow-hidden"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
            {/* Left Column (7 cols): Primary Priority Fix Diagnosis */}
            <div className="lg:col-span-7 flex flex-col justify-between">
              <div>
                {/* Top Badges */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-extrabold tracking-widest text-[#246bfd] bg-[#eaf2ff] border border-blue-100 px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 uppercase">
                      <Zap className="w-3 h-3 fill-[#246bfd] text-[#246bfd]" />
                      YOUR #1 PRIORITY FIX
                    </span>
                    <span className="text-[10px] font-bold tracking-wider text-amber-800 bg-amber-100/90 px-2.5 py-1 rounded-full uppercase">
                      IF YOU CHANGE ONLY ONE THING
                    </span>
                  </div>
                  {data.recommendation.impact && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-900 text-white">
                      {data.recommendation.impact} impact
                    </span>
                  )}
                </div>

                {/* Actionable Fix Headline */}
                <h2
                  id="priority-fix-heading"
                  className="text-lg sm:text-xl md:text-[22px] font-extrabold text-[#101828] tracking-tight leading-snug mb-2.5"
                >
                  {data.recommendation.subhead}
                </h2>

                {/* Why this fix works */}
                <p className="text-xs sm:text-sm text-[#526078] leading-relaxed font-normal">
                  {data.recommendation.explanation}
                </p>
              </div>

              {/* Footer Action Bar */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-[11px] text-slate-500">
                  {copyReadyImprovements.length > 0
                    ? "Exact replacement wording is ready to copy in Section 08 below."
                    : priorityFixPlan.length > 0
                    ? "Review your ordered Priority Fix Plan below to sequence your updates."
                    : "Apply this priority change above the fold, then re-check your homepage."}
                </p>
                <div className="flex flex-wrap items-center gap-2 print:hidden">
                  {copyReadyImprovements.length > 0 ? (
                    <a
                      href="#copy-ready-improvements-section"
                      onClick={(e) =>
                        handleJumpLinkClick(e, "08", "Copy-Ready Improvements")
                      }
                      className="w-full sm:w-auto rounded-full bg-[#eaf2ff] hover:bg-blue-100/80 text-[#1d68f5] text-xs font-bold px-4 py-2 transition-all inline-flex items-center justify-center gap-1.5 shrink-0 min-h-[40px] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
                    >
                      <span>See copy-ready wording</span>
                      <ArrowDown className="w-3.5 h-3.5 shrink-0" />
                    </a>
                  ) : priorityFixPlan.length > 0 ? (
                    <a
                      href="#priority-fix-plan-section"
                      onClick={(e) =>
                        handleJumpLinkClick(e, "07", "Priority Fix Plan")
                      }
                      className="w-full sm:w-auto rounded-full bg-[#eaf2ff] hover:bg-blue-100/80 text-[#1d68f5] text-xs font-bold px-4 py-2 transition-all inline-flex items-center justify-center gap-1.5 shrink-0 min-h-[40px] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
                    >
                      <span>View Priority Fix Plan</span>
                      <ArrowDown className="w-3.5 h-3.5 shrink-0" />
                    </a>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Right Column (5 cols): Specific Website-Grounded Action Guidance */}
            <div className="lg:col-span-5 bg-[#f8fbff] border border-blue-200/80 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1d68f5]">
                    SPECIFIC CHANGE FOR {data.domain.toUpperCase()}
                  </span>
                  {priorityFixPlan[0]?.where && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-white border border-slate-200/80 px-2.5 py-0.5 rounded-full">
                      WHERE: <span className="text-[#101828] font-semibold normal-case">{priorityFixPlan[0].where}</span>
                    </span>
                  )}
                </div>

                {/* Current Homepage Wording / Context */}
                {phase6DetailedData.priorityFixCurrentText && (
                  <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      WHAT VISITORS SEE NOW
                    </span>
                    <p className="text-xs text-slate-700 italic leading-relaxed break-words">
                      &ldquo;{phase6DetailedData.priorityFixCurrentText}&rdquo;
                    </p>
                  </div>
                )}

                {/* Recommended Direction */}
                {phase6DetailedData.priorityFixDirectionText && (
                  <div className="bg-white border border-blue-200/90 rounded-xl p-3 shadow-2xs">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1d68f5] block mb-1">
                      RECOMMENDED DIRECTION
                    </span>
                    <p className="text-xs sm:text-[13px] font-semibold text-[#101828] leading-relaxed break-words">
                      {phase6DetailedData.priorityFixDirectionText}
                    </p>
                  </div>
                )}

                {phase6DetailedData.priorityFixTargetSignal && (
                  <div className="bg-white border border-blue-100 rounded-xl p-3 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        PRIMARY SIGNAL TARGETED
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-[#101828]">
                        {phase6DetailedData.priorityFixTargetSignal.title}
                      </span>
                    </div>
                    <span className="text-xs font-extrabold text-amber-800 bg-amber-100/80 border border-amber-200/80 px-2.5 py-1 rounded-lg tabular-nums">
                      {phase6DetailedData.priorityFixTargetSignal.score} / 100
                    </span>
                  </div>
                )}
              </div>

              {phase6DetailedData.deduplicatedImprovements.length > 0 && (
                <div className="mt-4 pt-3.5 border-t border-blue-200/60 flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-600 font-medium">
                    +{phase6DetailedData.deduplicatedImprovements.length} secondary improvement
                    {phase6DetailedData.deduplicatedImprovements.length > 1 ? "s" : ""} identified
                  </span>
                  <a
                    href="#other-improvements-section"
                    onClick={(e) =>
                      handleJumpLinkClick(e, "09", "Other Recommended Improvements")
                    }
                    className="font-bold text-[#1d68f5] hover:text-blue-700 inline-flex items-center gap-1 transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none rounded print:hidden"
                  >
                    <span>Other improvements</span>
                    <ArrowDown className="w-3 h-3 shrink-0" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* PAID REPORT PAYWALL & COMPACT 9-SECTION PREMIUM PREVIEW */}
        <section
          id="paid-report-paywall-section"
          aria-labelledby="paid-report-paywall-heading"
          className="bg-gradient-to-b from-white via-[#f8fbff] to-[#f2f7ff] border-2 border-[#246bfd]/25 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-[0_16px_40px_-15px_rgba(36,107,253,0.14)] scroll-mt-24 print:hidden"
        >
          {/* Mobile-First Conversion Grid: Plan Selection + Email + Checkout CTA appear FIRST on mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
            {/* Primary Conversion Box (Appears 1st on Mobile, Right 5 cols on Desktop) */}
            <div className="lg:col-span-5 lg:order-2 bg-white border border-blue-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full bg-[#eaf2ff] text-[#1d68f5] border border-blue-200/70">
                  <Lock className="w-3 h-3 shrink-0" />
                  <span>UNLOCK FULL REPORT</span>
                </span>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 rounded-full">
                  One-time · No subscription
                </span>
              </div>

              <h2
                id="paid-report-paywall-heading"
                className="text-base sm:text-lg font-extrabold text-[#101828] tracking-tight leading-snug mb-3"
              >
                Get the complete 15-section action plan for {data.domain}
              </h2>

              {/* Compact 2-Plan Selector: $5 Full Report (Primary) & $12 Three-Report Pack */}
              <div
                role="radiogroup"
                aria-label="Select report package"
                className="grid grid-cols-2 gap-2.5 mb-3.5"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedPaywallPlan === "single"}
                  onClick={() => setSelectedPaywallPlan("single")}
                  className={`text-left rounded-xl p-3 border transition-all cursor-pointer relative focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${
                    selectedPaywallPlan === "single"
                      ? "bg-[#f5f8ff] border-2 border-[#1d68f5] shadow-2xs"
                      : "bg-[#f8fafc] border-slate-200/90 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1d68f5]">
                      Full Report
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#1d68f5] text-white">
                      Popular
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 tabular-nums">
                    <span className="text-xl sm:text-2xl font-extrabold text-[#101828]">$5</span>
                    <span className="text-[10px] text-slate-500 font-medium">one-time</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-tight">
                    1 complete website report
                  </p>
                </button>

                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedPaywallPlan === "pack"}
                  onClick={() => setSelectedPaywallPlan("pack")}
                  className={`text-left rounded-xl p-3 border transition-all cursor-pointer relative focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${
                    selectedPaywallPlan === "pack"
                      ? "bg-[#f5f8ff] border-2 border-[#1d68f5] shadow-2xs"
                      : "bg-[#f8fafc] border-slate-200/90 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700">
                      3-Report Pack
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      Save $3
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 tabular-nums">
                    <span className="text-xl sm:text-2xl font-extrabold text-[#101828]">$12</span>
                    <span className="text-[10px] text-slate-500 font-medium">one-time</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-tight">
                    3 full reports ($4 each)
                  </p>
                </button>
              </div>

              {/* Email Input + Primary Checkout CTA (Immediately reachable on mobile) */}
              <form onSubmit={handlePaywallCheckout} className="space-y-2.5" noValidate>
                <div>
                  <label
                    htmlFor="paywall-email-input"
                    className="sr-only"
                  >
                    Email address for report delivery
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                    <input
                      id="paywall-email-input"
                      type="email"
                      value={paywallEmail}
                      onChange={(e) => {
                        setPaywallEmail(e.target.value);
                        if (paywallEmailError) setPaywallEmailError(null);
                      }}
                      placeholder="Enter your email for report access…"
                      aria-label="Email address for report delivery"
                      aria-invalid={Boolean(paywallEmailError)}
                      className={`w-full pl-9 pr-3.5 py-2.5 min-h-[44px] text-xs sm:text-sm bg-[#f8fafc] border rounded-xl text-slate-900 placeholder:text-slate-400 outline-none transition-all ${
                        paywallEmailError
                          ? "border-rose-400 ring-2 ring-rose-100"
                          : "border-slate-200/90 focus:bg-white focus:border-[#1d68f5] focus:ring-2 focus:ring-blue-100"
                      }`}
                    />
                  </div>
                  {paywallEmailError && (
                    <p className="text-[11px] text-rose-600 font-medium mt-1 pl-1" role="alert">
                      {paywallEmailError}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={paywallCheckoutState === "processing"}
                  className="w-full min-h-[46px] rounded-xl bg-[#1d68f5] hover:bg-blue-600 active:scale-[0.99] text-white font-bold text-xs sm:text-sm px-5 py-3 transition-all inline-flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:shadow-blue-500/15 cursor-pointer disabled:opacity-70 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
                >
                  <span>
                    {paywallCheckoutState === "processing"
                      ? "Checking availability…"
                      : selectedPaywallPlan === "single"
                      ? "Unlock Full Report — $5"
                      : "Unlock 3-Report Pack — $12"}
                  </span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>

                {paywallCheckoutState === "coming_soon" && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="rounded-xl bg-amber-50 border border-amber-200/90 p-3 text-left text-xs text-amber-950 space-y-1"
                  >
                    <p className="font-bold text-amber-900">
                      Online checkout is not yet active
                    </p>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Paddle checkout for the{" "}
                      {selectedPaywallPlan === "single"
                        ? "$5 Full Report"
                        : "$12 Three-Report Pack"}{" "}
                      is currently being finalized for launch. No payment was processed and{" "}
                      <strong className="font-semibold">{paywallEmail.trim()}</strong> has not been charged.
                    </p>
                  </div>
                )}

                <p className="text-[11px] text-slate-500 text-center leading-normal">
                  One-time payment · No subscription
                </p>

                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-[10px] sm:text-[11px] text-slate-400">
                  <Link
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-slate-700 underline underline-offset-2 transition-colors"
                  >
                    Terms
                  </Link>
                  <span aria-hidden="true">·</span>
                  <Link
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-slate-700 underline underline-offset-2 transition-colors"
                  >
                    Privacy
                  </Link>
                  <span aria-hidden="true">·</span>
                  <Link
                    href="/refund-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-600 hover:text-[#1d68f5] font-medium underline underline-offset-2 transition-colors"
                  >
                    Refund Policy
                  </Link>
                  <span aria-hidden="true">·</span>
                  <Link
                    href="/contact"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-slate-700 underline underline-offset-2 transition-colors"
                  >
                    Support
                  </Link>
                </div>
              </form>
            </div>

            {/* Compact 9-Section Premium Content Preview (Left 7 cols on Desktop, Appears 2nd on Mobile) */}
            <div
              id="premium-sections-preview"
              className="lg:col-span-7 lg:order-1 flex flex-col justify-between space-y-3.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#1d68f5] block">
                    INCLUDED IN YOUR FULL REPORT
                  </span>
                  <h3 className="text-sm sm:text-base font-extrabold text-[#101828] tracking-tight mt-0.5">
                    9 Premium Diagnostic &amp; Action Sections (Sections 07–15)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCompactPreviewDetails((prev) => !prev)}
                  aria-expanded={showCompactPreviewDetails}
                  className="sm:hidden text-[11px] font-bold text-[#1d68f5] hover:text-blue-700 inline-flex items-center gap-1 py-1 px-2.5 rounded-full bg-white border border-blue-200/80 cursor-pointer"
                >
                  <span>{showCompactPreviewDetails ? "Compact view" : "View all 9 details"}</span>
                </button>
              </div>

              {/* Compact 9-Item Grid: Replaces 9 tall locked cards with a scannable compact preview */}
              <div
                className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2"
                role="list"
                aria-label="Nine premium report sections preview"
              >
                {[
                  {
                    num: "07",
                    title: "Priority Fix Plan",
                    meta: `${priorityFixPlan.length || 1} ordered steps`,
                  },
                  {
                    num: "08",
                    title: "Copy-Ready Improvements",
                    meta:
                      copyReadyImprovements.length > 0
                        ? `${copyReadyImprovements.length} verified ${
                            copyReadyImprovements.length === 1 ? "rewrite" : "rewrites"
                          }`
                        : "Actionable wording",
                  },
                  {
                    num: "09",
                    title: "Other Recommended Improvements",
                    meta: `${phase6DetailedData.deduplicatedImprovements.length} secondary fixes`,
                  },
                  {
                    num: "10",
                    title: "First Few Seconds Comprehension",
                    meta: `${overviewStats.clearQuestionsCount}/5 clear immediately`,
                  },
                  {
                    num: "11",
                    title: "First-Time Visitor Impression",
                    meta: "Stranger reaction",
                  },
                  {
                    num: "12",
                    title: "Complete Homepage Evidence",
                    meta: `${data.evidence.clearFindings.length + data.evidence.missingFindings.length} findings`,
                  },
                  {
                    num: "13",
                    title: "Five Detailed Signal Breakdown",
                    meta: "5 signal breakdowns",
                  },
                  {
                    num: "14",
                    title: "Communication Risks",
                    meta: `${phase6DetailedData.totalRisksCount} ${
                      phase6DetailedData.totalRisksCount === 1 ? "risk" : "risks"
                    } flagged`,
                  },
                  {
                    num: "15",
                    title: "Recheck & Compare",
                    meta: "Before → After delta",
                  },
                ].map((sec, idx) => (
                  <button
                    key={sec.num}
                    type="button"
                    role="listitem"
                    onClick={() => handleLockedSectionClick(sec.num, sec.title)}
                    aria-label={`Locked section ${sec.num}: ${sec.title}. Click to focus unlock options.`}
                    className={`w-full text-left group rounded-xl bg-white/95 hover:bg-white border border-slate-200/80 hover:border-blue-300 px-3 py-2.5 flex items-center justify-between gap-2 transition-all shadow-2xs cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${
                      !showCompactPreviewDetails && idx >= 4 ? "hidden sm:flex" : "flex"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-[#eaf2ff] text-[#1d68f5] text-[10px] font-black inline-flex items-center justify-center shrink-0 tabular-nums">
                        {sec.num}
                      </span>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-[#101828] group-hover:text-[#1d68f5] transition-colors block truncate">
                          {sec.title}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium block truncate">
                          {sec.meta}
                        </span>
                      </div>
                    </div>
                    <Lock className="w-3 h-3 text-slate-400 group-hover:text-[#1d68f5] shrink-0" aria-hidden="true" />
                  </button>
                ))}
              </div>

              {!showCompactPreviewDetails && (
                <button
                  type="button"
                  onClick={() => setShowCompactPreviewDetails(true)}
                  className="sm:hidden w-full py-2 px-3 rounded-xl bg-white/80 border border-slate-200/80 text-xs font-semibold text-slate-700 hover:text-[#1d68f5] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>+5 more premium sections included (11–15)</span>
                  <ArrowDown className="w-3 h-3 shrink-0" />
                </button>
              )}

              {/* Concise Value Summary Strip */}
              <div className="pt-1 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-600">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5] shrink-0" />
                  <span>Ordered 1-2-3 fix sequence</span>
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5] shrink-0" />
                  <span>Copy-ready homepage rewrites</span>
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5] shrink-0" />
                  <span>Full 5-signal evidence &amp; recheck tracking</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* LEVEL 2 — ACTIONABLE IMPROVEMENTS */}
        <div
          id="level-2-actionable-improvements"
          className="pt-3 sm:pt-5 pb-0.5"
          aria-label="Level 2: Actionable Improvements"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-blue-50 border border-blue-200/80 text-[10px] font-extrabold tracking-widest uppercase text-[#1d68f5] shrink-0">
                Level 2
              </span>
              <span className="text-xs sm:text-[13px] font-bold tracking-tight text-slate-800 uppercase">
                Actionable Improvements
              </span>
              <span className="hidden sm:inline text-xs text-slate-400 truncate">
                — Priority fix plan, copy-ready wording &amp; other recommended improvements
              </span>
            </div>
            <div className="h-px flex-1 bg-slate-200/80 hidden md:block" aria-hidden="true" />
          </div>
        </div>

        {/* 07. PRIORITY FIX PLAN */}
        {priorityFixPlan.length > 0 && (
          <section
            id="priority-fix-plan-section"
            aria-labelledby="priority-fix-plan-heading"
            className="bg-white border border-[#e3eaf5] rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-8 shadow-xs scroll-mt-24"
          >
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-5 mb-5 sm:mb-6 border-b border-slate-100">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-[10px] font-extrabold tracking-widest uppercase px-2.5 py-1 rounded-full bg-[#eaf2ff] text-[#246bfd] border border-blue-100">
                    YOUR PRIORITY FIX PLAN
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {priorityFixPlan.length === 1
                      ? "1 priority action"
                      : `${priorityFixPlan.length} ordered steps`}
                  </span>
                </div>
                <h2
                  id="priority-fix-plan-heading"
                  className="text-lg sm:text-xl md:text-2xl font-extrabold text-[#101828] tracking-tight"
                >
                  What to fix first, second, and third
                </h2>
                <p className="text-xs sm:text-sm text-[#526078] mt-1 font-normal">
                  Start in this order to improve clarity with the least wasted effort.
                </p>
              </div>
            </div>

            {/* Ordered Action Steps */}
            <ol className="space-y-3.5 sm:space-y-4" aria-label="Ordered priority fix steps">
              {priorityFixPlan.map((step, index) => {
                const isFirstStep = index === 0;
                return (
                  <li
                    key={step.id}
                    className={`rounded-2xl border p-4 sm:p-5 transition-colors ${
                      isFirstStep
                        ? "bg-[#f8fbff] border-blue-200/90 shadow-2xs"
                        : "bg-[#f8fafc] border-slate-200/80"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3.5 sm:gap-4">
                      {/* Priority Step Badge: 01, 02, 03 */}
                      <div className="flex items-center gap-2.5 sm:block shrink-0">
                        <span
                          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl inline-flex items-center justify-center text-xs sm:text-sm font-black tracking-tight tabular-nums select-none ${
                            isFirstStep
                              ? "bg-[#1d68f5] text-white shadow-2xs"
                              : "bg-white text-slate-700 border border-slate-200/90"
                          }`}
                        >
                          {step.stepNumber}
                        </span>
                        <span
                          className={`sm:hidden text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isFirstStep
                              ? "bg-blue-100/80 text-[#1d68f5]"
                              : "bg-slate-200/70 text-slate-600"
                          }`}
                        >
                          {isFirstStep
                            ? "Fix First"
                            : index === 1
                            ? "Fix Second"
                            : "Fix Third"}
                        </span>
                      </div>

                      {/* Step Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`hidden sm:inline-flex text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                isFirstStep
                                  ? "bg-blue-100/80 text-[#1d68f5]"
                                  : "bg-slate-200/70 text-slate-600"
                              }`}
                            >
                              {isFirstStep
                                ? "Priority 01 · Fix First"
                                : index === 1
                                ? "Priority 02 · Fix Second"
                                : "Priority 03 · Fix Third"}
                            </span>
                            {step.where && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-white border border-slate-200/80 px-2.5 py-0.5 rounded-full">
                                WHERE: <span className="text-[#101828] font-semibold normal-case">{step.where}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Title */}
                        <h3 className="text-sm sm:text-base font-extrabold text-[#101828] leading-snug tracking-tight mt-1">
                          {step.title}
                        </h3>

                        {/* Why this step matters */}
                        {step.why && (
                          <p className="text-xs sm:text-[13px] text-[#526078] leading-relaxed mt-1.5 font-normal">
                            <strong className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700 mr-1.5">
                              WHY:
                            </strong>
                            {step.why}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {/* 08. COPY-READY IMPROVEMENTS */}
        <section
          id="copy-ready-improvements-section"
          aria-labelledby="copy-ready-improvements-heading"
          className="bg-white border border-[#e3eaf5] rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-8 shadow-xs scroll-mt-24"
        >
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-5 mb-5 sm:mb-6 border-b border-slate-100">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-[10px] font-extrabold tracking-widest uppercase px-2.5 py-1 rounded-full bg-[#eaf2ff] text-[#246bfd] border border-blue-100">
                  COPY-READY IMPROVEMENTS
                </span>
                {copyReadyImprovements.length > 0 && (
                  <span className="text-[11px] font-semibold text-slate-500">
                    {copyReadyImprovements.length === 1
                      ? "1 verified wording suggestion"
                      : `${copyReadyImprovements.length} verified wording suggestions`}
                  </span>
                )}
              </div>
              <h2
                id="copy-ready-improvements-heading"
                className="text-lg sm:text-xl md:text-2xl font-extrabold text-[#101828] tracking-tight"
              >
                Copy-Ready Improvements
              </h2>
              <p className="text-xs sm:text-sm text-[#526078] mt-1 font-normal">
                Practical wording improvements based on your homepage and its identified issues.
              </p>
            </div>
          </div>

          {copyReadyImprovements.length > 0 ? (
            <div className="space-y-4 sm:space-y-5">
              {copyReadyImprovements.map((item, idx) => {
                const isPrimary = idx === 0;
                const isCopied = copiedState === item.id;

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border p-4 sm:p-6 transition-colors ${
                      isPrimary
                        ? "bg-[#f8fbff]/90 border-blue-200/90 shadow-2xs"
                        : "bg-[#f8fafc] border-slate-200/80"
                    }`}
                  >
                    {/* Top Row: Category Eyebrow (e.g., 01 / HERO HEADLINE) & Priority Plan Alignment */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[11px] font-black tracking-wider uppercase px-2.5 py-1 rounded-lg tabular-nums ${
                            isPrimary
                              ? "bg-[#1d68f5] text-white"
                              : "bg-slate-200/80 text-slate-800"
                          }`}
                        >
                          {item.indexLabel} / {item.category}
                        </span>
                        {item.relatedPlanStep && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#1d68f5] bg-blue-50 border border-blue-200/70 px-2.5 py-0.5 rounded-full">
                            Supports Priority {item.relatedPlanStep}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-medium text-slate-500">
                        {item.intendedLocation}
                      </span>
                    </div>

                    {/* Comparison Area: Current Copy (if verified) -> Suggested Replacement */}
                    {item.currentCopy ? (
                      <div className="grid grid-cols-1 lg:grid-cols-11 gap-3 sm:gap-4 items-stretch mb-4">
                        {/* CURRENT COPY (Verified source text) */}
                        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-xl p-4 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                                CURRENT COPY
                              </span>
                              <span className="text-[10px] font-semibold text-slate-400">
                                Verified homepage text
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-700 italic leading-relaxed break-words">
                              &ldquo;{item.currentCopy}&rdquo;
                            </p>
                          </div>
                        </div>

                        {/* Directional Connector (Down arrow on mobile, Right arrow on desktop) */}
                        <div
                          className="lg:col-span-1 flex items-center justify-center py-0.5 lg:py-0 text-slate-400"
                          aria-hidden="true"
                        >
                          <div className="w-7 h-7 rounded-full bg-white border border-slate-200/90 flex items-center justify-center shadow-2xs">
                            <ArrowDown className="w-3.5 h-3.5 text-[#1d68f5] lg:hidden" />
                            <ArrowRight className="w-3.5 h-3.5 text-[#1d68f5] hidden lg:block" />
                          </div>
                        </div>

                        {/* SUGGESTED REPLACEMENT */}
                        <div className="lg:col-span-5 bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex flex-col justify-between shadow-2xs">
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-900">
                                <span className="w-4 h-4 rounded-full bg-emerald-200/80 text-emerald-800 inline-flex items-center justify-center shrink-0">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                </span>
                                SUGGESTED REPLACEMENT
                              </span>
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                                Copy-ready
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm md:text-[15px] text-[#101828] font-semibold leading-relaxed break-words">
                              &ldquo;{item.suggestedReplacement}&rdquo;
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* When exact original copy for this specific element is unavailable, omit Current Copy quote honestly */
                      <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 sm:p-5 mb-4 shadow-2xs">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-900">
                            <span className="w-4 h-4 rounded-full bg-emerald-200/80 text-emerald-800 inline-flex items-center justify-center shrink-0">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                            SUGGESTED REPLACEMENT
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full">
                            Intended location: {item.intendedLocation}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm md:text-[15px] text-[#101828] font-semibold leading-relaxed break-words">
                          &ldquo;{item.suggestedReplacement}&rdquo;
                        </p>
                      </div>
                    )}

                    {/* Bottom Row: WHY THIS MAY HELP + [Copy suggestion] Button */}
                    <div className="pt-3.5 border-t border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-0.5">
                          WHY THIS MAY HELP
                        </span>
                        <p className="text-xs sm:text-[13px] text-[#526078] leading-relaxed font-normal">
                          {item.whyThisMayHelp}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(
                            item.suggestedReplacement,
                            item.id,
                            `Copied ${item.category.toLowerCase()} suggestion to clipboard!`
                          )
                        }
                        disabled={isCopied}
                        aria-label={`Copy suggested ${item.category.toLowerCase()} replacement`}
                        className={`w-full sm:w-auto rounded-full text-xs sm:text-sm font-semibold px-5 py-2.5 transition-all inline-flex items-center justify-center gap-2 shadow-xs cursor-pointer min-h-[44px] min-w-[168px] shrink-0 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none print:hidden ${
                          isCopied
                            ? "bg-emerald-600 text-white cursor-default"
                            : isPrimary
                            ? "bg-[#1d68f5] hover:bg-blue-600 active:scale-[0.98] text-white"
                            : "bg-white hover:bg-slate-100 text-slate-800 border border-slate-300"
                        }`}
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-4 h-4 shrink-0" />
                            <span>Copied suggestion ✓</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 shrink-0" />
                            <span>Copy suggestion</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Honest Empty State when no trustworthy copy replacements can be grounded */
            <div className="bg-[#f8fafc] border border-slate-200/80 rounded-2xl p-5 sm:p-6 text-center">
              <p className="text-xs sm:text-sm font-semibold text-[#101828] mb-1">
                No direct wording replacements generated for this scan
              </p>
              <p className="text-xs text-[#526078] max-w-xl mx-auto leading-relaxed">
                The primary improvements identified for {data.domain} focus on structural clarity or visual proof rather than direct text rewrites, or exact source copy could not be verified for a side-by-side comparison.
              </p>
            </div>
          )}
        </section>

        {/* 09. OTHER RECOMMENDED IMPROVEMENTS */}
        <section
          id="other-improvements-section"
          aria-labelledby="other-improvements-heading"
          className="bg-white border border-[#e3eaf5] rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-8 shadow-xs scroll-mt-24"
        >
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-5 mb-5 sm:mb-6 border-b border-slate-100">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-[10px] font-extrabold tracking-widest uppercase px-2.5 py-1 rounded-full bg-[#eaf2ff] text-[#246bfd] border border-blue-100">
                  OTHER RECOMMENDED IMPROVEMENTS
                </span>
                {phase6DetailedData.deduplicatedImprovements.length > 0 && (
                  <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full tabular-nums">
                    {phase6DetailedData.deduplicatedImprovements.length}{" "}
                    {phase6DetailedData.deduplicatedImprovements.length === 1
                      ? "recommendation"
                      : "recommendations"}
                  </span>
                )}
              </div>
              <h2
                id="other-improvements-heading"
                className="text-lg sm:text-xl md:text-2xl font-extrabold text-[#101828] tracking-tight"
              >
                Other improvements worth making
              </h2>
              <p className="text-xs sm:text-sm text-[#526078] mt-1 font-normal">
                Additional high-leverage improvements to strengthen clarity, proof, and conversion after you address your #1 priority fix.
              </p>
            </div>
          </div>

          {phase6DetailedData.deduplicatedImprovements.length > 0 ? (
            <div className="space-y-3.5" role="list" aria-label="Other recommended improvements">
              {phase6DetailedData.deduplicatedImprovements.map((item) => {
                const isExpanded = expandedImprovementId === item.id;
                return (
                  <div
                    key={item.id}
                    role="listitem"
                    className="border border-slate-200/90 rounded-2xl overflow-hidden hover:border-slate-300 transition-all bg-[#f8fafc]"
                  >
                    <button
                      type="button"
                      onClick={() => toggleImprovementRow(item.id)}
                      aria-expanded={isExpanded}
                      aria-controls={`improvement-body-${item.id}`}
                      className="w-full text-left flex items-center justify-between gap-3.5 p-4 sm:p-5 cursor-pointer group min-h-[56px] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${item.color}`}
                        >
                          {item.icon === "shield" && <Shield className="w-4 h-4" />}
                          {item.icon === "users" && <Users className="w-4 h-4" />}
                          {item.icon === "zap" && <Zap className="w-4 h-4" />}
                          {item.icon === "sparkles" && <Sparkles className="w-4 h-4" />}
                          {item.icon === "eye" && <Eye className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm sm:text-base font-extrabold text-[#101828] group-hover:text-[#246bfd] transition-colors leading-snug">
                              {item.title}
                            </h3>
                            {item.relatedPlanStep && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#1d68f5] bg-blue-50 border border-blue-200/70 px-2 py-0.5 rounded-full">
                                Priority {item.relatedPlanStep}
                              </span>
                            )}
                          </div>
                          <p className="text-xs sm:text-[13px] text-[#526078] leading-relaxed mt-1 font-normal">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="hidden sm:inline text-[11px] font-semibold text-slate-400 group-hover:text-slate-600">
                          {isExpanded ? "Hide details" : "View details"}
                        </span>
                        <ChevronRight
                          className={`w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 shrink-0 ${
                            isExpanded ? "rotate-90 text-slate-700" : ""
                          }`}
                        />
                      </div>
                    </button>

                    {/* Smooth Inline Expandable Body */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          id={`improvement-body-${item.id}`}
                          initial={prefersReducedMotion ? { opacity: 1 } : { height: 0, opacity: 0 }}
                          animate={prefersReducedMotion ? { opacity: 1 } : { height: "auto", opacity: 1 }}
                          exit={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                          transition={{ duration: 0.22, ease: "easeInOut" }}
                          className="overflow-hidden bg-white border-t border-slate-200/70 p-4 sm:p-5"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-[13px]">
                            <div className="bg-[#f8fafc] border border-slate-200/80 rounded-xl p-3.5 sm:p-4">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1">
                                WHY THIS MATTERS
                              </span>
                              <p className="text-slate-700 leading-relaxed font-normal">
                                {item.whyItMatters}
                              </p>
                            </div>

                            <div className="bg-[#f8fbff] border border-blue-200/70 rounded-xl p-3.5 sm:p-4">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1d68f5] block mb-1">
                                WHAT TO IMPROVE
                              </span>
                              <p className="text-slate-800 leading-relaxed font-medium">
                                {item.whatToImprove}
                              </p>
                            </div>
                          </div>

                          {item.hasCopyReadyCard && (
                            <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs print:hidden">
                              <span className="text-slate-500">
                                Verified copy-ready wording for this improvement is available above.
                              </span>
                              <a
                                href="#copy-ready-improvements-section"
                                className="font-bold text-[#1d68f5] hover:text-blue-700 inline-flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none rounded"
                              >
                                <span>See copy-ready wording ↑</span>
                              </a>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-[#f8fafc] border border-slate-200/80 rounded-2xl p-5 sm:p-6 text-center">
              <p className="text-xs sm:text-sm font-semibold text-[#101828] mb-1">
                No additional secondary improvements needed
              </p>
              <p className="text-xs text-[#526078] max-w-xl mx-auto leading-relaxed">
                Focus on applying your #1 Priority Fix in Section 06 and re-checking {data.domain} to measure the impact on visitor comprehension.
              </p>
            </div>
          )}
        </section>

        {/* LEVEL 3 — DEEP ANALYSIS */}
        <div
          id="level-3-deep-analysis"
          className="pt-3 sm:pt-5 pb-0.5"
          aria-label="Level 3: Deep Analysis"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200/90 text-[10px] font-extrabold tracking-widest uppercase text-slate-700 shrink-0">
                Level 3
              </span>
              <span className="text-xs sm:text-[13px] font-bold tracking-tight text-slate-800 uppercase">
                Deep Analysis
              </span>
              <span className="hidden sm:inline text-xs text-slate-400 truncate">
                — First few seconds, visitor impression, homepage evidence, detailed signals &amp; risks
              </span>
            </div>
            <div className="h-px flex-1 bg-slate-200/80 hidden md:block" aria-hidden="true" />
          </div>
        </div>

        {/* 10. IN THE FIRST FEW SECONDS */}
        <section
          id="first-seconds-section"
          aria-labelledby="first-seconds-heading"
          className="bg-white border border-[#e3eaf5] rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-8 shadow-xs scroll-mt-24"
        >
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-5 mb-5 sm:mb-6 border-b border-slate-100">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-[10px] font-extrabold tracking-widest uppercase px-2.5 py-1 rounded-full bg-[#eaf2ff] text-[#246bfd] border border-blue-100">
                  IN THE FIRST FEW SECONDS
                </span>
                <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full tabular-nums">
                  {overviewStats.clearQuestionsCount} of 5 clear immediately
                </span>
              </div>
              <h2
                id="first-seconds-heading"
                className="text-lg sm:text-xl md:text-2xl font-extrabold text-[#101828] tracking-tight"
              >
                What a visitor understands immediately
              </h2>
              <p className="text-xs sm:text-sm text-[#526078] mt-1 font-normal">
                How quickly a first-time visitor can answer the core questions on your homepage.
              </p>
            </div>
            <span className="text-[11px] font-medium text-slate-400 self-start sm:self-end shrink-0">
              Based on accessible homepage content
            </span>
          </div>

          {/* 5 Core Comprehension Questions in Canonical Order */}
          <div className="space-y-3" role="list" aria-label="Five-second visitor comprehension questions">
            {visitorUnderstandingAndEvidence.firstSecondsRows.map((row) => {
              const rowBorderTone =
                row.type === "clear"
                  ? "border-slate-200/80 hover:border-emerald-200"
                  : row.type === "partly"
                  ? "border-amber-200/70 hover:border-amber-300"
                  : "border-rose-200/70 hover:border-rose-300";

              return (
                <div
                  key={row.numberLabel}
                  role="listitem"
                  className={`rounded-2xl bg-[#f8fafc] border ${rowBorderTone} p-4 sm:px-5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors`}
                >
                  {/* Left: Question Number + Question Text + Supporting Grounded Context */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <span className="w-7 h-7 rounded-lg bg-white border border-slate-200/90 text-[11px] font-extrabold text-slate-500 inline-flex items-center justify-center shrink-0 tabular-nums mt-0.5 shadow-2xs">
                      {row.numberLabel}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm sm:text-[15px] font-extrabold text-[#101828] leading-snug">
                          {row.question}
                        </h3>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-white border border-slate-200/80 px-2 py-0.5 rounded-md">
                          {row.dimensionLabel}
                        </span>
                      </div>
                      {(row.quickSignalNote || row.verifiedSnippet) && (
                        <p className="text-xs text-[#526078] mt-1 leading-relaxed break-words">
                          {row.quickSignalNote && <span>{row.quickSignalNote}</span>}
                          {row.quickSignalNote && row.verifiedSnippet && (
                            <span className="text-slate-300 mx-1.5">·</span>
                          )}
                          {row.verifiedSnippet && (
                            <span className="text-slate-700 font-medium italic">
                              &ldquo;{row.verifiedSnippet}&rdquo;
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Status Badge */}
                  <div className="flex items-center self-start sm:self-center pl-10 sm:pl-0 shrink-0">
                    {row.type === "clear" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#dcfce7] text-[#15803d] border border-emerald-200/80">
                        <Check className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
                        <span>{row.label}</span>
                      </span>
                    ) : row.type === "partly" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#fef3c7] text-[#b45309] border border-amber-200/80">
                        <MinusCircle className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
                        <span>{row.label}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#fee2e2] text-[#b91c1c] border border-rose-200/80">
                        <X className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
                        <span>{row.label}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 11. FIRST-TIME VISITOR IMPRESSION */}
        <section
          id="visitor-impression-section"
          aria-labelledby="visitor-impression-heading"
          className="bg-white border border-[#e3eaf5] rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-8 shadow-xs scroll-mt-24"
        >
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-5 mb-5 border-b border-slate-100">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold tracking-widest uppercase px-2.5 py-1 rounded-full bg-[#eaf2ff] text-[#246bfd] border border-blue-100">
                  <Users className="w-3 h-3 text-[#246bfd] shrink-0" />
                  FIRST-TIME VISITOR IMPRESSION
                </span>
                <span className="text-[11px] font-medium text-slate-400">
                  · AI-simulated first-time visitor reaction
                </span>
              </div>
              <h2
                id="visitor-impression-heading"
                className="text-lg sm:text-xl md:text-2xl font-extrabold text-[#101828] tracking-tight"
              >
                A first-time visitor would probably think
              </h2>
            </div>
          </div>

          {/* Analytical Quote / Monologue Card */}
          {visitorUnderstandingAndEvidence.cleanVisitorThought ? (
            <div className="bg-[#f5f8ff] border border-[#dce6f7] rounded-2xl p-5 sm:p-6 md:p-7 relative">
              <blockquote className="text-sm sm:text-base md:text-[17px] font-medium text-[#101828] leading-relaxed italic break-words">
                &ldquo;{visitorUnderstandingAndEvidence.cleanVisitorThought}&rdquo;
              </blockquote>
              <div className="mt-4 pt-3.5 border-t border-blue-200/60 flex flex-wrap items-center justify-between gap-2 text-xs text-[#526078]">
                <span>
                  Grounded in {data.domain}&apos;s accessible homepage content and {data.score}/100 clarity score
                </span>
                <span className="font-semibold text-slate-700 tabular-nums">
                  {overviewStats.clearQuestionsCount} of 5 core questions answered immediately
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-[#f8fafc] border border-slate-200/80 rounded-2xl p-5 sm:p-6 text-center">
              <p className="text-xs sm:text-sm font-semibold text-[#101828] mb-1">
                Visitor impression summary unavailable for this scan
              </p>
              <p className="text-xs text-[#526078] max-w-xl mx-auto leading-relaxed">
                Refer to the five-second question breakdown above and the extracted homepage evidence below to inspect what a first-time visitor sees on {data.domain}.
              </p>
            </div>
          )}
        </section>

        {/* 12. COMPLETE HOMEPAGE EVIDENCE */}
        <section
          id="complete-homepage-evidence-section"
          aria-labelledby="homepage-evidence-heading"
          className="bg-white border border-[#e3eaf5] rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-8 shadow-xs scroll-mt-24"
        >
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-5 mb-5 sm:mb-6 border-b border-slate-100">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-[10px] font-extrabold tracking-widest uppercase px-2.5 py-1 rounded-full bg-[#eaf2ff] text-[#246bfd] border border-blue-100">
                  HOMEPAGE EVIDENCE
                </span>
                <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md">
                  {data.evidence.locationTag}
                </span>
              </div>
              <h2
                id="homepage-evidence-heading"
                className="text-lg sm:text-xl md:text-2xl font-extrabold text-[#101828] tracking-tight"
              >
                What on your website led to this result
              </h2>
              <p className="text-xs sm:text-sm text-[#526078] mt-1 font-normal">
                Direct evidence extracted from your homepage during this analysis.
              </p>
            </div>
          </div>

          {/* 2-Column Evidence Grid: Extracted Homepage Excerpt (Left) + Clear vs Missing Findings (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
            {/* Left Column (5 cols): Extracted Homepage Headline / Hero Excerpt & Supporting Elements */}
            <div className="lg:col-span-5 bg-[#f8fafc] border border-slate-200/80 rounded-2xl p-5 sm:p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    EXTRACTED HOMEPAGE HEADLINE / HERO EXCERPT
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500 bg-white border border-slate-200/80 px-2 py-0.5 rounded">
                    {data.evidence.locationTag}
                  </span>
                </div>

                {visitorUnderstandingAndEvidence.hasVerifiedExcerpt ? (
                  <div className="space-y-3">
                    {/* Primary Extracted Headline */}
                    <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                        {visitorUnderstandingAndEvidence.verifiedSubheadline
                          ? "PRIMARY HERO HEADLINE"
                          : "VERBATIM HERO EXCERPT"}
                      </span>
                      <p className="text-xs sm:text-sm text-[#101828] font-semibold italic leading-relaxed break-words">
                        &ldquo;
                        {visitorUnderstandingAndEvidence.verifiedHeadline ||
                          visitorUnderstandingAndEvidence.verifiedExcerptText}
                        &rdquo;
                      </p>
                    </div>

                    {/* Supporting Hero Subheadline (only when explicitly present in extracted excerpt) */}
                    {visitorUnderstandingAndEvidence.verifiedSubheadline && (
                      <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          SUPPORTING HERO SUBHEADLINE
                        </span>
                        <p className="text-xs sm:text-[13px] text-slate-700 italic leading-relaxed break-words">
                          &ldquo;{visitorUnderstandingAndEvidence.verifiedSubheadline}&rdquo;
                        </p>
                      </div>
                    )}

                    {/* Primary CTA Text (only when explicitly extracted in verified findings) */}
                    {visitorUnderstandingAndEvidence.verifiedPrimaryCta && (
                      <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs flex items-center justify-between gap-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          EXTRACTED PRIMARY CTA
                        </span>
                        <span className="text-xs font-bold text-[#101828] bg-slate-100 border border-slate-200/80 px-3 py-1 rounded-lg">
                          &ldquo;{visitorUnderstandingAndEvidence.verifiedPrimaryCta}&rdquo;
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Honest Fallback when no headline text was extracted */
                  <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs">
                    <p className="text-xs sm:text-[13px] text-slate-700 font-medium leading-relaxed">
                      No distinct hero headline quote could be extracted from the initial HTML on {data.domain}.
                    </p>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      The evaluation reflects the accessible homepage structure and extracted elements returned during fetching.
                    </p>
                  </div>
                )}
              </div>

              {/* Honest Partial-Access Note if applicable */}
              {data.isPartialAccess ? (
                <div className="bg-amber-50/90 border border-amber-200/80 rounded-xl p-3.5 text-xs text-amber-950 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong className="font-semibold">Partial HTML visibility note:</strong>{" "}
                    Limited initial text was detected on {data.domain}. Some dynamic client-side content may not have been visible in the initial HTML response.
                  </p>
                </div>
              ) : (
                <div className="pt-3 border-t border-slate-200/70 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Source: Live public homepage HTML</span>
                  <span>Zero fabricated quotes</span>
                </div>
              )}
            </div>

            {/* Right Column (7 cols): What Is Clear vs What Is Missing or Unclear */}
            <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              {/* Sub-panel 1: What Is Clear */}
              <div className="bg-emerald-50/35 border border-emerald-200/80 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3.5 pb-2.5 border-b border-emerald-200/60">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-900 uppercase tracking-wider">
                      <span className="w-4 h-4 rounded-full bg-emerald-200/80 text-emerald-800 inline-flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                      WHAT IS CLEAR
                    </span>
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full tabular-nums">
                      {visitorUnderstandingAndEvidence.verifiedClearFindings.length}
                    </span>
                  </div>

                  {visitorUnderstandingAndEvidence.verifiedClearFindings.length > 0 ? (
                    <ul className="space-y-2.5" aria-label="Verified clear homepage findings">
                      {visitorUnderstandingAndEvidence.verifiedClearFindings.map((item, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2.5 text-xs sm:text-[13px] text-slate-800 leading-relaxed bg-white/90 border border-emerald-100 rounded-xl p-3 shadow-2xs"
                        >
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 stroke-[2.5]" />
                          <span className="break-words">{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="bg-white/80 border border-emerald-100 rounded-xl p-4 text-xs text-slate-600 leading-relaxed">
                      No clear homepage comprehension signals were verified from the extracted homepage text.
                    </div>
                  )}
                </div>
              </div>

              {/* Sub-panel 2: What Is Missing or Unclear */}
              <div className="bg-rose-50/35 border border-rose-200/80 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3.5 pb-2.5 border-b border-rose-200/60">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-rose-900 uppercase tracking-wider">
                      <span className="w-4 h-4 rounded-full bg-rose-200/80 text-rose-800 inline-flex items-center justify-center shrink-0">
                        <X className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                      WHAT IS MISSING OR UNCLEAR
                    </span>
                    <span className="text-[11px] font-bold text-rose-800 bg-rose-100/80 px-2 py-0.5 rounded-full tabular-nums">
                      {visitorUnderstandingAndEvidence.verifiedMissingFindings.length}
                    </span>
                  </div>

                  {visitorUnderstandingAndEvidence.verifiedMissingFindings.length > 0 ? (
                    <ul className="space-y-2.5" aria-label="Missing or unclear homepage elements">
                      {visitorUnderstandingAndEvidence.verifiedMissingFindings.map((item, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2.5 text-xs sm:text-[13px] text-slate-800 leading-relaxed bg-white/90 border border-rose-100 rounded-xl p-3 shadow-2xs"
                        >
                          <X className="w-4 h-4 text-rose-600 shrink-0 mt-0.5 stroke-[2.5]" />
                          <span className="break-words">{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="bg-white/80 border border-rose-100 rounded-xl p-4 text-xs text-slate-600 leading-relaxed">
                      No major missing or unclear homepage elements were identified during this check.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* OPTIONAL SUPPORTING PAGES INSIGHTS (Rendered ONLY when validated supporting-page context is available) */}
        {supportingPagesInsights && (
          <section
            id="supporting-pages-insights-section"
            aria-labelledby="supporting-pages-insights-heading"
            className="bg-white border border-[#e3eaf5] rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-8 shadow-xs scroll-mt-24 space-y-6"
          >
            {/* Section Header & Score Isolation Notice */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b border-slate-100">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-[10px] font-extrabold tracking-widest uppercase px-2.5 py-1 rounded-full bg-[#eaf2ff] text-[#246bfd] border border-blue-100">
                    SUPPORTING PAGES INSIGHTS
                  </span>
                  <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full tabular-nums">
                    {supportingPagesInsights.pagesReviewed.length}{" "}
                    {supportingPagesInsights.pagesReviewed.length === 1
                      ? "page reviewed"
                      : "pages reviewed"}
                  </span>
                </div>
                <h2
                  id="supporting-pages-insights-heading"
                  className="text-lg sm:text-xl md:text-2xl font-extrabold text-[#101828] tracking-tight"
                >
                  Supporting Pages Insights
                </h2>
                <p className="text-xs sm:text-sm text-[#526078] mt-1 font-normal">
                  Additional context from relevant pages linked to your homepage.
                </p>
              </div>

              {/* Required Homepage Score Isolation Clarification */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-600 leading-relaxed lg:max-w-md shrink-0">
                Supporting-page findings provide additional context and do not affect your homepage first-impression score.
              </div>
            </div>

            {/* A. PAGES REVIEWED */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  PAGES REVIEWED
                </h3>
                <span className="text-[11px] text-slate-400 font-medium">
                  Same-domain pages fetched &amp; verified
                </span>
              </div>

              <div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                role="list"
                aria-label="Analyzed supporting pages"
              >
                {supportingPagesInsights.pagesReviewed.map((page) => (
                  <div
                    key={page.urlKey}
                    role="listitem"
                    className="bg-[#f8fafc] border border-slate-200/80 rounded-xl p-3.5 flex flex-col justify-between gap-1.5 min-w-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-[#101828] tracking-tight">
                        {page.categoryLabel}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 bg-white border border-slate-200/80 px-2 py-0.5 rounded shrink-0">
                        {page.pathname}
                      </span>
                    </div>
                    <a
                      href={page.safeHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open analyzed ${page.categoryLabel} page (${page.displayUrl}) in a new tab`}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#246bfd] hover:text-blue-700 hover:underline break-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#246bfd] rounded"
                    >
                      <span className="break-all">{page.displayUrl}</span>
                      <ExternalLink
                        className="w-3 h-3 shrink-0"
                        aria-hidden="true"
                      />
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* B, C, D. INSIGHT AREAS GRID (Message Consistency, Additional Trust Context, Next-Step Context) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 items-stretch">
              {/* B. MESSAGE CONSISTENCY */}
              {supportingPagesInsights.messageConsistency && (
                <div className="bg-[#f8fafc] border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4 min-w-0">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200/70">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#101828]">
                        MESSAGE CONSISTENCY
                      </h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          supportingPagesInsights.messageConsistency.statusTone ===
                          "emerald"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : supportingPagesInsights.messageConsistency
                                .statusTone === "amber"
                            ? "bg-amber-50 text-amber-900 border-amber-200"
                            : supportingPagesInsights.messageConsistency
                                .statusTone === "blue"
                            ? "bg-blue-50 text-blue-800 border-blue-200"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {supportingPagesInsights.messageConsistency.statusLabel}
                      </span>
                    </div>

                    <p className="text-xs sm:text-[13px] text-slate-700 leading-relaxed break-words">
                      {supportingPagesInsights.messageConsistency.assessment}
                    </p>

                    {supportingPagesInsights.messageConsistency.evidence.length >
                      0 && (
                      <div className="space-y-2.5 pt-1">
                        {supportingPagesInsights.messageConsistency.evidence.map(
                          (ev, idx) => (
                            <div
                              key={idx}
                              className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-2xs space-y-1.5"
                            >
                              <p className="text-xs text-[#101828] font-medium italic leading-relaxed break-words">
                                &ldquo;{ev.excerpt}&rdquo;
                              </p>
                              {ev.interpretation && (
                                <p className="text-[11px] text-slate-600 leading-relaxed break-words">
                                  {ev.interpretation}
                                </p>
                              )}
                              <div className="pt-1 flex items-center justify-between gap-2 text-[11px]">
                                <span className="text-slate-400 font-medium">
                                  Source ({ev.sourceCategoryLabel}):
                                </span>
                                <a
                                  href={ev.safeSourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label={`View source page ${ev.displaySourceUrl} in a new tab`}
                                  className="inline-flex items-center gap-1 font-medium text-[#246bfd] hover:underline break-all"
                                >
                                  <span className="break-all">
                                    {ev.displaySourceUrl}
                                  </span>
                                  <ExternalLink
                                    className="w-2.5 h-2.5 shrink-0"
                                    aria-hidden="true"
                                  />
                                </a>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* C. ADDITIONAL TRUST CONTEXT */}
              {supportingPagesInsights.trustContext && (
                <div className="bg-[#f8fafc] border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4 min-w-0">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200/70">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#101828]">
                        ADDITIONAL TRUST CONTEXT
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        Website-published claims
                      </span>
                    </div>

                    <p className="text-xs sm:text-[13px] text-slate-700 leading-relaxed break-words">
                      {supportingPagesInsights.trustContext.assessment}
                    </p>

                    {supportingPagesInsights.trustContext.evidence.length > 0 && (
                      <div className="space-y-2.5 pt-1">
                        {supportingPagesInsights.trustContext.evidence.map(
                          (ev, idx) => (
                            <div
                              key={idx}
                              className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-2xs space-y-1.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                    ev.isPublishedClaim
                                      ? "bg-amber-50 text-amber-900 border-amber-200/80"
                                      : "bg-slate-50 text-slate-700 border-slate-200/80"
                                  }`}
                                >
                                  {ev.claimBadgeLabel ||
                                    "Website-published claim"}
                                </span>
                              </div>
                              <p className="text-xs text-[#101828] font-medium italic leading-relaxed break-words">
                                &ldquo;{ev.excerpt}&rdquo;
                              </p>
                              {ev.interpretation && (
                                <p className="text-[11px] text-slate-600 leading-relaxed break-words">
                                  {ev.interpretation}
                                </p>
                              )}
                              <div className="pt-1 flex items-center justify-between gap-2 text-[11px]">
                                <span className="text-slate-400 font-medium">
                                  Source ({ev.sourceCategoryLabel}):
                                </span>
                                <a
                                  href={ev.safeSourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label={`View source page ${ev.displaySourceUrl} in a new tab`}
                                  className="inline-flex items-center gap-1 font-medium text-[#246bfd] hover:underline break-all"
                                >
                                  <span className="break-all">
                                    {ev.displaySourceUrl}
                                  </span>
                                  <ExternalLink
                                    className="w-2.5 h-2.5 shrink-0"
                                    aria-hidden="true"
                                  />
                                </a>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-200/70 leading-relaxed">
                    Testimonials, metrics, and credentials on supporting pages are website-published claims and are not independently verified by StrangerLens.
                  </p>
                </div>
              )}

              {/* D. NEXT-STEP CONTEXT */}
              {supportingPagesInsights.ctaDestination && (
                <div className="bg-[#f8fafc] border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4 min-w-0">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200/70">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#101828]">
                        NEXT-STEP CONTEXT
                      </h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          supportingPagesInsights.ctaDestination.inspectable
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {supportingPagesInsights.ctaDestination.inspectable
                          ? "Destination inspected"
                          : "Destination not followed"}
                      </span>
                    </div>

                    {supportingPagesInsights.ctaDestination.ctaText && (
                      <div className="flex items-center justify-between gap-2 bg-white border border-slate-200/80 rounded-lg px-3 py-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Primary CTA
                        </span>
                        <span className="text-xs font-bold text-[#101828] break-words">
                          &ldquo;
                          {supportingPagesInsights.ctaDestination.ctaText}
                          &rdquo;
                        </span>
                      </div>
                    )}

                    <p className="text-xs sm:text-[13px] text-slate-700 leading-relaxed break-words">
                      {supportingPagesInsights.ctaDestination.assessment}
                    </p>

                    {supportingPagesInsights.ctaDestination.inspectable && (
                      <div className="flex flex-wrap gap-1.5">
                        {typeof supportingPagesInsights.ctaDestination
                          .purposeClear === "boolean" && (
                          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-white border border-slate-200/80 text-slate-700">
                            Purpose:{" "}
                            {supportingPagesInsights.ctaDestination.purposeClear
                              ? "Clear"
                              : "Unclear"}
                          </span>
                        )}
                        {typeof supportingPagesInsights.ctaDestination
                          .alignsWithCtaWording === "boolean" && (
                          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-white border border-slate-200/80 text-slate-700">
                            CTA alignment:{" "}
                            {supportingPagesInsights.ctaDestination
                              .alignsWithCtaWording
                              ? "Aligned"
                              : "Unclear"}
                          </span>
                        )}
                        {typeof supportingPagesInsights.ctaDestination
                          .nextActionUnderstandable === "boolean" && (
                          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-white border border-slate-200/80 text-slate-700">
                            Next action:{" "}
                            {supportingPagesInsights.ctaDestination
                              .nextActionUnderstandable
                              ? "Understandable"
                              : "Unclear"}
                          </span>
                        )}
                      </div>
                    )}

                    {supportingPagesInsights.ctaDestination.evidence.length >
                      0 && (
                      <div className="space-y-2.5 pt-1">
                        {supportingPagesInsights.ctaDestination.evidence.map(
                          (ev, idx) => (
                            <div
                              key={idx}
                              className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-2xs space-y-1.5"
                            >
                              <p className="text-xs text-[#101828] font-medium italic leading-relaxed break-words">
                                &ldquo;{ev.excerpt}&rdquo;
                              </p>
                              <div className="pt-1 flex items-center justify-between gap-2 text-[11px]">
                                <span className="text-slate-400 font-medium">
                                  Destination ({ev.sourceCategoryLabel}):
                                </span>
                                <a
                                  href={ev.safeSourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label={`View CTA destination page ${ev.displaySourceUrl} in a new tab`}
                                  className="inline-flex items-center gap-1 font-medium text-[#246bfd] hover:underline break-all"
                                >
                                  <span className="break-all">
                                    {ev.displaySourceUrl}
                                  </span>
                                  <ExternalLink
                                    className="w-2.5 h-2.5 shrink-0"
                                    aria-hidden="true"
                                  />
                                </a>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* E. ANALYSIS LIMITATIONS (Rendered ONLY when meaningful limitations exist) */}
            {supportingPagesInsights.limitations.length > 0 && (
              <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-4 space-y-2">
                <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                  ANALYSIS LIMITATIONS
                </h3>
                <ul
                  className="space-y-1.5 text-xs text-slate-600 leading-relaxed"
                  aria-label="Supporting-page analysis limitations"
                >
                  {supportingPagesInsights.limitations.map((lim, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0 mt-1.5"
                        aria-hidden="true"
                      />
                      <span className="break-words">{lim}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* 13. FIVE DETAILED SIGNALS */}
        <section
          id="five-detailed-signals-section"
          aria-labelledby="five-detailed-signals-heading"
          className="bg-white border border-[#e3eaf5] rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-8 shadow-xs scroll-mt-24"
        >
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-5 mb-5 sm:mb-6 border-b border-slate-100">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-[10px] font-extrabold tracking-widest uppercase px-2.5 py-1 rounded-full bg-[#eaf2ff] text-[#246bfd] border border-blue-100">
                  FIVE DETAILED SIGNALS
                </span>
                <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full tabular-nums">
                  {overviewStats.clearSignalsCount} of 5 signals strong
                </span>
              </div>
              <h2
                id="five-detailed-signals-heading"
                className="text-lg sm:text-xl md:text-2xl font-extrabold text-[#101828] tracking-tight"
              >
                Detailed breakdown of your five signals
              </h2>
              <p className="text-xs sm:text-sm text-[#526078] mt-1 font-normal">
                Complete diagnostic evaluation for each first-impression dimension on {data.domain}, paired with visitor comprehension and homepage evidence.
              </p>
            </div>
          </div>

          {/* 5 Detailed Signal Cards in Canonical Order */}
          <div className="space-y-4" role="list" aria-label="Detailed five-signal diagnostic breakdown">
            {phase6DetailedData.detailedSignals.map((sig) => {
              const barColor =
                sig.badgeType === "clear"
                  ? "bg-emerald-500"
                  : sig.badgeType === "amber"
                  ? "bg-amber-500"
                  : "bg-rose-500";

              const iconTone =
                sig.badgeType === "clear"
                  ? "bg-emerald-50 text-emerald-600 border-emerald-200/70"
                  : sig.badgeType === "amber"
                  ? "bg-amber-50 text-amber-600 border-amber-200/70"
                  : "bg-rose-50 text-rose-600 border-rose-200/70";

              const cardBorderTone = sig.isWeakest
                ? "border-amber-200/90 bg-amber-50/15"
                : sig.isStrongest
                ? "border-emerald-200/80 bg-emerald-50/10"
                : "border-slate-200/80 bg-[#f8fafc]";

              return (
                <div
                  key={sig.id}
                  id={`detailed-signal-${sig.id}`}
                  role="listitem"
                  className={`rounded-2xl border ${cardBorderTone} p-4 sm:p-6 transition-colors scroll-mt-24`}
                >
                  {/* Top Row: Index + Icon + Signal Title + Score & Status */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 pb-4 border-b border-slate-200/70">
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-white border border-slate-200/90 text-xs font-black text-slate-600 inline-flex items-center justify-center shrink-0 tabular-nums shadow-2xs">
                        {sig.indexLabel}
                      </span>
                      <div
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${iconTone}`}
                      >
                        {sig.icon === "eye" && <Eye className="w-4 h-4" />}
                        {sig.icon === "users" && <Users className="w-4 h-4" />}
                        {sig.icon === "sparkles" && <Sparkles className="w-4 h-4" />}
                        {sig.icon === "shield" && <Shield className="w-4 h-4" />}
                        {sig.icon === "arrow" && <ArrowRight className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base sm:text-lg font-extrabold text-[#101828] tracking-tight leading-snug">
                            {sig.title}
                          </h3>
                          {sig.isStrongest && (
                            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Strongest Signal
                            </span>
                          )}
                          {sig.isWeakest && (
                            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                              Lowest-Scoring Signal
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#526078] mt-0.5">
                          {sig.detailedQuestion}
                        </p>
                      </div>
                    </div>

                    {/* Right: Score + Progress Bar + Status Badge */}
                    <div className="flex items-center justify-between md:justify-end gap-4 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200/60 shrink-0">
                      <div className="w-32 sm:w-36">
                        <div className="flex items-baseline justify-between gap-1 mb-1 tabular-nums">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Score
                          </span>
                          <div>
                            <span className="text-lg sm:text-xl font-extrabold text-[#101828]">
                              {sig.score}
                            </span>
                            <span className="text-xs text-slate-400 font-semibold">/100</span>
                          </div>
                        </div>
                        <div
                          className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden"
                          role="progressbar"
                          aria-valuenow={sig.score}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${sig.title} detailed score: ${sig.score} out of 100`}
                        >
                          <div
                            style={{ width: `${Math.max(4, Math.min(100, sig.score))}%` }}
                            className={`h-full rounded-full ${barColor}`}
                          />
                        </div>
                      </div>

                      {sig.badgeType === "clear" ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#dcfce7] text-[#15803d] border border-emerald-200/80 shrink-0">
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>{sig.badgeText}</span>
                        </span>
                      ) : sig.badgeType === "amber" ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#fef3c7] text-[#b45309] border border-amber-200/80 shrink-0">
                          <MinusCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>{sig.badgeText}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#fee2e2] text-[#b91c1c] border border-rose-200/80 shrink-0">
                          <X className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>{sig.badgeText}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom 2-Column Details: Full Diagnostic Explanation (Left) + Grounded Evidence & Visitor Question (Right) */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-4 items-stretch">
                    {/* Full Diagnostic Assessment */}
                    <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-xl p-4 flex flex-col justify-center">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1.5">
                        DIAGNOSTIC ASSESSMENT
                      </span>
                      <p className="text-xs sm:text-sm text-[#101828] leading-relaxed font-normal">
                        {sig.description}
                      </p>
                    </div>

                    {/* Grounded Signal Evidence & Visitor Comprehension Status */}
                    <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between gap-2.5">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1.5">
                          GROUNDED HOMEPAGE SIGNAL
                        </span>
                        {sig.verifiedClearFinding || sig.verifiedMissingFinding ? (
                          <div className="space-y-1.5">
                            {sig.verifiedClearFinding && (
                              <div className="flex items-start gap-2 text-xs text-slate-800 leading-relaxed">
                                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 stroke-[2.5]" />
                                <span className="break-words">{sig.verifiedClearFinding}</span>
                              </div>
                            )}
                            {sig.verifiedMissingFinding && (
                              <div className="flex items-start gap-2 text-xs text-slate-800 leading-relaxed">
                                <X className="w-4 h-4 text-rose-600 shrink-0 mt-0.5 stroke-[2.5]" />
                                <span className="break-words">{sig.verifiedMissingFinding}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-600 leading-relaxed">
                            Based on accessible homepage content and page structure on {data.domain}.
                          </p>
                        )}
                      </div>

                      {sig.comprehensionRow && (
                        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
                          <span className="text-slate-500">
                            Visitor question: <strong className="text-slate-700 font-semibold">&ldquo;{sig.comprehensionRow.question}&rdquo;</strong>
                          </span>
                          <span
                            className={`font-bold px-2 py-0.5 rounded-full ${
                              sig.comprehensionRow.type === "clear"
                                ? "bg-emerald-50 text-emerald-700"
                                : sig.comprehensionRow.type === "partly"
                                ? "bg-amber-50 text-amber-800"
                                : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {sig.comprehensionRow.label}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 14. COMMUNICATION RISKS */}
        <section
          id="communication-risks-section"
          aria-labelledby="communication-risks-heading"
          className="bg-white border border-[#e3eaf5] rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-8 shadow-xs scroll-mt-24"
        >
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-5 mb-5 sm:mb-6 border-b border-slate-100">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold tracking-widest uppercase px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200/80">
                  <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                  COMMUNICATION RISKS
                </span>
                <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full tabular-nums">
                  {phase6DetailedData.totalRisksCount === 0
                    ? "0 risks flagged"
                    : phase6DetailedData.totalRisksCount === 1
                    ? "1 risk identified"
                    : `${phase6DetailedData.totalRisksCount} risks identified`}
                </span>
              </div>
              <h2
                id="communication-risks-heading"
                className="text-lg sm:text-xl md:text-2xl font-extrabold text-[#101828] tracking-tight"
              >
                Communication risks that could cost you visitors
              </h2>
              <p className="text-xs sm:text-sm text-[#526078] mt-1 font-normal">
                Messaging, positioning, or trust gaps on {data.domain} that may cause first-time visitors to hesitate or leave.
              </p>
            </div>
          </div>

          {phase6DetailedData.primaryRisk ? (
            <div className="space-y-4">
              {/* Compact Reference to Primary Bottleneck #1 (Avoids duplicating the full Section 05 card) */}
              <div className="bg-[#f8fafc] border border-slate-200/90 rounded-2xl p-4 sm:px-5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 ${
                      phase6DetailedData.primaryRisk.severity === "high"
                        ? "bg-rose-600 text-white"
                        : phase6DetailedData.primaryRisk.severity === "medium"
                        ? "bg-amber-500 text-white"
                        : "bg-slate-600 text-white"
                    }`}
                  >
                    #1 · {phase6DetailedData.primaryRisk.severity} risk
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xs sm:text-sm font-extrabold text-[#101828] truncate">
                        {phase6DetailedData.primaryRisk.title}
                      </h3>
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-white px-2 py-0.5 rounded border border-slate-200/80">
                        {phase6DetailedData.primaryRisk.categoryLabel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Primary bottleneck analyzed with focused homepage evidence in Section 05.
                    </p>
                  </div>
                </div>
                <a
                  href="#biggest-issue-section"
                  className="text-xs font-bold text-[#1d68f5] hover:text-blue-700 inline-flex items-center gap-1 shrink-0 self-start sm:self-center focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none rounded print:hidden"
                >
                  <span>Review primary issue ↑</span>
                </a>
              </div>

              {/* Secondary / Additional Communication Risks Cards */}
              {phase6DetailedData.secondaryRisks.length > 0 ? (
                <div
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  role="list"
                  aria-label="Additional communication risks"
                >
                  {phase6DetailedData.secondaryRisks.map((risk, idx) => {
                    const severityBadge =
                      risk.severity === "high"
                        ? "bg-rose-600 text-white"
                        : risk.severity === "medium"
                        ? "bg-amber-500 text-white"
                        : "bg-slate-600 text-white";

                    const cardBorder =
                      risk.severity === "high"
                        ? "bg-rose-50/35 border-rose-200/90"
                        : risk.severity === "medium"
                        ? "bg-amber-50/35 border-amber-200/90"
                        : "bg-[#f8fafc] border-slate-200/90";

                    return (
                      <div
                        key={idx}
                        role="listitem"
                        className={`rounded-2xl border p-5 flex flex-col justify-between gap-4 ${cardBorder}`}
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${severityBadge}`}
                              >
                                {risk.severity} risk
                              </span>
                              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider bg-white px-2.5 py-0.5 rounded-full border border-slate-200/80">
                                {risk.categoryLabel}
                              </span>
                            </div>
                            <span className="text-[11px] font-bold text-slate-400 tabular-nums">
                              Risk #{risk.riskNumber}
                            </span>
                          </div>

                          <h3 className="text-sm sm:text-base font-extrabold text-[#101828] leading-snug">
                            {risk.title}
                          </h3>

                          <p className="text-xs sm:text-[13px] text-slate-700 leading-relaxed font-normal">
                            {risk.description}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-slate-200/70">
                          <div className="bg-white/90 border border-slate-200/70 rounded-xl p-3">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-0.5">
                              WHY THIS MATTERS TO VISITORS
                            </span>
                            <p className="text-xs text-slate-800 font-medium leading-relaxed">
                              {risk.why_it_matters}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-[#f8fafc] border border-slate-200/80 rounded-2xl p-5 text-center">
                  <p className="text-xs sm:text-sm font-semibold text-[#101828] mb-1">
                    No additional secondary communication risks flagged
                  </p>
                  <p className="text-xs text-[#526078] max-w-xl mx-auto leading-relaxed">
                    Beyond the primary bottleneck identified in Section 05, no other major messaging or credibility risks were detected on {data.domain}.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-emerald-50/40 border border-emerald-200/80 rounded-2xl p-5 sm:p-6 text-center">
              <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2.5">
                <Check className="w-4 h-4 stroke-[2.5]" />
              </div>
              <p className="text-xs sm:text-sm font-bold text-[#101828] mb-1">
                No major communication risks identified on {data.domain}
              </p>
              <p className="text-xs text-[#526078] max-w-xl mx-auto leading-relaxed">
                Your accessible homepage content did not trigger any high or medium severity comprehension risk flags during this check.
              </p>
            </div>
          )}
        </section>

        {/* 15. RECHECK & COMPARE */}
        <section
          id="recheck-compare-section"
          aria-labelledby="recheck-compare-heading"
          className="bg-white border border-[#e3eaf5] rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-8 shadow-xs scroll-mt-24 print:hidden"
        >
          {/* Section Header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 mb-6 border-b border-slate-100">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold tracking-widest uppercase px-2.5 py-1 rounded-full bg-[#eaf2ff] text-[#246bfd] border border-blue-100">
                  <RefreshCw className="w-3 h-3 text-[#246bfd] shrink-0" />
                  RECHECK &amp; COMPARE
                </span>
                <span className="text-[11px] font-medium text-slate-500">
                  · {data.domain}
                </span>
              </div>
              <h2
                id="recheck-compare-heading"
                className="text-lg sm:text-xl md:text-2xl font-extrabold text-[#101828] tracking-tight"
              >
                SEE WHETHER IT IMPROVED
              </h2>
              <p className="text-xs sm:text-sm text-[#526078] mt-1 font-normal">
                Made changes to your website? Run another analysis and compare the results.
              </p>
            </div>

            {/* Primary & Secondary Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleCheckAgain}
                disabled={checkAgainState === "checking"}
                aria-label={`Check ${data.domain} again`}
                className="w-full sm:w-auto rounded-full bg-[#1d68f5] hover:bg-blue-600 active:scale-[0.98] text-white text-xs sm:text-sm font-bold px-6 py-2.5 transition-all inline-flex items-center justify-center gap-2 shadow-xs cursor-pointer min-h-[44px] disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 shrink-0 ${
                    checkAgainState === "checking" ? "animate-spin" : ""
                  }`}
                />
                <span>
                  {checkAgainState === "checking"
                    ? "CHECKING…"
                    : "CHECK MY WEBSITE AGAIN"}
                </span>
              </button>

              {comparisonEvaluation.isEligible && comparisonEvaluation.overall && (
                <button
                  type="button"
                  onClick={() => setActiveCompareModal(true)}
                  className="w-full sm:w-auto rounded-full bg-white hover:bg-slate-50 text-slate-800 border border-[#e3eaf5] hover:border-slate-300 text-xs sm:text-sm font-bold px-5 py-2.5 transition cursor-pointer inline-flex items-center justify-center gap-1.5 min-h-[44px] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
                >
                  <BarChart2 className="w-3.5 h-3.5 text-[#246bfd] shrink-0" />
                  <span>VIEW COMPARISON</span>
                </button>
              )}
            </div>
          </div>

          {/* Comparison Content vs. First-Time User Empty State */}
          {comparisonEvaluation.isEligible && comparisonEvaluation.overall ? (
            <div className="space-y-5">
              {/* Top Comparison Banner: BEFORE -> AFTER + Overall Score */}
              <div className="bg-[#f8fbff] border border-blue-200/80 rounded-2xl p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-blue-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-black tracking-wider uppercase px-2.5 py-1 rounded-lg bg-[#1d68f5] text-white">
                      BEFORE → AFTER
                    </span>
                    <span className="text-xs font-semibold text-slate-600">
                      Same normalized domain:{" "}
                      <strong className="text-slate-900 font-bold">
                        {comparisonEvaluation.domain}
                      </strong>
                    </span>
                    {comparisonEvaluation.previousDate && (
                      <span className="text-xs text-slate-500">
                        · Previous scan:{" "}
                        {new Date(comparisonEvaluation.previousDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                      comparisonEvaluation.overall.status === "Scored higher"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : comparisonEvaluation.overall.status === "Scored lower"
                        ? "bg-rose-50 text-rose-800 border-rose-200"
                        : "bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    {comparisonEvaluation.overall.status === "Scored higher" && (
                      <Check className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
                    )}
                    {comparisonEvaluation.overall.status === "Scored lower" && (
                      <ArrowDown className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
                    )}
                    {comparisonEvaluation.overall.status === "Score unchanged" && (
                      <MinusCircle className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
                    )}
                    <span>{comparisonEvaluation.overall.status}</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
                  {/* Overall Score Before -> After */}
                  <div className="lg:col-span-5 bg-white border border-blue-100 rounded-xl p-4 sm:p-5 flex flex-col justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2">
                      OVERALL SCORE
                    </span>
                    <div
                      className="flex flex-wrap items-baseline justify-between gap-3 tabular-nums"
                      aria-label={`Overall score changed from ${comparisonEvaluation.overall.beforeScore} to ${comparisonEvaluation.overall.afterScore}`}
                    >
                      <div className="flex items-baseline gap-2.5">
                        <span className="text-2xl sm:text-3xl font-bold text-slate-400">
                          {comparisonEvaluation.overall.beforeScore}
                        </span>
                        <span className="text-lg font-bold text-slate-400" aria-hidden="true">
                          →
                        </span>
                        <span className="text-3xl sm:text-4xl font-extrabold text-[#101828]">
                          {comparisonEvaluation.overall.afterScore}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">/ 100</span>
                      </div>

                      <span
                        className={`text-xs sm:text-sm font-extrabold px-2.5 py-1 rounded-lg ${
                          comparisonEvaluation.overall.delta > 0
                            ? "bg-emerald-100/90 text-emerald-800"
                            : comparisonEvaluation.overall.delta < 0
                            ? "bg-rose-100/90 text-rose-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {comparisonEvaluation.overall.deltaText}
                      </span>
                    </div>
                  </div>

                  {/* Honest Interpretation & Non-Causal Assessment Note */}
                  <div className="lg:col-span-7 space-y-2">
                    <p className="text-sm sm:text-base font-bold text-[#101828] leading-snug">
                      {comparisonEvaluation.interpretationSummary}
                    </p>
                    <p className="text-xs text-[#526078] leading-relaxed">
                      {comparisonEvaluation.methodologyNote}
                    </p>
                  </div>
                </div>
              </div>

              {/* FIVE SIGNALS Comparison Breakdown */}
              <div className="bg-[#f8fafc] border border-slate-200/80 rounded-2xl p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                    FIVE SIGNALS
                  </span>
                  {!comparisonEvaluation.hasHistoricalSignalScores && (
                    <span className="text-[11px] font-medium text-slate-500">
                      Previous scan stored overall score only · No fabricated signal history
                    </span>
                  )}
                </div>

                <div
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
                  role="list"
                  aria-label="Five signals before and after comparison"
                >
                  {comparisonEvaluation.signals.map((sig) => {
                    const hasBoth =
                      sig.beforeScore !== null && sig.afterScore !== null;

                    return (
                      <div
                        key={sig.id}
                        role="listitem"
                        className="bg-white border border-slate-200/90 rounded-xl p-3.5 flex flex-col justify-between gap-2.5 tabular-nums"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1.5 mb-1.5">
                            <span className="text-xs font-extrabold text-[#101828]">
                              {sig.label}
                            </span>
                            {hasBoth && sig.deltaText && (
                              <span
                                className={`text-[11px] font-extrabold px-1.5 py-0.5 rounded ${
                                  (sig.delta ?? 0) > 0
                                    ? "bg-emerald-50 text-emerald-700"
                                    : (sig.delta ?? 0) < 0
                                    ? "bg-rose-50 text-rose-700"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {sig.deltaText}
                              </span>
                            )}
                          </div>

                          {hasBoth ? (
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-base font-bold text-slate-400">
                                {sig.beforeScore}
                              </span>
                              <span className="text-xs font-bold text-slate-400">
                                →
                              </span>
                              <span className="text-lg font-extrabold text-[#101828]">
                                {sig.afterScore}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-baseline gap-1">
                              <span className="text-xs text-slate-500 font-medium">
                                Current:
                              </span>
                              <span className="text-base font-extrabold text-[#101828]">
                                {sig.afterScore !== null ? `${sig.afterScore}/100` : "—"}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider ${
                              sig.status === "Scored higher"
                                ? "text-emerald-700"
                                : sig.status === "Scored lower"
                                ? "text-rose-700"
                                : "text-slate-500"
                            }`}
                          >
                            {sig.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Option to Confirm or Change Website URL */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs text-slate-500">
                <span>
                  Want to test a different page or confirm the URL before scanning?
                </span>
                <button
                  type="button"
                  onClick={onBackToLanding}
                  className="text-xs font-bold text-[#1d68f5] hover:text-blue-700 inline-flex items-center gap-1 self-start sm:self-auto cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none rounded"
                >
                  <span>Confirm or change URL</span>
                  <ArrowRight className="w-3 h-3 shrink-0" />
                </button>
              </div>
            </div>
          ) : (
            /* First-Time User Empty State (Or Honest Unavailable Comparison State) */
            <div className="bg-[#f8fbff] border border-blue-200/80 rounded-2xl p-5 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-1.5 max-w-xl">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1d68f5] block">
                  {hadCorruptedHistory ||
                  comparisonEvaluation.unavailableReason === "ambiguous_order" ||
                  comparisonEvaluation.unavailableReason === "invalid_score"
                    ? "COMPARISON UNAVAILABLE · BASELINE READY"
                    : "BASELINE REPORT RECORDED"}
                </span>
                <h3 className="text-base sm:text-lg font-extrabold text-[#101828] tracking-tight">
                  READY TO SEE WHAT CHANGED?
                </h3>
                <p className="text-xs sm:text-sm text-[#526078] leading-relaxed font-normal">
                  Make improvements to your website, then run another analysis.
                </p>
                {(hadCorruptedHistory ||
                  comparisonEvaluation.unavailableReason === "ambiguous_order" ||
                  comparisonEvaluation.unavailableReason === "invalid_score") && (
                  <p className="text-xs text-amber-800 pt-1">
                    Note: An earlier stored entry in this browser had incomplete or ambiguous metadata and was omitted so only verified comparisons are shown.
                  </p>
                )}
                <p className="text-[11px] text-slate-400 pt-1">
                  {METHODOLOGY_VARIABILITY_NOTE}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleCheckAgain}
                  disabled={checkAgainState === "checking"}
                  className="w-full sm:w-auto rounded-full bg-[#1d68f5] hover:bg-blue-600 active:scale-[0.98] text-white text-xs sm:text-sm font-bold px-6 py-3 transition-all inline-flex items-center justify-center gap-2 shadow-xs cursor-pointer min-h-[44px] disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 shrink-0 ${
                      checkAgainState === "checking" ? "animate-spin" : ""
                    }`}
                  />
                  <span>
                    {checkAgainState === "checking"
                      ? "CHECKING…"
                      : "CHECK MY WEBSITE AGAIN"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={onBackToLanding}
                  className="text-xs font-semibold text-slate-600 hover:text-[#1d68f5] transition-colors inline-flex items-center justify-center gap-1 py-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none rounded"
                >
                  <span>Confirm or change URL</span>
                  <ArrowRight className="w-3 h-3 shrink-0" />
                </button>
              </div>
            </div>
          )}
        </section>

        {/* RESULTS SCREEN LEGAL & SUPPORT FOOTER */}
        <footer className="pt-4 pb-6 border-t border-slate-200/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 print:hidden">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span className="font-bold text-slate-800">{LEGAL_CONFIG.productName}</span>
            <span>·</span>
            <span>© {new Date().getFullYear()} {LEGAL_CONFIG.operatorLegalName}</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
            {LEGAL_CONFIG.links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-slate-900 transition-colors underline-offset-4 hover:underline"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </footer>
      </main>

      {/* FOCUSED COMPARE HISTORY MODAL */}
      <AnimatePresence>
        {activeCompareModal && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="compare-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveCompareModal(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            />
            <motion.div
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.98, y: 12 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 12 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative z-10 text-slate-900 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-blue-600" />
                  <h3 id="compare-modal-title" className="font-bold text-base">
                    BEFORE → AFTER COMPARISON
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveCompareModal(false)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer min-h-[32px] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
                  aria-label="Close comparison view"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {comparisonEvaluation.isEligible && comparisonEvaluation.overall ? (
                <div className="py-5 space-y-4 text-xs sm:text-sm text-slate-600">
                  <p>
                    Assessment comparison for{" "}
                    <strong className="text-slate-950">
                      {comparisonEvaluation.domain}
                    </strong>
                    :
                  </p>

                  {/* Overall Score Before -> After */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2.5 tabular-nums">
                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-500">
                      <span>OVERALL SCORE</span>
                      <span>{comparisonEvaluation.overall.status}</span>
                    </div>
                    <div className="flex justify-between items-baseline pt-1">
                      <span className="text-lg sm:text-xl font-extrabold text-slate-900">
                        {comparisonEvaluation.overall.beforeScore} →{" "}
                        {comparisonEvaluation.overall.afterScore}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded font-bold text-xs ${
                          comparisonEvaluation.overall.delta > 0
                            ? "bg-emerald-100 text-emerald-800"
                            : comparisonEvaluation.overall.delta < 0
                            ? "bg-rose-100 text-rose-800"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {comparisonEvaluation.overall.deltaText}
                      </span>
                    </div>
                  </div>

                  {/* Five Signals Breakdown */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2.5 tabular-nums">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                      FIVE SIGNALS
                    </span>
                    <div className="divide-y divide-slate-200/70">
                      {comparisonEvaluation.signals.map((sig) => {
                        const hasBoth =
                          sig.beforeScore !== null && sig.afterScore !== null;
                        return (
                          <div
                            key={sig.id}
                            className="py-2 flex items-center justify-between gap-2 text-xs"
                          >
                            <span className="font-semibold text-slate-800">
                              {sig.label}
                            </span>
                            {hasBoth ? (
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900">
                                  {sig.beforeScore} → {sig.afterScore}
                                </span>
                                <span
                                  className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
                                    (sig.delta ?? 0) > 0
                                      ? "bg-emerald-100 text-emerald-800"
                                      : (sig.delta ?? 0) < 0
                                      ? "bg-rose-100 text-rose-800"
                                      : "bg-slate-200 text-slate-700"
                                  }`}
                                >
                                  {sig.deltaText} ({sig.status})
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-500">
                                Current: {sig.afterScore ?? "—"}/100 (Not recorded in previous check.)
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs sm:text-sm font-semibold text-slate-900">
                      {comparisonEvaluation.interpretationSummary}
                    </p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {comparisonEvaluation.methodologyNote}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-5 space-y-3 text-xs sm:text-sm text-slate-600">
                  <p className="font-semibold text-slate-900">
                    READY TO SEE WHAT CHANGED?
                  </p>
                  <p>
                    Make improvements to your website, then run another analysis.
                  </p>
                  <p className="text-xs text-slate-500">
                    {METHODOLOGY_VARIABILITY_NOTE}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => setActiveCompareModal(false)}
                className="w-full rounded-full bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs sm:text-sm py-2.5 transition cursor-pointer min-h-[44px] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
              >
                Close comparison
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


